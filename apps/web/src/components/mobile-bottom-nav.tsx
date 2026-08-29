// apps/web/src/components/mobile-bottom-nav.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  FileCheck2,
  MessageSquare,
  MoreHorizontal,
  Users,
  UserSquare2,
  FolderTree,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Batches', href: '/batches', icon: GraduationCap },
    { name: 'Tests', href: '/tests', icon: FileCheck2 },
    { name: 'Community', href: '/community', icon: MessageSquare },
  ];

  const moreItems = [
    { name: 'Students Roster', href: '/students', icon: Users, desc: 'Enrolled student directory' },
    { name: 'Faculty Teachers', href: '/teachers', icon: UserSquare2, desc: 'Faculty & staff accounts' },
    { name: 'Curriculum Tree', href: '/curriculum', icon: FolderTree, desc: 'Subjects, lessons & videos' },
    { name: 'Test Builder', href: '/tests/builder', icon: Sparkles, desc: 'KaTeX Question Creator' },
    { name: 'Roles & Permissions', href: '/settings/roles', icon: ShieldCheck, desc: 'RBAC Access Matrix' },
    { name: 'Institute Settings', href: '/settings', icon: Settings, desc: 'Branding & preferences' },
  ];

  const roleDisplayName =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as any).name || (user.role as any).code || 'STUDENT'
      : user?.role || 'STUDENT';

  // Do not show general bottom navigation bar during live test runner exam
  if (pathname.includes('/runner')) {
    return null;
  }

  return (
    <>
      {/* ── MOBILE BOTTOM BAR ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 py-1.5 shadow-2xl flex items-center justify-around">
        {mainTabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                isActive
                  ? 'text-brand-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-brand-50 text-brand-700 scale-110 shadow-sm' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.name}</span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            isMoreOpen ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              isMoreOpen ? 'bg-brand-50 text-brand-700 scale-110' : ''
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* ── MORE SLIDE-UP DRAWER ── */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end">
          {/* Backdrop click to dismiss */}
          <div className="flex-1" onClick={() => setIsMoreOpen(false)} />

          <div className="bg-white rounded-t-3xl border-t border-slate-200 p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                  {user?.fullName ? user.fullName[0] : 'U'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {user?.fullName || 'Examly User'}
                  </h3>
                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 mt-0.5">
                    {roleDisplayName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`p-3 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                      isActive
                        ? 'bg-brand-50/70 border-brand-200 text-brand-900 shadow-sm'
                        : 'bg-slate-50/60 border-slate-200/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</span>
                  </Link>
                );
              })}
            </div>

            {/* Logout Action */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
