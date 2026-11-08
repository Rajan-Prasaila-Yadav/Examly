// apps/web/src/lib/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api, invalidateApiCache, setApiCacheScope } from './api';

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
  permissions?: string[];
  roleId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string; user: any }) => void;
  logout: () => void;
  can: (resource:string,action?:string)=>boolean;
  refreshPermissions: ()=>Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  can:()=>false,
  refreshPermissions:async()=>{},
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
  const [permissions,setPermissions]=useState<string[]>([]);
  const permissionSignature=useRef('');
  const refreshPermissions=async()=>{if(!localStorage.getItem('examly_access_token')){setPermissions([]);return;}try{const r=await api.get('/auth/permissions',{bypassCache:true,timeout:30000} as any);const signature=JSON.stringify(r.data.permissions);if(permissionSignature.current&&permissionSignature.current!==signature)invalidateApiCache();permissionSignature.current=signature;setApiCacheScope(r.data.userId,r.data.cacheVersion);setPermissions(r.data.permissions);setUser(u=>u?{...u,role:r.data.role,roleId:r.data.roleId,permissions:r.data.permissions}:u);}catch(e:any){setApiCacheScope();setPermissions([]);}};
  const can=(resource:string,action='read')=>permissions.includes('*.*')||permissions.includes(`${resource}.${action}`);
  useEffect(()=>{const update=()=>{void refreshPermissions();};window.addEventListener('focus',update);window.addEventListener('examly-permissions-changed',update);const timer=setInterval(update,30000);return()=>{clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('examly-permissions-changed',update);};},[]);

  useEffect(() => {
    // 1. Immediately hydrate from localStorage on client mount (0ms)
    try {
      const saved = localStorage.getItem('examly_user');
      if (saved) {
        const u = normalizeUserRole(JSON.parse(saved));
        setUser(u);
        setApiCacheScope(u.id, u.cacheVersion);
        setPermissions(u.permissions || []);
        setIsLoading(false);
      }
    } catch (e) {}

    // 2. Validate token and user session in background
    const initAuth = async () => {
      const token = localStorage.getItem('examly_access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me',{bypassCache:true,timeout:30000} as any);
          const normalized = normalizeUserRole(res.data);
          setUser(normalized);
          setApiCacheScope(normalized.id,normalized.cacheVersion);
          setPermissions(normalized.permissions||[]);
          localStorage.setItem('examly_user', JSON.stringify(normalized));
        } catch (e:any) {
          setApiCacheScope();
          if(e.response?.status!==401 && e.response?.status!==403){setIsLoading(false);return;}
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
    setApiCacheScope();
    invalidateApiCache();
    const normalized = normalizeUserRole(data.user);
    localStorage.setItem('examly_access_token', data.accessToken);
    localStorage.setItem('examly_refresh_token', data.refreshToken);
    localStorage.setItem('examly_user', JSON.stringify(normalized));
    setUser(normalized);
    setIsLoading(false);
    setPermissions([]);
    void refreshPermissions();
  };

  const logout = () => {
    setApiCacheScope();
    invalidateApiCache();
    setPermissions([]);
    localStorage.removeItem('examly_access_token');
    localStorage.removeItem('examly_refresh_token');
    localStorage.removeItem('examly_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, can, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
