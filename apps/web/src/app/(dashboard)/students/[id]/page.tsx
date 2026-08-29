// apps/web/src/app/(dashboard)/students/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Users,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  MessageSquare,
  Award,
  Sparkles,
} from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;

  const [data360, setData360] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudent360 = async () => {
    try {
      const res = await api.get(`/users/students/${studentId}/360`);
      setData360(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudent360();
    }
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = data360?.user;
  const metrics = data360?.metrics || {
    totalAttempts: 0,
    bestPercentage: 0,
    avgPercentage: 0,
    passedCount: 0,
    failedCount: 0,
    passRate: 0,
  };
  const attempts = data360?.attempts || [];

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Student not found.</p>
        <Link href="/students" className="text-brand-600 text-xs font-semibold mt-2 inline-block">
          ← Back to Students Roster
        </Link>
      </div>
    );
  }

  const rollNumber = user.studentProfile?.rollNumber || (user.identifier && !user.identifier.includes('@') ? user.identifier : '-');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students Roster
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName || 'Student'} className="w-full h-full object-cover" />
              ) : (
                user.fullName ? user.fullName[0] : 'S'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{user.fullName}</h1>
                <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-mono text-xs font-bold border border-brand-200">
                  {rollNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enrolled in{' '}
                <span className="font-semibold text-brand-600">
                  {user.studentProfile?.batch?.name || 'Unassigned Batch'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
              user.status === 'ACTIVE'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {user.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* 360 Degree Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Total Tests Taken</span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">{metrics.totalAttempts}</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] text-emerald-600 block font-medium">Best Score</span>
            <span className="text-lg font-extrabold text-emerald-700 font-mono">{metrics.bestPercentage}%</span>
          </div>
          <div className="p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
            <span className="text-[10px] text-brand-600 block font-medium">Average Score</span>
            <span className="text-lg font-extrabold text-brand-700 font-mono">{metrics.avgPercentage}%</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
            <span className="text-[10px] text-purple-600 block font-medium">Pass Rate</span>
            <span className="text-lg font-extrabold text-purple-700 font-mono">{metrics.passRate}%</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Contact Info</span>
            <div className="flex items-center gap-1.5 text-slate-700 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {user.phone || '-'}
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {user.email || '-'}
            </div>
            {user.studentProfile?.parentPhone && (
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Guardian: {user.studentProfile.parentPhone}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Address Location</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {user.studentProfile?.municipality
                  ? `Ward ${user.studentProfile.wardNumber || ''}, ${user.studentProfile.municipality}`
                  : 'Address not recorded'}
              </span>
            </div>
            {user.studentProfile?.district && (
              <span className="text-slate-500 text-[11px] block pl-5">
                {user.studentProfile.district}, {user.studentProfile.province || ''}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Activity & Logins</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Active: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never logged in'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Examination History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-brand-600" /> Live Examination History & Scorecards ({attempts.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-3">Test Title</th>
                <th className="pb-3 text-center">Score</th>
                <th className="pb-3 text-center">Percentage</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right">Submitted Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {attempts.map((att: any) => (
                <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900">
                    <Link href={`/tests/${att.test?.id}`} className="hover:text-brand-600">
                      {att.test?.title || 'Examination Test'}
                    </Link>
                    <span className="block text-[10px] font-normal text-slate-400">
                      {att.test?.durationMinutes}m • Total: {att.test?.totalMarks} Marks
                    </span>
                  </td>
                  <td className="py-3.5 text-center font-mono font-bold text-brand-700">
                    {att.score} / {att.totalMarks}
                  </td>
                  <td className="py-3.5 text-center">
                    <span className={`font-bold font-mono ${
                      (att.percentage || 0) >= 50 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {Math.round(att.percentage || 0)}%
                    </span>
                  </td>
                  <td className="py-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      att.status === 'PASSED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : att.status === 'FAILED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {att.status || 'EVALUATED'}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-slate-400 font-mono text-[11px]">
                    {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}

              {attempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No mock tests taken by this student yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
