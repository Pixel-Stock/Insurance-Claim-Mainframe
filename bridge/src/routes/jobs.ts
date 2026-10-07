import { Router } from 'express';
import { authenticate, requireCapability } from '../auth/index.js';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(authenticate);

router.get('/:id/status', requireCapability('report.read'), (req, res) => {
  try {
    const runId = req.params.id;
    const runDir = path.join('data', 'runs', runId);
    const logPath = path.join(runDir, 'job.log');
    
    if (!fs.existsSync(logPath)) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Job not found' });
      return;
    }
    
    const log = fs.readFileSync(logPath, 'utf-8');
    const lines = log.split('\n');
    
    const steps = [];
    let maxcc = 0;
    let state: 'INPUT' | 'ACTIVE' | 'OUTPUT' = 'OUTPUT';
    
    for (const line of lines) {
      if (line.includes('COMPLETE') || line.includes('ERROR')) {
        const match = line.match(/(\w+)\s+(COMPLETE|ERROR)\s+RC (\d+)/);
        if (match) {
          const rc = parseInt(match[3], 10);
          maxcc = Math.max(maxcc, rc);
          steps.push({
            name: match[1],
            status: match[2] === 'COMPLETE' ? 'COMPLETE' : 'ERROR',
            rc,
          });
        }
      }
    }
    
    res.json({ jobId: runId, state, rc: maxcc, maxcc, steps });
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

router.get('/:id/log', requireCapability('report.read'), (req, res) => {
  try {
    const runId = req.params.id;
    const runDir = path.join('data', 'runs', runId);
    
    const files = [
      { ddname: 'JOBLOG', file: 'job.log' },
      { ddname: 'SYSOUT', file: 'SUMRPT.txt' },
    ];
    
    const spool = files
      .filter(f => fs.existsSync(path.join(runDir, f.file)))
      .map((f, idx) => ({
        id: idx + 1,
        ddname: f.ddname,
        stepname: 'CLMVAL01',
        content: fs.readFileSync(path.join(runDir, f.file), 'utf-8'),
      }));
    
    res.json(spool);
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

export default router;
