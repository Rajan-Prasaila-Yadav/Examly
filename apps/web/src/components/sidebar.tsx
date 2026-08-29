// apps/web/src/components/sidebar.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  FileCheck2,
  Users,
  UserSquare2,
  MessageSquare,
  ShieldCheck,
  FolderTree,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [width, setWidth] = useState(260);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);

  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard, desc: 'Dashboard & live stats', show: true },
    { name: isStudent ? 'My Batches' : 'Batches & Classes', href: '/batches', icon: GraduationCap, desc: 'Academic batches & groups', show: true },
    { name: 'Curriculum & Content', href: '/curriculum', icon: FolderTree, desc: '4-tier academic tree', show: true },
    { name: isStudent ? 'My Mock Tests' : 'Test Suite & Builder', href: isStudent ? '/tests' : '/tests/builder', icon: FileCheck2, highlight: !isStudent, desc: isStudent ? 'Take & review tests' : 'Split-pane KaTeX question creator', show: true },
    { name: 'Students', href: '/students', icon: Users, desc: 'Enrolled student roster', show: !isStudent },
    { name: 'Faculty Teachers', href: '/teachers', icon: UserSquare2, desc: 'Faculty & staff accounts', show: !isStudent },
    { name: 'Community Wall', href: '/community', icon: MessageSquare, desc: 'Announcements & batch polls', show: true },
    { name: 'Role & Permissions', href: '/settings/roles', icon: ShieldCheck, desc: 'Dynamic RBAC matrix', show: !isStudent },
  ].filter((item) => item.show);

  // Dragging logic to resize sidebar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = Math.max(72, Math.min(380, e.clientX));
      if (newWidth < 120) {
        setIsCollapsed(true);
        setWidth(72);
      } else {
        setIsCollapsed(false);
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setWidth(260);
    } else {
      setIsCollapsed(true);
      setWidth(72);
    }
  };

  const roleDisplayName =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as any).name || (user.role as any).code || 'SUPER_ADMIN'
      : user?.role || 'SUPER_ADMIN';

  return (
    <aside
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className={`hidden md:flex relative bg-slate-900 text-white flex-col shrink-0 border-r border-slate-800 select-none transition-[width] duration-100 ease-out z-40 ${
        isDragging ? 'transition-none' : ''
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo flex items-center justify-center font-extrabold text-white shadow-lg shadow-brand-500/20 text-lg shrink-0">
            E
          </div>
          {!isCollapsed && (
            <div className="min-w-0 overflow-hidden">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent block truncate">
                Examly
              </span>
              <span className="block text-[10px] font-medium tracking-wider text-brand-400 uppercase truncate">
                Enterprise Suite
              </span>
            </div>
          )}
        </div>

        {/* Quick Collapse/Expand Button */}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <div key={item.name} className="relative group">
              <Link
                href={item.href}
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
                onTouchStart={() => setHoveredTab(item.name)}
                onTouchEnd={() => setTimeout(() => setHoveredTab(null), 1500)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.highlight && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-accent-purple text-white rounded-md flex items-center gap-1 shadow-sm shrink-0">
                        <Sparkles className="w-2.5 h-2.5" /> Split
                      </span>
                    )}
                  </>
                )}
              </Link>

              {/* Touch & Hover Floating Tooltip on Collapsed Mode */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-md border border-slate-700 text-white text-xs rounded-xl shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all z-50 whitespace-nowrap">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {item.highlight && (
                      <span className="px-1 py-0.2 bg-purple-600 text-[9px] rounded">KaTeX</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal">{item.desc}</p>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Card & Logout */}
      <div className="p-2.5 border-t border-slate-800">
        <div className="p-2 rounded-xl bg-slate-800/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center font-bold text-xs uppercase text-white shrink-0">
              {user?.fullName ? user.fullName[0] : 'R'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'Rajan Prasaila'}</p>
                <p className="text-[10px] text-slate-400 truncate">{String(roleDisplayName)}</p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resizable Draggable Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-1.5 hover:w-2 hover:bg-brand-500/60 cursor-col-resize transition-all ${
          isDragging ? 'bg-brand-500 w-2' : 'bg-transparent'
        }`}
        title="Drag to resize sidebar width"
      />
    </aside>
  );
}
