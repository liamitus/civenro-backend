// __tests__/routes/auth.test.ts

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import app from '../../src/index'; // Ensure index.ts exports the Express app

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    // Run migrations if needed or ensure DB is ready
    // e.g., await prisma.$executeRaw(`TRUNCATE TABLE "User" CASCADE;`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Passw0rd!',
      });
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');

      // Check DB entry
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).not.toBeNull();
    });

    it('should fail if email already exists', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'anotheruser',
        email: 'test@example.com',
        password: 'secret',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should fail if username already exists', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'other@example.com',
        password: 'secret',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully and return a token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Passw0rd!' });
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      // Verify token
      const payload = jwt.verify(response.body.token, JWT_SECRET);
      expect(payload).toHaveProperty('userId');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
