// apps/web/src/lib/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  identifier: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  instituteId?: string;
  instituteName?: string;
  studentProfile?: any;
  teacherProfile?: any;
  batch?: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string; user: any }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

function normalizeUserRole(rawUser: any) {
  if (!rawUser) return rawUser;
  let roleCode = 'STUDENT';
  if (typeof rawUser.role === 'string') {
    roleCode = rawUser.role.toUpperCase();
  } else if (typeof rawUser.role === 'object' && rawUser.role !== null) {
    roleCode = (rawUser.role.code || rawUser.role.name || 'STUDENT').toUpperCase();
  }
  return {
    ...rawUser,
    role: roleCode,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('examly_access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(normalizeUserRole(res.data));
        } catch (e) {
          localStorage.removeItem('examly_access_token');
          localStorage.removeItem('examly_refresh_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (data: { accessToken: string; refreshToken: string; user: any }) => {
    localStorage.setItem('examly_access_token', data.accessToken);
    localStorage.setItem('examly_refresh_token', data.refreshToken);
    setUser(normalizeUserRole(data.user));
  };

  const logout = () => {
    localStorage.removeItem('examly_access_token');
    localStorage.removeItem('examly_refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
