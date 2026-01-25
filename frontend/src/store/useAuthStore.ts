/**
 * 认证状态管理
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  is_active: boolean;
  has_deepseek_api_key?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await apiClient.post<{ access_token: string; token_type: string; expires_in: number }>(
            '/api/auth/login',
            { username, password },
            false // 登录不需要 token
          );
          
          // 保存 token
          set({
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // 获取用户信息
          await get().checkAuth();
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || '登录失败，请检查用户名和密码',
            isAuthenticated: false,
            token: null,
          });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post<User>(
            '/api/auth/register',
            { username, email, password },
            false // 注册不需要 token
          );
          
          // 注册成功后自动登录
          await get().login(username, password);
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || '注册失败',
          });
          throw error;
        }
      },

      logout: () => {
        // 清理本地残留，避免同浏览器切换账号时出现“看到上个用户 Key”的问题
        localStorage.removeItem('DEEPSEEK_API_KEY');
        localStorage.removeItem('gameConfig');
        localStorage.removeItem('current_session_id');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setToken: (token: string | null) => {
        set({ 
          token,
          isAuthenticated: !!token,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          const user = await apiClient.get<User>('/api/auth/me');
          set({
            user,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

