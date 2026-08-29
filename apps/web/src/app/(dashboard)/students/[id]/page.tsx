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
  Calendar,
  ChevronRight,
  Eye,
  X,
  ArrowRight,
  Layers,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';

export default function StudentDetailPage() {
  const params = useParams();
  const { user: authUser } = useAuth();
  const rawId = params.id as string;
  const isStudent =
    authUser?.role === 'STUDENT' ||
    authUser?.role === 'Student' ||
    (typeof authUser?.role === 'object' && ((authUser.role as any)?.name === 'STUDENT' || (authUser.role as any)?.code === 'STUDENT'));

  const studentId = (!rawId || rawId === 'me' || rawId === 'undefined') ? authUser?.id : rawId;

  const [data360, setData360] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Batch assignment modal for Super Admin / Admin
  const [batches, setBatches] = useState<any[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchStudent360 = async () => {
    try {
      const targetId = studentId || authUser?.id || 'me';
      const [res, batchesRes] = await Promise.all([
        api.get(`/users/students/${targetId}/360`).catch(async () => {
          // Fallback: fetch current logged in profile
          const meRes = await api.get('/auth/me');
          if (meRes.data) {
            return {
              data: {
                user: meRes.data,
                studentProfile: meRes.data.studentProfile,
                metrics: {
                  totalAttempts: meRes.data.testAttempts?.length || 0,
                  bestPercentage: 0,
                  avgPercentage: 0,
                  passedCount: 0,
                  failedCount: 0,
                  passRate: 0,
                },
                recentAttempts: meRes.data.testAttempts || [],
              },
            };
          }
          return null;
        }),
        !isStudent ? api.get('/batches').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      if (res?.data) {
        setData360(res.data);
      }
      if (batchesRes?.data) {
        setBatches(batchesRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studentId || authUser?.id) {
      fetchStudent360();
    } else if (!authUser && !studentId) {
      setIsLoading(false);
    }
  }, [studentId, authUser?.id]);

  const handleConfirmBatchChange = async () => {
    if (!targetBatchId || !user?.id) return;
    try {
      setIsAssigning(true);
      await api.put(`/users/students/${user.id}/batch`, { batchId: targetBatchId });
      alert('Student assigned to batch successfully!');
      setIsBatchModalOpen(false);
      fetchStudent360();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update batch');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = data360?.user || authUser;
  const studentProfile = data360?.studentProfile || user?.studentProfile || authUser?.studentProfile;
  const batch = studentProfile?.batch || studentProfile?.batchInfo;
  const batchName = batch?.name || 'CEE 2026 Medical Entrance Batch';

  const metrics = data360?.metrics || {
    totalAttempts: 0,
    bestPercentage: 0,
    avgPercentage: 0,
    passedCount: 0,
    failedCount: 0,
    passRate: 0,
  };
  const attempts = data360?.recentAttempts || data360?.attempts || [];

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Student not found.</p>
        <Link href={isStudent ? '/' : '/students'} className="text-brand-600 text-xs font-semibold mt-2 inline-block">
          ← {isStudent ? 'Back to Dashboard' : 'Back to Students Roster'}
        </Link>
      </div>
    );
  }

  const rollNumber = studentProfile?.rollNumber || (user.identifier && !user.identifier.includes('@') ? user.identifier : 'STU-2026');

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 sm:px-0">
      <Link
        href={isStudent ? '/' : '/students'}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {isStudent ? 'Back to Learning Dashboard' : 'Back to Students Roster'}
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-extrabold text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName || 'Student'} className="w-full h-full object-cover" />
              ) : (
                user.fullName ? user.fullName[0] : 'S'
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">{user.fullName}</h1>
                <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-mono text-[11px] font-bold border border-brand-200">
                  {rollNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-slate-500">
                  Enrolled in <span className="font-semibold text-brand-600">{batchName}</span>
                </p>
                {!isStudent && (
                  <button
                    onClick={() => {
                      setTargetBatchId(studentProfile?.batchId || batches[0]?.id || '');
                      setIsBatchModalOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold border border-brand-200 transition-colors flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3 text-brand-600" /> Assign / Change Batch
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Total Tests Taken</span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono">{metrics.totalAttempts}</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] text-emerald-600 block font-medium">Best Score</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono">{metrics.bestPercentage}%</span>
          </div>
          <div className="p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
            <span className="text-[10px] text-brand-600 block font-medium">Average Score</span>
            <span className="text-base sm:text-lg font-extrabold text-brand-700 font-mono">{metrics.avgPercentage}%</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
            <span className="text-[10px] text-purple-600 block font-medium">Pass Rate</span>
            <span className="text-base sm:text-lg font-extrabold text-purple-700 font-mono">{metrics.passRate}%</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Contact Info</span>
            <div className="flex items-center gap-1.5 text-slate-700 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {user.phone || '-'}
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {user.email || '-'}
            </div>
            {studentProfile?.parentPhone && (
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Guardian: {studentProfile.parentPhone}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Address Location</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {studentProfile?.municipality
                  ? `Ward ${studentProfile.wardNumber || '04'}, ${studentProfile.municipality}`
                  : 'Kathmandu, Nepal'}
              </span>
            </div>
            {studentProfile?.district && (
              <span className="text-slate-500 text-[11px] block pl-5">
                {studentProfile.district}, {studentProfile.province || 'Bagmati'}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Activity & Logins</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Active: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Active Today'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUPERADMIN / ADMIN ASSIGN BATCH MODAL ── */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assign / Change Batch</h3>
                  <p className="text-[11px] text-slate-500">{user.fullName} • Roll: {rollNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Select Active Academic Batch *</label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {batches.map((b) => {
                  const isSelected = targetBatchId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setTargetBatchId(b.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{b.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                            {b.code}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{b.description || 'Full syllabus batch'}</p>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetBatchId || isAssigning}
                onClick={handleConfirmBatchChange}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {isAssigning ? 'Assigning...' : 'Confirm Assignment'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Examination History & Scorecards */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-brand-600" /> Live Examination History & Scorecards ({attempts.length})
        </h2>

        {/* ── MOBILE VIEW: Touch-Friendly Responsive Attempt Cards ── */}
        <div className="space-y-3 md:hidden">
          {attempts.map((att: any) => {
            const targetTestId = att.testId || att.test?.id;
            const isPass = att.isPassed || att.status === 'PASSED' || (att.percentage || 0) >= 50;
            return (
              <div
                key={att.id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/tests/${targetTestId}`} className="font-bold text-slate-900 hover:text-brand-600 text-xs line-clamp-1">
                      {att.testTitle || att.test?.title || 'Examination Test'}
                    </Link>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Attempt #{att.attemptNumber || 1} • {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'Completed'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                    isPass
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {isPass ? '✔ PASSED' : '✖ FAILED'}
                  </span>
                </div>

                {/* Score & Percentage Bar */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">Score</span>
                    <span className="font-bold text-brand-700 font-mono text-xs">
                      {att.score} / {att.totalMarks || att.test?.totalMarks || 200}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">Percentage</span>
                    <span className={`font-bold font-mono text-xs ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {Math.round(att.percentage || 0)}%
                    </span>
                  </div>
                </div>

                {/* Direct Action Button */}
                <Link
                  href={`/tests/${targetTestId}/runner?view=REVIEW`}
                  className="w-full py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl border border-brand-200/80 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-600" /> Review Answers & Step Solutions →
                </Link>
              </div>
            );
          })}

          {attempts.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No mock tests taken by this student yet.
            </div>
          )}
        </div>

        {/* ── DESKTOP VIEW: Sleek Table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-3">Test Title</th>
                <th className="pb-3 text-center">Score</th>
                <th className="pb-3 text-center">Percentage</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right">Submitted Date</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {attempts.map((att: any) => {
                const targetTestId = att.testId || att.test?.id;
                const isPass = att.isPassed || att.status === 'PASSED' || (att.percentage || 0) >= 50;
                return (
                  <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900">
                      <Link href={`/tests/${targetTestId}`} className="hover:text-brand-600">
                        {att.testTitle || att.test?.title || 'Examination Test'}
                      </Link>
                      <span className="block text-[10px] font-normal text-slate-400">
                        Attempt #{att.attemptNumber || 1} • Total: {att.totalMarks || att.test?.totalMarks || 200} Marks
                      </span>
                    </td>
                    <td className="py-3.5 text-center font-mono font-bold text-brand-700">
                      {att.score} / {att.totalMarks || att.test?.totalMarks || 200}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`font-bold font-mono ${
                        isPass ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {Math.round(att.percentage || 0)}%
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isPass
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isPass ? '✔ PASSED' : '✖ FAILED'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-slate-400 font-mono text-[11px]">
                      {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/tests/${targetTestId}/runner?view=REVIEW`}
                        className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-[11px] border border-brand-200 inline-flex items-center gap-1 transition-colors"
                      >
                        Review Solutions
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {attempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
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
