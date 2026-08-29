// apps/web/src/app/not-found.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">404 — Page Not Found</h1>
        <p className="text-xs text-slate-500">
          The page or resource you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
