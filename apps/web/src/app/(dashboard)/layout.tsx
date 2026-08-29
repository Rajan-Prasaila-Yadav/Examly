// apps/web/src/app/(dashboard)/layout.tsx
import React from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
