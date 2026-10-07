import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireCapability } from '../auth/index.js';
import { getDb } from '../db/helpers.js';
import { appendAudit } from '../db/audit.js';
import { LocalRunner, type RunConfig } from '../../../tools/run-local.js';
import type { BatchState, RunParameters } from '@shared/types.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer({ dest: 'data/uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Upload batch
router.post('/', requireCapability('batch.submit'), upload.single('file'), async (req, res) => {
  try {
    const user = (req as any).user;
    const file = req.file;
    
    if (!file) {
      res.status(400).json({ code: 'NO_FILE', message: 'No file uploaded' });
      return;
    }
    
    const params: RunParameters = {
      fileLimitDays: parseInt(req.body.fileLimitDays) || 90,
      highValueThreshold: parseInt(req.body.highValueThreshold) || 50000000,
      frequencyWindow: parseInt(req.body.frequencyWindow) || 30,
      updateMode: req.body.updateMode === 'true',
      runDate: req.body.runDate || new Date().toISOString().substring(0, 10).replace(/-/g, ''),
    };
    
    // Validate file
    const content = fs.readFileSync(file.path, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length > 50000) {
      fs.unlinkSync(file.path);
      res.status(400).json({ code: 'FILE_TOO_LARGE', message: 'Exceeds 50,000 records' });
      return;
    }
    
    // Check trailer
    const trailer = lines[lines.length - 1];
    if (!trailer || trailer[0] !== 'T') {
      fs.unlinkSync(file.path);
      res.status(400).json({ code: 'NO_TRAILER', message: 'Missing trailer record' });
      return;
    }
    
    const detailLines = lines.filter(l => l[0] === 'D');
    const recordCount = detailLines.length;
    
    // Generate run ID
    const runId = `CV${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${String(Date.now()).substring(-2)}`;
    
    // Move file to batches
    const batchesDir = path.join('data', 'batches');
    if (!fs.existsSync(batchesDir)) {
      fs.mkdirSync(batchesDir, { recursive: true });
    }
    const batchPath = path.join(batchesDir, `${runId}.dat`);
    fs.renameSync(file.path, batchPath);
    
    // Insert batch
    const db = await getDb();
    const stmt = db.prepare(`
      INSERT INTO batches (run_id, filename, uploaded_by, record_count, params_json, 
                          state, backend, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      runId,
      file.originalname,
      user.username,
      recordCount,
      JSON.stringify(params),
      'VALIDATED',
      'local',
      new Date().toISOString()
    );
    
    const batch = db.prepare('SELECT * FROM batches WHERE run_id = ?').get(runId);
    appendAudit(db, {
      actor: user.username,
      role: user.role,
      action: 'BATCH_CREATED',
      entity: 'batch',
      entityId: String(batch?.id || runId),
      detail: { runId, filename: file.originalname, recordCount },
    });
    
    res.status(201).json(batch);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ code: 'UPLOAD_FAILED', message: error.message });
  }
});

// Add the generated 10,000-person / 10,000-claim demonstration file to the workflow.
router.post('/demo', requireCapability('batch.submit'), async (req, res) => {
  try {
    const user = (req as any).user;
    const sourcePath = path.join('data', 'batches', 'TEST10K.dat');
    if (!fs.existsSync(sourcePath)) {
      res.status(404).json({ code: 'DEMO_FILE_MISSING', message: 'Run npm run gen-data before adding the demo batch' });
      return;
    }

    const content = fs.readFileSync(sourcePath, 'utf-8');
    const recordCount = content.split(/\r?\n/).filter(line => line[0] === 'D').length;
    const runDate = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const runId = `CV${runDate}-D${String(Date.now()).slice(-4)}`;
    const batchPath = path.join('data', 'batches', `${runId}.dat`);

    const params: RunParameters = {
      fileLimitDays: 90,
      highValueThreshold: 50000000,
      frequencyWindow: 30,
      updateMode: true,
      runDate,
    };
    const db = await getDb();
    const existing = db.prepare(`
      SELECT * FROM batches
      WHERE filename = ? AND record_count = ? AND state = 'VALIDATED'
      ORDER BY id DESC LIMIT 1
    `).get('TEST10K.dat', recordCount);
    if (existing) {
      res.json(existing);
      return;
    }
    fs.copyFileSync(sourcePath, batchPath);
    db.prepare(`
      INSERT INTO batches (run_id, filename, uploaded_by, record_count, params_json, state, backend, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, 'TEST10K.dat', user.username, recordCount, JSON.stringify(params), 'VALIDATED', 'local', new Date().toISOString());

    appendAudit(db, {
      actor: user.username,
      role: user.role,
      action: 'DEMO_BATCH_ADDED',
      entity: 'batch',
      entityId: runId,
      detail: { runId, recordCount, members: 10000, source: 'TEST10K.dat' },
    });
    res.status(201).json(db.prepare('SELECT * FROM batches WHERE run_id = ?').get(runId));
  } catch (error: any) {
    res.status(500).json({ code: 'DEMO_BATCH_FAILED', message: error.message });
  }
});

// Submit batch
router.post('/:id/submit', requireCapability('batch.submit'), async (req, res) => {
  try {
    const db = await getDb();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    
    if (!batch) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Batch not found' });
      return;
    }
    
    if (batch.state !== 'VALIDATED') {
      res.status(400).json({ code: 'INVALID_STATE', message: `Cannot submit batch in state ${batch.state}` });
      return;
    }
    
    // Update to SUBMITTED
    db.prepare('UPDATE batches SET state = ?, job_id = ? WHERE id = ?')
      .run('SUBMITTED', batch.run_id, batch.id);
    const user = (req as any).user;
    appendAudit(db, {
      actor: user.username,
      role: user.role,
      action: 'BATCH_SUBMITTED',
      entity: 'batch',
      entityId: String(batch.id),
      detail: { runId: batch.run_id },
    });
    
    // Run asynchronously
    setImmediate(async () => {
      try {
        const dbInner = await getDb();
        const params = JSON.parse(batch.params_json);
        const config: RunConfig = {
          runId: batch.run_id,
          runDate: params.runDate,
          fileLimitDays: params.fileLimitDays,
          highValueThreshold: params.highValueThreshold,
          frequencyWindow: params.frequencyWindow,
          updateMode: params.updateMode,
          inputFile: `${batch.run_id}.dat`,
        };
        
        dbInner.prepare('UPDATE batches SET state = ? WHERE id = ?').run('RUNNING', batch.id);
        
        const runner = new LocalRunner(config);
        const rc = runner.run();
        
        dbInner.prepare('UPDATE batches SET state = ?, rc = ?, ended_at = ? WHERE id = ?')
          .run('ENDED', rc, new Date().toISOString(), batch.id);
        
        // Import results
        await importBatchResults(batch.id, batch.run_id);
        
        dbInner.prepare('UPDATE batches SET state = ? WHERE id = ?').run('COMPLETE', batch.id);
      } catch (error) {
        console.error('Job execution error:', error);
        const dbError = await getDb();
        dbError.prepare('UPDATE batches SET state = ? WHERE id = ?').run('FAILED', batch.id);
      }
    });
    
    const updated = db.prepare('SELECT * FROM batches WHERE id = ?').get(batch.id);
    res.json(updated);
  } catch (error: any) {
    console.error('Submit error:', error);
    res.status(500).json({ code: 'SUBMIT_FAILED', message: error.message });
  }
});

