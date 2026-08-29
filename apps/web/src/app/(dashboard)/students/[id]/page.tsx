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

  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudent = async () => {
    try {
      const res = await api.get('/users/students');
      const found = res.data.find((s: any) => s.id === studentId || s.identifier === studentId);
      setStudent(found || res.data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              {student?.fullName ? student.fullName[0] : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{student?.fullName || 'Aarav Sharma'}</h1>
                <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-mono text-xs font-bold border border-brand-200">
                  {student?.studentProfile?.rollNumber || student?.identifier || '12A-034'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enrolled in <span className="font-semibold text-brand-600">{student?.studentProfile?.batch?.name || 'CEE 2026 Batch A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Open Doubt Chat
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Contact Info</span>
            <div className="flex items-center gap-1.5 text-slate-700 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {student?.phone || '+9779876543210'}
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {student?.email || 'aarav@example.com'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Nepal Address</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Ward {student?.studentProfile?.wardNumber || '04'}, {student?.studentProfile?.municipality || 'Kathmandu'}
              </span>
            </div>
            <span className="text-slate-500 text-[11px] block pl-5">
              {student?.studentProfile?.district || 'Kathmandu'}, {student?.studentProfile?.province || 'Bagmati'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Account Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
            </span>
          </div>
        </div>
      </div>

      {/* Examination History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-brand-600" /> Live Examination History & Scorecards
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Test Title</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Accuracy</th>
                <th className="pb-3">Rank</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 font-bold text-slate-900">
                  Full Syllabus Mock 04
                  <span className="block text-[10px] font-normal text-slate-400">80 Qs • CEE Mock</span>
                </td>
                <td className="py-3.5 font-mono font-bold text-brand-700">148 / 200</td>
                <td className="py-3.5">
                  <span className="text-emerald-600 font-bold">74.0%</span> (38 ✔, 4 ✖)
                </td>
                <td className="py-3.5 font-mono font-bold text-amber-600">#3 / 42</td>
                <td className="py-3.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    PASSED
                  </span>
                </td>
                <td className="py-3.5 text-right text-slate-400">2026-08-28</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
