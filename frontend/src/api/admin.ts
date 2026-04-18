import { apiRequest } from './client';
import type { AdminUser } from '../types';

interface AdminStats {
  userCount: number;
  conversationCount: number;
  messageCount: number;
}

export async function fetchAdminUsers(): Promise<{ users: AdminUser[] }> {
  return apiRequest('/admin/users');
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiRequest('/admin/stats');
}

export async function deleteUser(userId: string): Promise<void> {
  await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
}
