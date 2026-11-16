// apps/mobile/src/auth/auth-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, refreshAccessToken } from '../api/client';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  instituteId?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (payload: { idToken?: string; accessToken?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from SecureStore on startup
    const restoreSession = async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          SecureStore.getItemAsync('examly_user'),
          SecureStore.getItemAsync('examly_token'),
        ]);
        // Restore the still-valid access token immediately. Refresh runs in the
        // background so returning to Android never flashes the login screen.
        if (storedToken && storedUser) {
          const restoredUser = JSON.parse(storedUser) as User;
          if (restoredUser.role === 'STUDENT') {
            setToken(storedToken);
            setUser(restoredUser);
            refreshAccessToken().then((refreshedToken) => {
              if (refreshedToken) setToken(refreshedToken);
            });
          }
        }
      } catch (e) {
        console.warn('Failed to restore auth session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/v1/auth/login', {
        identifier: email.trim(),
        email: email.trim(),
        password,
      });
      const data = response.data;

      const receivedToken = data.token || data.accessToken || data.data?.token;
      const receivedUser = data.user || data.data?.user;

      const refreshToken = data.refreshToken || data.data?.refreshToken;
      if (!receivedToken || !refreshToken || !receivedUser) {
        return { success: false, error: 'Invalid response from server' };
      }
      if (receivedUser.role !== 'STUDENT') return { success: false, error: 'This is the Student app. Please sign in with a student account.' };

      setToken(receivedToken);
      setUser(receivedUser);

      await SecureStore.setItemAsync('examly_token', receivedToken);
      await SecureStore.setItemAsync('examly_refresh_token', refreshToken);
      await SecureStore.setItemAsync('examly_user', JSON.stringify(receivedUser));

      return { success: true };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Authentication failed. Please check credentials.';
      return { success: false, error: errorMsg };
    }
  };

  const loginWithGoogle = async (payload: { idToken?: string; accessToken?: string }) => {
    try {
      const response = await apiClient.post('/api/v1/auth/google', payload);
      const data = response.data;

      const receivedToken = data.token || data.accessToken || data.data?.token;
      const receivedUser = data.user || data.data?.user;

      const refreshToken = data.refreshToken || data.data?.refreshToken;
      if (!receivedToken || !refreshToken || !receivedUser) {
        return { success: false, error: 'Invalid Google response from server' };
      }
      if (receivedUser.role !== 'STUDENT') return { success: false, error: 'This is the Student app. Please sign in with a student account.' };

      await SecureStore.setItemAsync('examly_token', receivedToken);
      await SecureStore.setItemAsync('examly_refresh_token', refreshToken);
      await SecureStore.setItemAsync('examly_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.request ? 'Cannot reach the Examly server. Check your connection and the mobile API URL.' : 'Google authentication failed.');
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout', {}).catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
      await SecureStore.deleteItemAsync('examly_token');
      await SecureStore.deleteItemAsync('examly_refresh_token');
      await SecureStore.deleteItemAsync('examly_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
