import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { publicUser } from '../services/auth.service.js';
import type { User, Conversation, Message } from '@prisma/client';

export const adminRouter = Router();

// All admin routes require auth + admin role
adminRouter.use(requireAuth);
adminRouter.use(async (req, _res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user || user.role !== 'admin') {
      return next(new HttpError(403, 'AdminAccessRequired'));
    }
    next();
  } catch (err) {
    next(err);
  }
});

// ─── List all users ─────────────────────────────────────────────────
adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { conversations: true } },
      },
    });
    res.json({
      users: users.map((u: User & { _count: { conversations: number } }) => ({
        ...publicUser(u),
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        conversationCount: u._count.conversations,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get admin stats ────────────────────────────────────────────────
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [userCount, conversationCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
    ]);
    res.json({ userCount, conversationCount, messageCount });
  } catch (err) {
    next(err);
  }
});

// ─── Delete user ────────────────────────────────────────────────────
adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!targetUser) throw new HttpError(404, 'UserNotFound');
    if (targetUser.role === 'admin') throw new HttpError(400, 'CannotDeleteAdmin');

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Seed admin account (only if no admin exists) ───────────────────
export async function seedAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (existing) return;

  const ADMIN_EMAIL = 'admin@unia.co';
  const ADMIN_PASSWORD = 'Admin2024!UNIA';

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.create({
    data: {
      fullName: 'Administrador UNIA',
      email: ADMIN_EMAIL,
      passwordHash,
      phone: '0000000000',
      whatsapp: '0000000000',
      emergencyEmail: ADMIN_EMAIL,
      role: 'admin',
    },
  });
  console.log(`✅ Admin account created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}
