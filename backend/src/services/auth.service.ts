import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL_DAYS = 7;

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  emergencyEmail: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(userId: string): Promise<TokenPair> {
  const accessToken = signAccessToken(userId);
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(userId, jti);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  return { accessToken, refreshToken, refreshExpiresAt };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new HttpError(409, 'EmailAlreadyRegistered');
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      phone: input.phone,
      whatsapp: input.whatsapp,
      emergencyEmail: input.emergencyEmail,
    },
  });
  const tokens = await issueTokens(user.id);
  return { user, tokens };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new HttpError(401, 'InvalidCredentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'InvalidCredentials');
  const tokens = await issueTokens(user.id);
  return { user, tokens };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, 'InvalidRefreshToken');
  }
  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new HttpError(401, 'RefreshTokenExpiredOrRevoked');
  }
  if (stored.tokenHash !== hashRefreshToken(refreshToken)) {
    throw new HttpError(401, 'InvalidRefreshToken');
  }
  // rotate: revoca el anterior y emite nuevo
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  return issueTokens(payload.sub);
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // silencioso: logout ideempotente
  }
}

export function publicUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  emergencyEmail: string;
  role: string;
  faceDescriptor: string | null;
  faceTraits: string | null;
  facePhoto?: string | null;
  emotionPhotos?: string | null;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp,
    emergencyEmail: user.emergencyEmail,
    role: user.role as 'user' | 'admin',
    hasFaceProfile: Boolean(user.faceDescriptor),
    facePhoto: user.facePhoto ?? null,
    emotionPhotos: user.emotionPhotos ? JSON.parse(user.emotionPhotos) : null,
  };
}
