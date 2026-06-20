import 'express';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: 'MERCHANT' | 'CUSTOMER' | 'AGENT';
      merchantId?: string;
      agentId?: string;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
