import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errorHandler.js';
import { buildSystemPrompt, type EmotionKey } from '../prompts/system.js';

let client: Groq | null = null;

function getClient(): Groq {
  if (!env.GROQ_API_KEY) {
    throw new HttpError(503, 'GroqApiKeyNotConfigured');
  }
  client ??= new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function* streamCompletion(
  emotion: EmotionKey,
  history: ChatTurn[],
  userMessage: string
): AsyncGenerator<string, void, unknown> {
  const groq = getClient();
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(emotion) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const stream = await groq.chat.completions.create({
    model: env.GROQ_MODEL,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 600,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Generate a short title for a conversation based on the first user message.
 * Used asynchronously after the first message is sent.
 */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
  const groq = getClient();
  const response = await groq.chat.completions.create({
    model: env.GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Genera un título corto (máximo 5 palabras) en español para una conversación que comienza con el siguiente mensaje. Responde SOLO con el título, sin comillas, sin puntuación extra, sin explicaciones.',
      },
      { role: 'user', content: firstMessage },
    ],
    temperature: 0.3,
    max_tokens: 20,
  });
  const title = response.choices[0]?.message?.content?.trim();
  return title || firstMessage.slice(0, 40);
}
