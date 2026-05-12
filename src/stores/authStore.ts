import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, getErrorMessage } from '@/lib/api';
import { storage } from '@/lib/utils';
import { User, AuthResponse, LoginInput, RegisterInput } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data: LoginInput) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{ data: AuthResponse }>('/auth/login', data);
          const { user, tokens } = response.data.data;

          storage.set('accessToken', tokens.accessToken);
          storage.set('refreshToken', tokens.refreshToken);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterInput) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{ data: AuthResponse }>('/auth/register', data);
          const { user, tokens } = response.data.data;

          storage.set('accessToken', tokens.accessToken);
          storage.set('refreshToken', tokens.refreshToken);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      logout: () => {
        storage.remove('accessToken');
        storage.remove('refreshToken');
        set({ user: null, isAuthenticated: false, error: null });
      },

      refreshUser: async () => {
        try {
          const response = await api.get<{ data: User }>('/auth/me');
          set({ user: response.data.data, isAuthenticated: true });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