// List batches
router.get('/', requireCapability('batch.read'), async (req, res) => {
  try {
    const db = await getDb();
    const batches = db.prepare('SELECT * FROM batches ORDER BY created_at DESC').all();
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

// Get batch
router.get('/:id', requireCapability('batch.read'), async (req, res) => {
  try {
    const db = await getDb();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    
    if (!batch) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Batch not found' });
      return;
    }
    
    res.json(batch);
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

async function importBatchResults(batchId: number, runId: string): Promise<void> {
  const db = await getDb();
  const runDir = path.join('data', 'runs', runId);
  
  // Read EXCEPT file
  const exceptPath = path.join(runDir, 'EXCEPT.SORTED.dat');
  if (!fs.existsSync(exceptPath)) return;
  
  const exceptLines = fs.readFileSync(exceptPath, 'utf-8').split('\n').filter(l => l.length > 0);
  
  // Read HITS file
  const hitsPath = path.join(runDir, 'HITS.dat');
  const hitLines = fs.existsSync(hitsPath) 
    ? fs.readFileSync(hitsPath, 'utf-8').split('\n').filter(l => l.length > 0)
    : [];
  
  const insertClaim = db.prepare(`
    INSERT INTO claims (batch_id, claim_id, member_id, policy_no, provider_id, dos_from, 
                       billed_minor, score, disposition, hit_count, top_rule, queue, status,
                       entered_at, due_at, raw)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertHit = db.prepare(`
    INSERT INTO claim_hits (claim_pk, seq, rule_id, class, weight, carc, evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    for (const line of exceptLines) {
      const claimId = line.substring(0, 12).trim();
      const memberId = line.substring(12, 24).trim();
      const policyNo = line.substring(24, 34).trim();
      const providerId = line.substring(34, 44).trim();
      const dosFrom = line.substring(44, 52);
      const billedAmt = parseInt(line.substring(52, 61), 10);
      const score = parseInt(line.substring(61, 64), 10);
      const disp = line.substring(64, 65);
      const sev = parseInt(line.substring(65, 66), 10);
      const hitCount = parseInt(line.substring(66, 68), 10);
      const topRule = line.substring(68, 72).trim();
      
      let queue = 'NONE';
      let status = 'PASSED';
      if (disp === 'M') { queue = 'MANUAL'; status = 'NEW'; }
      else if (disp === 'C') { queue = 'CRITICAL'; status = 'NEW'; }
      else if (disp === 'X') { queue = 'NONE'; status = 'CLOSED_REJECTED'; }
      
      const dueAt = queue !== 'NONE' 
        ? new Date(Date.now() + (queue === 'CRITICAL' ? 1 : 3) * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      insertClaim.run(
        batchId, claimId, memberId, policyNo, providerId, dosFrom,
        billedAmt, score, disp, hitCount, topRule || null, queue, status,
        new Date().toISOString(), dueAt, line
      );
      const savedClaim = db.prepare(`
        SELECT id FROM claims WHERE batch_id = ? AND claim_id = ? ORDER BY id DESC LIMIT 1
      `).get(batchId, claimId) as { id: number } | null;
      if (!savedClaim) throw new Error(`Could not retrieve imported claim ${claimId}`);
      const claimPk = savedClaim.id;
      
      // Insert hits for this claim
      const claimHits = hitLines.filter(h => h.substring(0, 12).trim() === claimId);
      claimHits.forEach((hit, idx) => {
        const ruleId = hit.substring(12, 16).trim();
        const ruleClass = hit.substring(16, 17);
        const weight = parseInt(hit.substring(17, 20), 10);
        const carc = hit.substring(20, 23).trim();
        const evidence = hit.substring(23, 83).trim();
        
        insertHit.run(claimPk, idx + 1, ruleId, ruleClass, weight, carc, evidence);
      });
    }
  });
  
  transaction();
}

export default router;
