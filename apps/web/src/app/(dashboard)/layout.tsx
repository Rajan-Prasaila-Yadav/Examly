// apps/web/src/app/(dashboard)/layout.tsx
import React from 'react';
import { PrototypeShell } from '@/components/prototype-shell';
import './prototype.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrototypeShell>{children}</PrototypeShell>
  );
}
