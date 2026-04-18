import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { register, login, refresh } from '../services/auth.service.js';
import { verifyAccessToken } from '../utils/jwt.js';

const baseInput = {
  fullName: 'Ana Prueba',
  email: 'ana+test@example.com',
  password: 'Segura123',
  phone: '3001234567',
  whatsapp: '3001234567',
  emergencyEmail: 'contacto+test@example.com',
};

async function clean() {
  await prisma.refreshToken.deleteMany({ where: { user: { email: baseInput.email } } });
  await prisma.user.deleteMany({ where: { email: baseInput.email } });
}

describe('auth.service', () => {
  beforeEach(async () => {
    await clean();
  });

  it('registers a new user and returns tokens + public user', async () => {
    const { user, tokens } = await register(baseInput);
    expect(user.email).toBe(baseInput.email);
    expect(user.passwordHash).not.toBe(baseInput.password);
    expect(await bcrypt.compare(baseInput.password, user.passwordHash)).toBe(true);
    expect(tokens.accessToken).toBeTruthy();
    const payload = verifyAccessToken(tokens.accessToken);
    expect(payload.sub).toBe(user.id);
  });

  it('rejects duplicate email on register', async () => {
    await register(baseInput);
    await expect(register(baseInput)).rejects.toThrow(/EmailAlreadyRegistered/);
  });

  it('logs in with correct password', async () => {
    await register(baseInput);
    const { tokens } = await login(baseInput.email, baseInput.password);
    expect(tokens.accessToken).toBeTruthy();
  });

  it('rejects login with wrong password', async () => {
    await register(baseInput);
    await expect(login(baseInput.email, 'WrongPass9')).rejects.toThrow(/InvalidCredentials/);
  });

  it('rejects login with non-existent email', async () => {
    await expect(login('nope@example.com', 'whatever')).rejects.toThrow(/InvalidCredentials/);
  });

  it('refreshes and rotates the refresh token', async () => {
    const { tokens } = await register(baseInput);
    const rotated = await refresh(tokens.refreshToken);
    // refresh token contiene un jti único, así que debe diferir de forma garantizada
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);
    expect(rotated.accessToken).toBeTruthy();
    // el anterior ya no debe servir tras rotación
    await expect(refresh(tokens.refreshToken)).rejects.toThrow();
  });
});
