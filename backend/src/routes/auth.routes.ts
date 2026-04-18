import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { login, logout, publicUser, refresh, register } from '../services/auth.service.js';

export const authRouter = Router();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema,
  phone: z.string().min(6).max(20),
  whatsapp: z.string().min(6).max(20),
  emergencyEmail: z.string().email(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE = 'unia_rt';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
};

authRouter.use(authRateLimit);

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const { user, tokens } = await register(input);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieOptions,
      expires: tokens.refreshExpiresAt,
    });
    res.status(201).json({
      user: publicUser(user),
      accessToken: tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const { user, tokens } = await login(input.email, input.password);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieOptions,
      expires: tokens.refreshExpiresAt,
    });
    res.json({
      user: publicUser(user),
      accessToken: tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new HttpError(401, 'MissingRefreshToken');
    const tokens = await refresh(token);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieOptions,
      expires: tokens.refreshExpiresAt,
    });
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    await logout(token);
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new HttpError(404, 'UserNotFound');
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
