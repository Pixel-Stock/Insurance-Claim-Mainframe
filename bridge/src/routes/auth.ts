import { Router } from 'express';
import { demoLogin } from '../auth/index.js';
import type { Role } from '@shared/types.js';

const router = Router();

router.post('/login', (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['operator', 'adjuster', 'supervisor', 'auditor'].includes(role)) {
      res.status(400).json({ 
        code: 'INVALID_ROLE', 
        message: 'Valid roles: operator, adjuster, supervisor, auditor' 
      });
      return;
    }
    
    const { user, token } = demoLogin(role as Role);
    
    res.json({ user, token });
  } catch (error: any) {
    res.status(400).json({ code: 'LOGIN_FAILED', message: error.message });
  }
});

router.get('/me', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    return;
  }
  
  res.json({ user, backend: 'local' });
});

export default router;
