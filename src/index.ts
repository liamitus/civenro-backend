// src/index.ts

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import billsRouter from './routes/bills';
import commentsRouter from './routes/comments';
import commentVotesRouter from './routes/commentVotes';
import representativesRouter from './routes/representatives';
import userRouter from './routes/users';
import votesRouter from './routes/votes';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: `${process.env.FRONTEND_URL}`,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());

// Define routes here
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/bills', billsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/comment-votes', commentVotesRouter);
app.use('/api/representatives', representativesRouter);
app.use('/api/users', userRouter);
app.use('/api/votes', votesRouter);

// Health Check Route
app.get('/', (req, res) => {
  res.send('Government Bills Platform API is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
