import { Router } from 'express';
import { authenticate, requireCapability } from '../auth/index.js';
import { can, type Capability } from '@shared/types.js';
import { getDb } from '../db/helpers.js';
import { appendAudit } from '../db/audit.js';

const router = Router();
router.use(authenticate);

router.get('/', requireCapability('claim.read'), async (req, res) => {
  try {
    const db = await getDb();
    const { batchId, disposition, queue, status, limit = 200, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM claims WHERE 1=1';
    const params: any[] = [];
    
    if (batchId) {
      query += ' AND batch_id = ?';
      params.push(batchId);
    }
    if (disposition) {
      query += ' AND disposition = ?';
      params.push(disposition);
    }
    if (queue) {
      query += ' AND queue = ?';
      params.push(queue);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY score DESC, billed_minor DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const claims = db.prepare(query).all(...params);
    res.json(claims);
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

router.get('/:id', requireCapability('claim.read'), async (req, res) => {
  try {
    const db = await getDb();
    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
    
    if (!claim) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Claim not found' });
      return;
    }
    
    const hits = db.prepare('SELECT * FROM claim_hits WHERE claim_pk = ? ORDER BY seq').all(claim.id);
    const actions = db.prepare('SELECT * FROM claim_actions WHERE claim_pk = ? ORDER BY at DESC').all(claim.id);
    
    res.json({ ...claim, hits, actions });
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

router.post('/:id/actions', async (req, res) => {
  try {
    const user = (req as any).user;
    const db = await getDb();
    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
    
    if (!claim) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Claim not found' });
      return;
    }
    
    const { action, note } = req.body;
    const requiredCapability: Capability = action === 'assign'
      ? 'claim.reassign'
      : claim.queue === 'CRITICAL' ? 'claim.work.critical' : 'claim.work.manual';
    if (!can(user.role, requiredCapability)) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Your role cannot perform this action on this claim' });
      return;
    }
    const fromStatus = claim.status;
    let toStatus = fromStatus;
    
    // Simple workflow logic
    if (action === 'assign') toStatus = 'ASSIGNED';
    else if (action === 'approve') toStatus = 'APPROVED';
    else if (action === 'reject') toStatus = 'REJECT_CONFIRMED';
    else if (action === 'request-info') toStatus = 'INFO_REQUESTED';
    else {
      res.status(400).json({ code: 'INVALID_ACTION', message: 'Valid actions: assign, approve, reject, request-info' });
      return;
    }
    
    db.prepare('UPDATE claims SET status = ?, assignee = ? WHERE id = ?')
      .run(toStatus, user.username, claim.id);
    
    db.prepare(`
      INSERT INTO claim_actions (claim_pk, actor, role, action, from_status, to_status, note, at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(claim.id, user.username, user.role, action, fromStatus, toStatus, note || null, new Date().toISOString());
    appendAudit(db, {
      actor: user.username,
      role: user.role,
      action: `CLAIM_${action.toUpperCase().replace('-', '_')}`,
      entity: 'claim',
      entityId: String(claim.id),
      detail: { claimId: claim.claim_id, fromStatus, toStatus, note: note || null },
    });
    
    const updated = db.prepare('SELECT * FROM claims WHERE id = ?').get(claim.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ code: 'ACTION_FAILED', message: error.message });
  }
});

export default router;
