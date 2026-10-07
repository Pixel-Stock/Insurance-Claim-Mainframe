import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type { Role, User, Capability } from '@shared/types.js';
import { can } from '@shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-change-in-production';
const JWT_EXPIRES_IN = '8h';

// Demo users
const DEMO_USERS: Record<string, { username: string; role: Role }> = {
  operator: { username: 'operator', role: 'operator' },
  adjuster: { username: 'adjuster', role: 'adjuster' },
  supervisor: { username: 'supervisor', role: 'supervisor' },
  auditor: { username: 'auditor', role: 'auditor' },
};

export function signToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): User {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'No token provided' });
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const user = verifyToken(token);
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}

export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as User;
    
    if (!user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      return;
    }
    
    if (!can(user.role, capability)) {
      res.status(403).json({ 
        code: 'FORBIDDEN', 
        message: `Role '${user.role}' does not have capability '${capability}'` 
      });
      return;
    }
    
    next();
  };
}

export function demoLogin(role: Role): { user: User; token: string } {
  const demoUser = DEMO_USERS[role];
  if (!demoUser) {
    throw new Error('Invalid role');
  }
  
  const user: User = {
    id: role,
    username: demoUser.username,
    role: demoUser.role,
  };
  
  const token = signToken(user);
  
  return { user, token };
}
