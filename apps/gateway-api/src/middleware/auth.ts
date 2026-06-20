import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface AuthPayload {
  id: string;
  role: 'MERCHANT' | 'CUSTOMER' | 'AGENT';
  merchantId?: string;
  agentId?: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization Header' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid security context signature' });
  }
}

export function authorize(...roles: Array<AuthPayload['role']>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden for this role' });
      return;
    }
    next();
  };
}
