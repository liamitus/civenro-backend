import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import app from '../../src/index';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
let userToken: string;
let userId: number;

describe('Users Endpoints', () => {
  beforeAll(async () => {
    // Create a test user directly via Prisma
    const hashedPassword = await prisma.user.create({
      data: {
        username: 'testuser2',
        email: 'user2@example.com',
        password: await bcrypt.hash('Passw0rd!', 10),
      },
    });
    userId = hashedPassword.id;
    // Generate token
    userToken = jwt.sign({ userId, email: 'user2@example.com' }, JWT_SECRET, {
      expiresIn: '7d',
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);
    await prisma.$disconnect();
  });

  describe('GET /users/:userId', () => {
    it('should get public user profile', async () => {
      const response = await request(app).get(`/api/users/${userId}`);
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testuser2');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).get('/api/users/9999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PUT /users/username', () => {
    it('should update username if authenticated', async () => {
      const response = await request(app)
        .put('/api/users/username')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'newusername' });
      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('newusername');
    });

    it('should fail if username is taken', async () => {
      // Create a second user
      await prisma.user.create({
        data: {
          username: 'takenusername',
          email: 'taken@example.com',
          password: await bcrypt.hash('Passw0rd!', 10),
        },
      });

      const response = await request(app)
        .put('/api/users/username')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'takenusername' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username is already taken');
    });
  });

  describe('PUT /users/email', () => {
    it('should update email if authenticated', async () => {
      const response = await request(app)
        .put('/api/users/email')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'newemail@example.com' });
      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('newemail@example.com');
    });
  });

  describe('PUT /users/password', () => {
    it('should update password with correct current password', async () => {
      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'Passw0rd!', newPassword: 'NewPass123' });
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should fail with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'WrongPass', newPassword: 'AnotherPass123' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Current password is incorrect');
    });
  });
});
