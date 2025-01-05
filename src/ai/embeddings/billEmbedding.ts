// src/ai/embeddings/billEmbedding.ts

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Utility to split large bill text into manageable chunks.
 * Overlap is optional but can help the model with context continuity.
 */
export function chunkBillText(
  text: string,
  chunkSize = 1000,
  overlap = 100
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);

    // Move the pointer; add overlap if desired
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Example: uses OpenAI's /embeddings endpoint to get vector for a chunk of text
 *
 * For production, store your OPENAI_API_KEY in .env (and never commit it).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-ada-002', // or another embedding model
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    // The embeddings for 'text-embedding-ada-002' return a single vector in data[0].embedding
    const embedding = response.data.data[0].embedding;
    return embedding;
  } catch (error) {
    console.error('Error fetching embedding:', error);
    return [];
  }
}

/**
 * For an MVP, you might store embeddings in a BillEmbeddings table (or just in memory).
 * This function demonstrates a naive approach (sequential chunking + insertion).
 */
export async function indexBillText(billId: string, fullText: string) {
  // 1. Chunk
  const chunks = chunkBillText(fullText);

  // 2. For each chunk, get embedding
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);

    // 3. Save to DB (assuming you have a BillEmbedding model in schema.prisma)
    // Example model:
    // model BillEmbedding {
    //   id       String  @id @default(cuid())
    //   billId   String
    //   chunk    String
    //   vector   Json
    // }
    await prisma.billEmbedding.create({
      data: {
        billId,
        chunk,
        vector: embedding,
      },
    });
  }
}
