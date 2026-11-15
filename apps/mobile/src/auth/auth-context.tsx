// apps/mobile/src/auth/auth-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({ success: false }),
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
        const storedToken = await SecureStore.getItemAsync('examly_token');
        const storedUser = await SecureStore.getItemAsync('examly_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
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

      if (!receivedToken || !receivedUser) {
        return { success: false, error: 'Invalid response from server' };
      }

      setToken(receivedToken);
      setUser(receivedUser);

      await SecureStore.setItemAsync('examly_token', receivedToken);
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

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout', {}).catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
      await SecureStore.deleteItemAsync('examly_token');
      await SecureStore.deleteItemAsync('examly_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
