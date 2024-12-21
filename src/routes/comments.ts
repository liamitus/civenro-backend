// src/routes/comments.ts

import { Router, Request, Response } from 'express';
import { type CommentVote, PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface CreateCommentBody {
  billId: number;
  content: string;
  parentCommentId?: number;
}

// POST /api/comments
// Submit a comment on a bill
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const body = req.body as CreateCommentBody;
  // Access req.user, making sure to handle the possibility that it might be undefined
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { billId, content, parentCommentId } = body;
  const userId = req.user.userId;

  // Basic validation
  if (!billId || !content) {
    return res.status(400).json({ error: 'billId and content are required' });
  }

  // Validation for comment length (e.g., max 10,000 characters)
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Comment is too long.' });
  }

  // Add check to prevent duplicate comments
  const recentComment = await prisma.comment.findFirst({
    where: {
      userId,
      billId,
      content,
      date: {
        gte: new Date(Date.now() - 60000), // within the last 60 seconds
      },
    },
  });

  if (recentComment) {
    return res.status(429).json({ error: 'Duplicate comment detected' });
  }

  try {
    // Check if the bill exists
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // If userId is provided, check if the user exists
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        userId: userId,
        billId,
        content,
        parentCommentId: parentCommentId || null,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error submitting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modify GET /api/comments/bill/:billId to support pagination
router.get('/bill/:billId', async (req: Request, res: Response) => {
  const billId = parseInt(req.params.billId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const sortOption = req.query.sort === 'best' ? 'best' : 'new';

  try {
    const total = await prisma.comment.count({
      where: { billId, parentCommentId: null },
    });

    const comments = await getCommentsWithVotes(
      null,
      billId,
      sortOption,
      skip,
      limit
    );

    // Sort comments manually if sortOption is 'best'
    if (sortOption === 'best') {
      comments.sort(
        (a: CommentWithReplies, b: CommentWithReplies) =>
          b.voteCount - a.voteCount
      );
    }

    res.status(200).json({ comments, total });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modify GET /api/comments/user/:userId to support pagination
router.get('/user/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.comment.count({
      where: { userId },
    });

    const comments = await prisma.comment.findMany({
      where: { userId },
      include: {
        bill: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        CommentVote: true,
      },
      orderBy: {
        date: 'desc',
      },
      skip,
      take: limit,
    });

    // Calculate vote counts
    const commentsWithVoteCounts = comments.map((comment) => {
      const voteCount = comment.CommentVote.reduce(
        (sum: number, vote: CommentVote) => sum + vote.voteType,
        0
      );
      return {
        ...comment,
        voteCount,
      };
    });

    res.json({ comments: commentsWithVoteCounts, total });
  } catch (error) {
    console.error('Error fetching user comments:', error);
    res.status(500).json({ error: 'Failed to fetch user comments' });
  }
});

// DELETE /api/comments/:id
// Allow authenticated users to delete their own comment
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    const commentId = parseInt(req.params.id);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.comment.delete({
        where: { id: commentId },
      });

      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update the getCommentsWithVotes function to accept sortOption and fetch replies correctly
type ExtendedComment = {
  id: number;
  user: { username?: string | null };
  [key: string]: unknown;
};

type CommentWithReplies = {
  id: number;
  user: { username?: string | null };
  username: string;
  voteCount: number;
  replies: CommentWithReplies[];
  [key: string]: unknown;
};

async function getCommentsWithVotes(
  parentCommentId: number | null,
  billId: number,
  sortOption: string,
  skip: number,
  take: number
): Promise<CommentWithReplies[]> {
  const comments = await prisma.comment.findMany({
    where: {
      billId,
      parentCommentId,
    },
    include: {
      user: true,
    },
    orderBy: {
      date: 'desc',
    },
    skip,
    take,
  });

  // Fetch vote counts and replies for each comment
  const commentsWithVotes = await Promise.all(
    comments.map(async (comment: ExtendedComment) => {
      const voteCount = await getVoteCount(comment.id as number);
      const replies = await getCommentsWithVotes(
        comment.id as number,
        billId,
        sortOption,
        0,
        10 // Changed from 0 to 10 to fetch up to 10 replies
      );
      return {
        ...comment,
        username: comment.user.username || 'Anonymous',
        voteCount,
        replies,
      };
    })
  );

  return commentsWithVotes;
}

// Helper function to get the vote count for a comment
async function getVoteCount(commentId: number): Promise<number> {
  const result = await prisma.commentVote.aggregate({
    where: { commentId },
    _sum: {
      voteType: true,
    },
  });
  return result._sum.voteType || 0;
}

export default router;
