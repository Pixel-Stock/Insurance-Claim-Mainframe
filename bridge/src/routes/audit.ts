import { Router } from 'express';
import { authenticate, requireCapability } from '../auth/index.js';
import { can } from '@shared/types.js';
import { getDb } from '../db/helpers.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { limit = 100, offset = 0 } = req.query;
    
    const user = (req as any).user;
    const hasFullAudit = can(user.role, 'audit.read.all');
    if (!hasFullAudit && !can(user.role, 'audit.read.own')) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Your role cannot view audit history' });
      return;
    }
    const entries = hasFullAudit
      ? db.prepare('SELECT * FROM audit_log ORDER BY at DESC LIMIT ? OFFSET ?').all(parseInt(limit as string), parseInt(offset as string))
      : db.prepare('SELECT * FROM audit_log WHERE actor = ? ORDER BY at DESC LIMIT ? OFFSET ?').all(user.username, parseInt(limit as string), parseInt(offset as string));
    
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

export default router;
