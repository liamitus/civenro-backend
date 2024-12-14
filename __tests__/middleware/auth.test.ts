// __tests__/middleware/auth.test.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../src/middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

describe('authenticateToken middleware', () => {
  let req: Partial<Request> & { user?: any };
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should return 401 if no token is provided', () => {
    req.headers = {}; // no authorization header
    authenticateToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Access denied, token missing!',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if token is invalid', () => {
    req.headers = {
      authorization: 'Bearer invalid.token.here',
    };
    authenticateToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next if token is valid', () => {
    // Create a valid token
    const tokenPayload = { userId: 1, email: 'test@example.com' };
    const validToken = jwt.sign(tokenPayload, JWT_SECRET);

    req.headers = {
      authorization: `Bearer ${validToken}`,
    };

    authenticateToken(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    // Check that req.user has been set
    expect(req.user).toMatchObject(tokenPayload);
  });
});
