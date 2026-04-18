import { apiRequest, setAccessToken } from './client';
import type { User } from '../types';

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  emergencyEmail: string;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  });
  setAccessToken(res.accessToken);
  return res;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  });
  setAccessToken(res.accessToken);
  return res;
}

export async function logoutUser(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
  setAccessToken(null);
}

export async function fetchMe(): Promise<{ user: User }> {
  return apiRequest('/auth/me');
}

export async function refreshSession(): Promise<AuthResponse | null> {
  try {
    const res = await apiRequest<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      skipAuth: true,
      skipRefresh: true,
    });
    setAccessToken(res.accessToken);
    const me = await fetchMe();
    return { user: me.user, accessToken: res.accessToken };
  } catch {
    return null;
  }
}
