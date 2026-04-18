import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { publicUser } from '../services/auth.service.js';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new HttpError(404, 'UserNotFound');
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
  whatsapp: z.string().min(6).max(20).optional(),
  emergencyEmail: z.string().email().optional(),
});

userRouter.patch('/me', async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: input,
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

const faceSchema = z.object({
  descriptor: z.array(z.number()).length(128),
  traits: z.object({
    skinHueRotate: z.number(),
    skinSepia: z.number(),
    faceShape: z.enum(['oval', 'round', 'square']),
    landmarks: z.array(z.object({ x: z.number(), y: z.number() })),
  }),
  facePhoto: z.string().optional(),
  emotionPhotos: z.record(z.string()).optional(),
});

userRouter.patch('/me/face', async (req, res, next) => {
  try {
    const input = faceSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        faceDescriptor: JSON.stringify(input.descriptor),
        faceTraits: JSON.stringify(input.traits),
        ...(input.facePhoto ? { facePhoto: input.facePhoto } : {}),
        ...(input.emotionPhotos ? { emotionPhotos: JSON.stringify(input.emotionPhotos) } : {}),
      },
    });
    res.json({ user: publicUser(user), faceTraits: input.traits });
  } catch (err) {
    next(err);
  }
});

userRouter.get('/me/face', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new HttpError(404, 'UserNotFound');
    res.json({
      hasFaceProfile: Boolean(user.faceDescriptor),
      faceTraits: user.faceTraits ? JSON.parse(user.faceTraits) : null,
      facePhoto: user.facePhoto ?? null,
      faceDescriptor: user.faceDescriptor ? JSON.parse(user.faceDescriptor) : null,
      emotionPhotos: user.emotionPhotos ? JSON.parse(user.emotionPhotos) : null,
    });
  } catch (err) {
    next(err);
  }
});

userRouter.delete('/me', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.userId! } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
