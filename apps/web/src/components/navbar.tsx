// apps/web/src/components/navbar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Search, School, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const profileHref = isStudent && user?.id ? `/students/${user.id}` : '/settings';

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Search Bar */}
      <div className="relative w-72 sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={isStudent ? "Search subjects, tests, notes..." : "Search batches, questions, students..."}
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100/80 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Active Institute Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-200/60 rounded-xl text-brand-700 text-xs font-medium">
          <School className="w-3.5 h-3.5 text-brand-600" />
          <span>{user?.instituteName || 'Apex Medical Academy'}</span>
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-rose ring-2 ring-white"></span>
        </button>

        {/* User Profile Link */}
        <Link
          href={profileHref}
          className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-90 transition-opacity"
          title="View My Profile"
        >
          <div suppressHydrationWarning className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold text-xs flex items-center justify-center shadow-sm overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
            ) : (
              user?.fullName ? user.fullName[0] : 'U'
            )}
          </div>
          <div suppressHydrationWarning className="hidden md:block text-left">
            <span className="block text-xs font-bold text-slate-900 leading-tight">
              {user?.fullName || (isStudent ? 'Student' : 'Admin')}
            </span>
            <span className="block text-[10px] font-semibold text-brand-600 uppercase tracking-wider">
              {user?.role || 'STUDENT'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
