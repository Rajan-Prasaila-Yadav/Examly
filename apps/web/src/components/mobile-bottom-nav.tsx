'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  FileCheck2,
  BookOpen,
  User,
  MoreHorizontal,
  Video,
  MessageSquare,
  Users,
  UserSquare2,
  FolderTree,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  Sparkles,
  Download,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePwa } from '@/components/pwa-install';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { promptInstall, isStandalone } = usePwa();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' &&
      ((user.role as any)?.name === 'STUDENT' ||
        (user.role as any)?.code === 'STUDENT'));

  // Profile link based on user role
  const profileHref = isStudent && user?.id ? `/students/${user.id}` : '/settings';

  const mainTabs = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Batches', href: '/batches', icon: Layers },
    { name: 'Tests', href: isStudent ? '/tests' : '/tests/builder', icon: FileCheck2 },
    { name: 'Notes', href: '/notes', icon: BookOpen },
    { name: 'Profile', href: profileHref, icon: User },
  ];

  const moreItems = [
    { name: 'Videos', href: '/videos', icon: Video, desc: 'Lectures and class recordings', show: true },
    { name: 'Curriculum', href: '/curriculum', icon: FolderTree, desc: 'Subjects and lesson structure', show: true },
    { name: 'Community', href: '/community', icon: MessageSquare, desc: 'Discussions and institute feed', show: true },
    { name: 'Students', href: '/students', icon: Users, desc: 'Enrolled student roster', show: !isStudent },
    { name: 'Teachers', href: '/teachers', icon: UserSquare2, desc: 'Faculty & teacher profiles', show: !isStudent },
    { name: 'Roles & Access', href: '/settings/roles', icon: ShieldCheck, desc: 'Permissions and RBAC matrix', show: !isStudent },
    { name: 'Settings', href: '/settings', icon: Settings, desc: 'Profile and institute preferences', show: true },
  ].filter((item) => item.show);

  const roleDisplayName =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as any).name || (user.role as any).code || 'STUDENT'
      : user?.role || 'STUDENT';

  // Do not show bottom navigation bar during live test runner exam
  if (pathname.includes('/runner')) {
    return null;
  }

  return (
    <>
      {/* ── MOBILE BOTTOM BAR ── */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c0e17]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-2 py-1 shadow-2xl flex items-center justify-around safe-bottom"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
      >
        {mainTabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href.split('?')[0]);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 scale-105 shadow-xs'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {tab.name}
              </span>
            </Link>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isMoreOpen
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="More navigation options"
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              isMoreOpen
                ? 'bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 scale-105'
                : ''
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">More</span>
        </button>
      </nav>

      {/* ── MORE SLIDE-UP DRAWER ── */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-150">
          {/* Backdrop click to dismiss */}
          <div className="flex-1" onClick={() => setIsMoreOpen(false)} />

          <div className="bg-white dark:bg-[#0c0e17] rounded-t-3xl border-t border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 text-slate-900 dark:text-white">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-extrabold text-sm flex items-center justify-center shadow-md overflow-hidden">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.fullName ? (
                    user.fullName[0]
                  ) : (
                    'U'
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {user?.fullName || 'Examly User'}
                  </h3>
                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 mt-0.5">
                    {roleDisplayName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Install App Banner inside drawer */}
            {!isStandalone && (
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  promptInstall();
                }}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold flex items-center justify-between shadow-lg shadow-brand-500/20 active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold leading-tight">Install Examly App</p>
                    <p className="text-[10px] text-white/80 font-normal">
                      Full screen, offline tests & instant launch
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-white/20 text-[10px] font-bold">
                  Install
                </span>
              </button>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 gap-2">
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
                        ? 'bg-brand-50/70 border-brand-200 text-brand-900 dark:bg-brand-500/15 dark:border-brand-500/30 dark:text-brand-200 shadow-xs'
                        : 'bg-slate-50/80 dark:bg-white/5 border-slate-200/70 dark:border-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-xl ${
                          isActive
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.desc}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Logout Action */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
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
