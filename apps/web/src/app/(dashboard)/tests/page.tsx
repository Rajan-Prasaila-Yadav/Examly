// apps/web/src/app/(dashboard)/tests/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  FileCheck2,
  Plus,
  Play,
  Clock,
  Award,
  Sparkles,
  Search,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export default function TestsPortalPage() {
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'PRACTICE'>('ALL');

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await api.get('/tests');
        setTests(res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTests();
  }, []);

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.batch?.name || '').toLowerCase().includes(search.toLowerCase());

    if (filter === 'LIVE') return matchesSearch && t.testStatus === 'LIVE';
    if (filter === 'PRACTICE') return matchesSearch && t.testType === 'PRACTICE';
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isStudent ? 'My Mock Examinations & Practice Tests' : 'Examination & Test Suite'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStudent
              ? 'Attempt scheduled batch mock papers, past-year drills, and chapter evaluations.'
              : 'Create, author KaTeX questions, manage schedules, and review student leaderboards.'}
          </p>
        </div>

        {!isStudent && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/tests/create"
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Test
            </Link>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          {(['ALL', 'LIVE', 'PRACTICE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f === 'ALL' ? 'All Tests' : f === 'LIVE' ? '🔴 Live Exams' : '📚 Practice'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tests or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTests.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 font-mono text-[11px] font-bold border border-brand-200/60">
                  {t.batch?.name || 'General Batch'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    t.testStatus === 'LIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.testStatus === 'LIVE' ? '● LIVE' : t.testStatus}
                </span>
              </div>

              <Link href={`/tests/${t.id}`} className="block">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                  {t.title}
                </h3>
              </Link>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {t.description || 'Full-length examination with timed scoring and anti-cheat protection.'}
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Duration</span>
                  <span className="font-bold text-slate-900 font-mono text-[11px]">{t.durationMinutes}m</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Marks</span>
                  <span className="font-bold text-brand-700 font-mono text-[11px]">{t.totalMarks}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Pass Mark</span>
                  <span className="font-bold text-emerald-600 font-mono text-[11px]">{t.passMarks}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/tests/${t.id}`}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                View Details
              </Link>

              <Link
                href={`/tests/${t.id}/runner`}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Start Test
              </Link>
            </div>
          </div>
        ))}

        {filteredTests.length === 0 && !isLoading && (
          <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
            <FileCheck2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No tests found</h3>
            <p className="text-xs text-slate-500 mt-1">Examinations and chapter drills will appear here once assigned.</p>
          </div>
        )}
      </div>
    </div>
  );
}
