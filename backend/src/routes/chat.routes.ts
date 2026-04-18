import { Router } from 'express';
import { z } from 'zod';
import { Prisma, Message } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { chatRateLimit } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/errorHandler.js';
import { sanitizeUserInput } from '../utils/sanitize.js';
import { streamCompletion, type ChatTurn } from '../services/groq.service.js';
import type { EmotionKey } from '../prompts/system.js';
import { generateConversationTitle } from '../services/groq.service.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

const VALID_EMOTIONS: EmotionKey[] = ['happy', 'sad', 'angry', 'disgusted', 'surprised', 'fearful', 'neutral'];

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  emotion: z.enum(['happy', 'sad', 'angry', 'disgusted', 'surprised', 'fearful', 'neutral']),
  conversationId: z.string().uuid().optional(),
});

// ─── List all conversations ─────────────────────────────────────────
chatRouter.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId! },
      orderBy: { startedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { emotionAtTime: true },
        },
        _count: { select: { messages: true } },
      },
    });
    res.json({
      conversations: conversations.map((c: Prisma.ConversationGetPayload<{ include: { messages: { select: { emotionAtTime: true } }; _count: { select: { messages: true } } } }>) => ({
        id: c.id,
        title: c.title,
        startedAt: c.startedAt.toISOString(),
        lastEmotion: c.messages[0]?.emotionAtTime ?? 'neutral',
        messageCount: c._count.messages,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Create new conversation ────────────────────────────────────────
chatRouter.post('/conversations', async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.create({
      data: { userId: req.userId! },
    });
    res.status(201).json({
      id: conversation.id,
      title: conversation.title,
      startedAt: conversation.startedAt.toISOString(),
      lastEmotion: 'neutral',
      messageCount: 0,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get messages for a specific conversation ───────────────────────
chatRouter.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!conversation) throw new HttpError(404, 'ConversationNotFound');

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({
      messages: messages.map((m: Message) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        emotionAtTime: m.emotionAtTime,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Update conversation title ──────────────────────────────────────
chatRouter.patch('/conversations/:id', async (req, res, next) => {
  try {
    const { title } = z.object({ title: z.string().min(1).max(100) }).parse(req.body);
    const conversation = await prisma.conversation.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { title },
    });
    if (conversation.count === 0) throw new HttpError(404, 'ConversationNotFound');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Delete conversation ────────────────────────────────────────────
chatRouter.delete('/conversations/:id', async (req, res, next) => {
  try {
    const result = await prisma.conversation.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (result.count === 0) throw new HttpError(404, 'ConversationNotFound');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Send chat message (with conversationId support) ────────────────
chatRouter.post('/', chatRateLimit, async (req, res, next) => {
  try {
    const parsed = chatSchema.parse(req.body);
    const sanitized = sanitizeUserInput(parsed.message);
    if (!sanitized) throw new HttpError(400, 'EmptyMessage');
    if (!VALID_EMOTIONS.includes(parsed.emotion)) throw new HttpError(400, 'InvalidEmotion');

    // Get or create conversation
    let conversation;
    if (parsed.conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: parsed.conversationId, userId: req.userId! },
      });
      if (!conversation) throw new HttpError(404, 'ConversationNotFound');
    } else {
      conversation = await prisma.conversation.create({
        data: { userId: req.userId! },
      });
    }

    // Carga últimos 20 mensajes como contexto
    const prior = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const history: ChatTurn[] = prior
      .reverse()
      .map((m: Message) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Persiste mensaje del usuario
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: sanitized,
        emotionAtTime: parsed.emotion,
      },
    });

    // Check if this is the first message — generate title async
    const isFirstMessage = prior.length === 0;

    // Configura SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send conversationId in the first event so frontend knows which conversation this belongs to
    res.write(`data: ${JSON.stringify({ type: 'conversationId', value: conversation.id })}\n\n`);

    let full = '';
    try {
      for await (const delta of streamCompletion(parsed.emotion, history, sanitized)) {
        full += delta;
        res.write(`data: ${JSON.stringify({ type: 'delta', value: delta })}\n\n`);
      }
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: full,
          emotionAtTime: parsed.emotion,
        },
      });

      // Auto-generate title from first message (fire and forget)
      if (isFirstMessage) {
        generateConversationTitle(sanitized)
          .then(async (title) => {
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { title },
            });
          })
          .catch(() => {
            // Fallback: use first 40 chars of message
            prisma.conversation.update({
              where: { id: conversation.id },
              data: { title: sanitized.slice(0, 40) },
            }).catch(() => {});
          });
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (err) {
      const msg = err instanceof HttpError ? err.message : 'StreamFailed';
      res.write(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`);
      res.end();
    }
  } catch (err) {
    next(err);
  }
});

// ─── Legacy history endpoint (backward compat) ─────────────────────
chatRouter.get('/history', async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { userId: req.userId! },
      orderBy: { startedAt: 'desc' },
    });
    if (!conversation) {
      res.json({ messages: [] });
      return;
    }
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({
      messages: messages.map((m: Message) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        emotionAtTime: m.emotionAtTime,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});
