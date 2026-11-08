// apps/web/src/components/skeleton.tsx
import React from 'react';
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-2xl ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-[#1E222F] rounded-3xl p-5 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 bg-slate-200 dark:bg-[#1E222F] rounded-md" />
        <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-[#1E222F]" />
      </div>
      <div className="space-y-2">
        <div className="h-8 w-16 bg-slate-200 dark:bg-[#1E222F] rounded-lg" />
        <div className="h-4 w-28 bg-slate-100 dark:bg-[#181B26] rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Banner / Welcome */}
      <div className="bg-slate-200/70 h-32 rounded-3xl" />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div className="h-6 w-36 bg-slate-200 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-20 bg-slate-200 rounded-md" />
            <div className="h-5 w-16 bg-slate-200 rounded-md" />
          </div>
          <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-slate-100 rounded-md" />
            <div className="h-3.5 w-2/3 bg-slate-100 rounded-md" />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="h-4 w-20 bg-slate-200 rounded-md" />
            <div className="h-8 w-24 bg-slate-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="h-5 w-36 bg-slate-200 rounded-md" />
        <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center justify-between gap-4 py-3 border-b border-slate-50">
            <div className="h-4 w-40 bg-slate-200 rounded-md" />
            <div className="h-4 w-24 bg-slate-100 rounded-md" />
            <div className="h-4 w-20 bg-slate-100 rounded-md" />
            <div className="h-5 w-16 bg-slate-200 rounded-full" />
            <div className="h-7 w-20 bg-slate-200 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header card skeleton */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-slate-200 rounded-md" />
            <div className="h-8 w-64 bg-slate-200 rounded-xl" />
            <div className="h-4 w-96 bg-slate-100 rounded-md" />
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Main content table / cards */}
      <TableSkeleton rows={4} />
    </div>
  );
}

export function VideoPlayerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 16:9 Player aspect ratio */}
      <div className="w-full aspect-video bg-slate-900/90 rounded-3xl overflow-hidden border border-slate-800" />
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-sm">
        <div className="h-7 w-2/3 bg-slate-200 rounded-lg" />
        <div className="h-4 w-1/3 bg-slate-100 rounded-md" />
        <div className="flex gap-3 pt-2">
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CommentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3.5 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 bg-slate-200 rounded-md" />
              <div className="h-3 w-16 bg-slate-100 rounded-md" />
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-md" />
            <div className="h-4 w-4/5 bg-slate-100 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Profile360Skeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="h-7 w-48 bg-slate-200 rounded-lg mx-auto sm:mx-0" />
            <div className="h-4 w-32 bg-slate-100 rounded-md mx-auto sm:mx-0" />
            <div className="h-5 w-20 bg-slate-200 rounded-full mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="h-6 w-36 bg-slate-200 rounded-md" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LiveTestSkeleton() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 animate-pulse">
      <div className="lg:col-span-3 space-y-6">
        {/* Test Top Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="h-5 w-40 bg-slate-200 rounded-md" />
          <div className="h-8 w-28 bg-slate-200 rounded-xl" />
        </div>
        {/* Question Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-slate-200 rounded-md" />
            <div className="h-4 w-20 bg-slate-200 rounded-md" />
          </div>
          <div className="h-16 w-full bg-slate-100 rounded-2xl" />
          {/* 4 Options */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-2xl border border-slate-200" />
            ))}
          </div>
        </div>
      </div>
      {/* Question Palette Sidebar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="h-5 w-32 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-5 gap-2.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-white border border-slate-200 rounded-3xl p-6" />
        <div className="h-72 bg-white border border-slate-200 rounded-3xl p-6" />
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'No records found',
  description = 'There is currently no data to display.',
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-sm my-6">
      <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl mb-4 border border-slate-100">
        <Inbox className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An error occurred while communicating with the server.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white border border-red-100 rounded-3xl shadow-sm my-6">
      <div className="p-3 bg-red-50 text-red-500 rounded-2xl mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Request
        </button>
      )}
    </div>
  );
}
