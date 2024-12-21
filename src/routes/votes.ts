// src/routes/votes.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface VoteAggregation {
  voteType?: string;
  vote?: string;
  _count: {
    voteType?: number;
    vote?: number;
  };
}

// POST /api/votes
// Submit a vote on a bill
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  // Access req.user, making sure to handle the possibility that it might be undefined
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { billId, voteType } = req.body;
  const userId = req.user.userId;

  // Basic validation
  if (!billId || !voteType) {
    return res.status(400).json({ error: 'billId and voteType are required' });
  }

  if (!['For', 'Against', 'Abstain'].includes(voteType)) {
    return res.status(400).json({ error: 'Invalid voteType' });
  }

  try {
    // Check if the bill exists
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Upsert vote for authenticated user
    const vote = await prisma.vote.upsert({
      where: { userId_billId: { userId, billId } },
      update: { voteType },
      create: {
        userId,
        billId,
        voteType,
      },
    });

    return res.status(200).json(vote);
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/votes/:billId
// Retrieve aggregated votes for a specific bill
router.get('/:billId', async (req: Request, res: Response) => {
  const { billId } = req.params;

  try {
    const publicVotes = await prisma.vote.groupBy({
      by: ['voteType'],
      where: { billId: parseInt(billId) },
      _count: { voteType: true },
    });

    const congressionalVotes = await prisma.representativeVote.groupBy({
      by: ['vote'],
      where: { billId: parseInt(billId) },
      _count: { vote: true },
    });

    res.status(200).json({
      publicVotes: publicVotes.map((v: VoteAggregation) => ({
        voteType: v.voteType,
        count: v._count.voteType,
      })),
      congressionalVotes: congressionalVotes.map((v: VoteAggregation) => ({
        vote: v.vote,
        count: v._count.vote,
      })),
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
