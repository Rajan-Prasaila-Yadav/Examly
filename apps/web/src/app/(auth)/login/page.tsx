// apps/web/src/app/(auth)/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Lock, User, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('rajanprasaila@gmail.com');
  const [password, setPassword] = useState('Admin@Examly2026!');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier,
        password,
        deviceInfo: 'Examly Web Admin Desktop',
      });

      login(res.data);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials or connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-600/20 to-accent-purple/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        {/* Brand Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-indigo items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-brand-500/30 mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Examly Admin Suite</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-Tenant Learning & Examination Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email, Phone or Roll Number
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="rajanprasaila@gmail.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In to Console <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Demo Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-medium text-slate-400 mb-3 text-center flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" /> 1-Click Authentication Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('rajanprasaila@gmail.com', 'Admin@Examly2026!')}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-brand-500/40 hover:border-brand-500 rounded-xl text-[11px] text-slate-300 font-medium text-left transition-all"
            >
              👑 <span className="text-white font-bold">Super Admin</span>
              <span className="block text-[9px] text-brand-400 truncate font-mono">rajanprasaila@...</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('director@apexmedical.edu.np', 'Admin@Examly2026!')}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-[11px] text-slate-300 font-medium text-left hover:border-brand-500/50 transition-all"
            >
              🏫 <span className="text-white font-bold">Institute Admin</span>
              <span className="block text-[9px] text-slate-400 truncate font-mono">director@apex...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
