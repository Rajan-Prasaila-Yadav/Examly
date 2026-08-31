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
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('examly_user');
        if (saved) {
          return normalizeUserRole(JSON.parse(saved));
        }
      } catch (e) {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('examly_access_token');
    }
    return true;
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('examly_access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          const normalized = normalizeUserRole(res.data);
          setUser(normalized);
          localStorage.setItem('examly_user', JSON.stringify(normalized));
        } catch (e) {
          localStorage.removeItem('examly_access_token');
          localStorage.removeItem('examly_refresh_token');
          localStorage.removeItem('examly_user');
          setUser(null);
        }
      } else {
        localStorage.removeItem('examly_user');
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (data: { accessToken: string; refreshToken: string; user: any }) => {
    const normalized = normalizeUserRole(data.user);
    localStorage.setItem('examly_access_token', data.accessToken);
    localStorage.setItem('examly_refresh_token', data.refreshToken);
    localStorage.setItem('examly_user', JSON.stringify(normalized));
    setUser(normalized);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('examly_access_token');
    localStorage.removeItem('examly_refresh_token');
    localStorage.removeItem('examly_user');
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
