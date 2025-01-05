// src/routes/aiChat.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAnswerFromRAG } from '../ai/pipeline/rag';

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /ai/chat
 * body: {
 *   userId: string,
 *   billId: string,
 *   conversationId?: string (if continuing existing conversation)
 *   userMessage: string
 * }
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { userId, billId, userMessage, conversationId } = req.body;
    if (!userId || !billId || !userMessage) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    let conversation;
    if (conversationId) {
      // find existing
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found.' });
      }
    } else {
      // create new
      conversation = await prisma.conversation.create({
        data: { userId, billId },
      });
    }

    // store user’s message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'user',
        text: userMessage,
      },
    });

    // get AI’s response
    const aiAnswer = await getAnswerFromRAG(userMessage, billId);

    // store AI’s response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'ai',
        text: aiAnswer,
      },
    });

    return res.status(200).json({
      conversationId: conversation.id,
      aiAnswer,
    });
  } catch (error) {
    console.error('Error in /ai/chat route:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
