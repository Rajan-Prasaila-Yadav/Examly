// apps/web/src/components/skeleton.tsx
import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-2xl ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 bg-slate-200 rounded-md" />
        <div className="w-10 h-10 rounded-xl bg-slate-200" />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-16 bg-slate-200 rounded-lg" />
        <div className="h-3 w-28 bg-slate-100 rounded-md" />
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

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
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
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="h-4 w-28 bg-slate-200 rounded-md" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="h-7 w-48 bg-slate-200 rounded-lg" />
                <div className="h-5 w-16 bg-slate-200 rounded-md" />
              </div>
              <div className="h-4 w-72 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-slate-200 rounded-xl" />
            <div className="h-9 w-32 bg-slate-200 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
          <div className="h-16 bg-slate-100 rounded-2xl" />
          <div className="h-16 bg-slate-100 rounded-2xl" />
          <div className="h-16 bg-slate-100 rounded-2xl" />
          <div className="h-16 bg-slate-100 rounded-2xl" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <div className="h-10 w-36 bg-slate-200 rounded-t-2xl" />
        <div className="h-10 w-36 bg-slate-100 rounded-t-2xl" />
        <div className="h-10 w-36 bg-slate-100 rounded-t-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="h-48 bg-slate-100 rounded-3xl border border-slate-200" />
        <div className="h-48 bg-slate-100 rounded-3xl border border-slate-200" />
        <div className="h-48 bg-slate-100 rounded-3xl border border-slate-200" />
      </div>
    </div>
  );
}
