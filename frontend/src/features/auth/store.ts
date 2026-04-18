import { create } from 'zustand';
import type { User } from '../../types';
import { fetchMe, loginUser, logoutUser, refreshSession, registerUser, type RegisterPayload } from '../../api/auth';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  bootstrap: async () => {
    set({ status: 'loading', error: null });
    const session = await refreshSession();
    if (session) {
      set({ user: session.user, status: 'authenticated' });
    } else {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      const res = await loginUser(email, password);
      set({ user: res.user, status: 'authenticated' });
    } catch (err) {
      set({ status: 'unauthenticated', error: (err as Error).message });
      throw err;
    }
  },

  register: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      const res = await registerUser(payload);
      set({ user: res.user, status: 'authenticated' });
    } catch (err) {
      set({ status: 'unauthenticated', error: (err as Error).message });
      throw err;
    }
  },

  logout: async () => {
    await logoutUser();
    set({ user: null, status: 'unauthenticated' });
  },

  setUser: (user) => set({ user }),
}));

export async function refreshUser() {
  try {
    const { user } = await fetchMe();
    useAuthStore.setState({ user });
  } catch {
    // ignore
  }
}
