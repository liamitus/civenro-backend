// src/types/express/index.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
      };
    }
  }
}

// If this file is a module (contains imports or exports), we need to export something to make it a module.
export {};
