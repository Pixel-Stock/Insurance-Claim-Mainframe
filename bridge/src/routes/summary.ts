import { Router } from 'express';
import { authenticate, requireCapability } from '../auth/index.js';
import { getDb } from '../db/helpers.js';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(authenticate);

router.get('/:batchId', requireCapability('report.read'), async (req, res) => {
  try {
    const db = await getDb();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.batchId);
    
    if (!batch) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Batch not found' });
      return;
    }
    
    // Read control totals
    const runDir = path.join('data', 'runs', batch.run_id);
    const ctlPath = path.join(runDir, 'CTLTOT.dat');
    
    if (!fs.existsSync(ctlPath)) {
      res.status(404).json({ code: 'NO_RESULTS', message: 'Batch results not available' });
      return;
    }
    
    const ctlLines = fs.readFileSync(ctlPath, 'utf-8').split('\n');
    
    let readCount = 0, readAmount = 0;
    let trailerCount = 0, trailerAmount = 0;
    const dispositions: any[] = [];
    const topRules: any[] = [];
    
    for (const line of ctlLines) {
      if (line.length < 2) continue;
      
      const type = line.substring(0, 2);
      const key = line.substring(2, 6).trim();
      const count = parseInt(line.substring(6, 15), 10);
      const amount = parseInt(line.substring(15, 28), 10);
      
      if (type === 'RD') {
        readCount = count;
        readAmount = amount;
      } else if (type === 'TR') {
        trailerCount = count;
        trailerAmount = amount;
      } else if (type === 'DS') {
        dispositions.push({
          disposition: key,
          count,
          amount,
          percentage: readCount > 0 ? (count / readCount) * 100 : 0,
        });
      } else if (type === 'RL') {
        topRules.push({ ruleId: key, count, amount });
      }
    }
    
    const summary = {
      runId: batch.run_id,
      jobId: batch.job_id,
      runDate: JSON.parse(batch.params_json).runDate,
      parameters: JSON.parse(batch.params_json),
      backend: batch.backend,
      rc: batch.rc || 0,
      reconciliation: {
        inBalance: readCount === trailerCount && readAmount === trailerAmount,
        readCount,
        readAmount,
        trailerCount,
        trailerAmount,
        countDiff: readCount - trailerCount,
        amountDiff: readAmount - trailerAmount,
      },
      dispositions,
      topRules: topRules.sort((a, b) => b.count - a.count).slice(0, 10),
      ageing: [],
    };
    
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

export default router;
