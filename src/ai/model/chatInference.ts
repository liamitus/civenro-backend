// src/ai/model/chatInference.ts

import axios from 'axios';

/**
 * This function calls an LLM (e.g., OpenAI GPT-3.5, GPT-4)
 * with a constructed prompt that includes relevant context.
 *
 * You’d build the prompt in RAG pipeline, then pass it here.
 */
export async function generateChatAnswer(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful legislative bill assistant.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const completion = response.data.choices[0].message.content;
    return completion;
  } catch (error) {
    console.error('Error calling OpenAI chat API:', error);
    return 'Sorry, I encountered an error generating a response.';
  }
}
