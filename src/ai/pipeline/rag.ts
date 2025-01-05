// src/ai/pipeline/rag.ts

import { PrismaClient } from '@prisma/client';
import { generateChatAnswer } from '../model/chatInference';

const prisma = new PrismaClient();

/**
 * Example naive retrieval function:
 * - Pulls all BillEmbedding rows for a given billId
 * - Ranks them by naive similarity
 * - Returns top N
 */
async function retrieveRelevantChunks(
  query: string,
  billId: string,
  limit = 3
): Promise<string[]> {
  // 1. Get embedding for user query
  // In a real scenario, also get embedding for the user’s query and compute similarity
  // For MVP, let's skip that and just take all. Or do a naive text search.

  // For a real approach, you'd do:
  //  const queryEmbedding = await getEmbedding(query);
  //  then compute similarity with each chunk in BillEmbedding

  const allEmbeddings = await prisma.billEmbedding.findMany({
    where: { billId },
  });

  // MVP hack: Just return the first N chunks
  // Real approach: calculate cosine similarity with `queryEmbedding`
  const topN = allEmbeddings.slice(0, limit).map((emb) => emb.chunk);
  return topN;
}

/**
 * High-level function that:
 * 1) Retrieves relevant chunks
 * 2) Constructs prompt
 * 3) Calls generateChatAnswer
 */
export async function getAnswerFromRAG(
  userQuestion: string,
  billId: string
): Promise<string> {
  // Retrieve relevant context
  const relevantChunks = await retrieveRelevantChunks(userQuestion, billId);

  // Build a big prompt
  const contextString = relevantChunks.join('\n\n');

  const prompt = `
    The following text is from the bill with ID: ${billId}:
    --------------------
    ${contextString}
    --------------------
    Based on this text, answer the user’s question:
    ${userQuestion}
  `;

  // Call the LLM
  const answer = await generateChatAnswer(prompt);
  return answer;
}
