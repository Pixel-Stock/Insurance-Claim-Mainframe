import { Router } from 'express';
import { authenticate, requireCapability } from '../auth/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

router.use(authenticate);

router.get('/', requireCapability('rules.read'), (req, res) => {
  try {
    const rulesPath = path.join(__dirname, '../../../shared/rules.json');
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ code: 'QUERY_FAILED', message: error.message });
  }
});

export default router;
