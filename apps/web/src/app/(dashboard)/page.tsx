// apps/web/src/app/(dashboard)/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  GraduationCap,
  Users,
  FileCheck2,
  UserSquare2,
  ArrowUpRight,
  Plus,
  Play,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchRes, testRes] = await Promise.all([
          api.get('/batches').catch(() => ({ data: [] })),
          api.get('/tests').catch(() => ({ data: [] })),
        ]);
        setBatches(batchRes.data);
        setTests(testRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      title: 'Active Batches',
      value: batches.length || 1,
      change: '+1 this month',
      icon: GraduationCap,
      color: 'from-blue-500 to-brand-600',
      shadow: 'shadow-blue-500/20',
    },
    {
      title: 'Enrolled Students',
      value: '428',
      change: '+14% growth',
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      title: 'Active Mock Tests',
      value: tests.length || 12,
      change: '4 ongoing live',
      icon: FileCheck2,
      color: 'from-purple-500 to-accent-indigo',
      shadow: 'shadow-purple-500/20',
    },
    {
      title: 'Faculty Instructors',
      value: '18',
      change: '100% verified',
      icon: UserSquare2,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 p-8 text-white shadow-xl shadow-brand-900/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Examination & Learning Engine Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.fullName || 'Administrator'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Monitor real-time student exam attempts, create interactive KaTeX questions with the Split-Pane authoring suite, and manage batch curriculums.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/tests/builder"
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Test
            </Link>
            <Link
              href="/batches"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all"
            >
              <GraduationCap className="w-4 h-4" /> Manage Batches
            </Link>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-600/20 to-transparent pointer-events-none" />
      </div>

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{item.title}</span>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-lg ${item.shadow} group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {item.value}
                </span>
                <span className="text-[11px] font-medium text-emerald-600 flex items-center">
                  {item.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Live Mock Tests & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Live Mock Tests Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent & Live Examinations</h2>
              <p className="text-xs text-slate-500">Live tests conducted across assigned batches</p>
            </div>
            <Link
              href="/tests/builder"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Test Title</th>
                  <th className="pb-3">Batch</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Marks</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 font-semibold text-slate-900">
                    Full Syllabus Mock 04
                    <span className="block text-[10px] font-normal text-slate-400">80 Questions • KaTeX</span>
                  </td>
                  <td className="py-3.5 text-slate-600">CEE 2026 Batch A</td>
                  <td className="py-3.5 text-slate-600">120 mins</td>
                  <td className="py-3.5 font-mono text-slate-800">200 pts</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <Link
                      href="/tests/builder"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 font-medium rounded-lg transition-colors text-[11px]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 font-semibold text-slate-900">
                    Mechanics & Thermodynamics Unit Test
                    <span className="block text-[10px] font-normal text-slate-400">40 Questions • Physics</span>
                  </td>
                  <td className="py-3.5 text-slate-600">CEE 2026 Batch A</td>
                  <td className="py-3.5 text-slate-600">60 mins</td>
                  <td className="py-3.5 font-mono text-slate-800">100 pts</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                      Scheduled
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <Link
                      href="/tests/builder"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 font-medium rounded-lg transition-colors text-[11px]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Quick Action Hub & Batch Snapshot */}
        <div className="space-y-6">
          {/* Active Batches Snapshot */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Active Batches Snapshot</h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">CEE 2026 Batch A</h4>
                  <p className="text-[10px] text-slate-500">4 Subjects • 120 Students</p>
                </div>
                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[10px] font-bold rounded-md">
                  NPR 14,999
                </span>
              </div>
            </div>
            <Link
              href="/batches"
              className="mt-4 block w-full py-2 text-center text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
            >
              + Create New Batch
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
