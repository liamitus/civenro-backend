import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/comment-votes
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { userId, commentId, voteType } = req.body;

  if (!commentId || ![1, -1].includes(voteType)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const vote = await prisma.commentVote.upsert({
      where: { userId_commentId: { userId: userId || null, commentId } },
      update: { voteType },
      create: { userId: userId || null, commentId, voteType },
    });

    res.status(200).json(vote);
  } catch (error) {
    console.error('Error submitting comment vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
