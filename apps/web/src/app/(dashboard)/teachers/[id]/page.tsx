// apps/web/src/app/(dashboard)/teachers/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  UserSquare2,
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Save,
  Check,
  BookOpen,
  Sparkles,
  Layers,
  GraduationCap,
  Calendar,
  FileCheck2,
} from 'lucide-react';
import { Profile360Skeleton } from '@/components/skeleton';

export default function TeacherDetailPage() {
  const params = useParams();
  const teacherId = params.id as string;

  const [data360, setData360] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Per-Teacher Custom Permissions
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    'tests.create': true,
    'tests.publish': true,
    'videos.create': true,
    'notes.create': true,
    'students.read': true,
    'community.create': true,
  });

  const fetchTeacher360 = async () => {
    try {
      const res = await api.get(`/users/teachers/${teacherId}/360`);
      setData360(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) {
      fetchTeacher360();
    }
  }, [teacherId]);

  useEffect(() => {
    if (data360) {
      const defaultKeys = [
        'tests.create',
        'tests.publish',
        'videos.create',
        'notes.create',
        'students.read',
        'community.create',
      ];
      const initial: Record<string, boolean> = {};
      const eff = new Set(data360.effectivePermissions || []);
      for (const k of defaultKeys) {
        if (data360.grants && data360.grants[k] !== undefined) {
          initial[k] = data360.grants[k];
        } else {
          initial[k] = eff.has('*.*') || eff.has(k);
        }
      }
      setPermissions(initial);
    }
  }, [data360]);

  const handleToggle = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePermissions = async () => {
    try {
      setIsSaving(true);
      await api.put(`/users/teachers/${teacherId}/permissions`, {
        permissions,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      fetchTeacher360();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Profile360Skeleton />;
  }

  const teacher = data360?.user;

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Teacher not found.</p>
        <Link href="/teachers" className="text-brand-600 text-xs font-semibold mt-2 inline-block">
          ← Back to Faculty Teachers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/teachers"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Faculty Teachers
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt={teacher.fullName}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                {teacher.fullName ? teacher.fullName[0] : 'T'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{teacher.fullName}</h1>
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-xs font-bold border border-purple-200">
                  {teacher.teacherProfile?.facultyCode || (teacher.identifier && !teacher.identifier.includes('@') ? teacher.identifier : '-')}
                </span>
              </div>
              <p className="text-xs text-brand-600 font-semibold mt-1">
                {teacher.teacherProfile?.designation || 'Faculty Member'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                teacher.status === 'ACTIVE'
                  ? 'text-emerald-600 bg-emerald-50 border-emerald-200/60'
                  : 'text-rose-600 bg-rose-50 border-rose-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {teacher.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* Stats KPI Row */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Layers className="w-4 h-4 text-brand-600" />
              <span>Assigned Batches</span>
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">
              {data360?.assignedBatches?.length || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Classes Scheduled</span>
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">
              {data360?.teachingClassesCount || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <FileCheck2 className="w-4 h-4 text-purple-600" />
              <span>Tests Managed</span>
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">
              {data360?.testsCreatedCount || 0}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-medium block">Contact Info</span>
            <div className="flex items-center gap-2 text-slate-700 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {teacher.phone || '-'}
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {teacher.email || '-'}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-medium block">Specialization Areas</span>
            <div className="flex flex-wrap gap-1.5">
              {(teacher.teacherProfile?.specialization || ['Curriculum Expert', 'Mock Evaluation']).map((s: string) => (
                <span key={s} className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Batches List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-600" /> Assigned Batches
        </h2>
        {(!data360?.assignedBatches || data360.assignedBatches.length === 0) ? (
          <p className="text-xs text-slate-400 italic">No batches assigned to this faculty member yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data360.assignedBatches.map((batch: any) => (
              <div
                key={batch.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{batch.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{batch.code}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  {batch._count?.students || 0} students
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Granular Permission Overrides Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600" /> Per-Teacher Permission Overrides
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Override base role rights specifically for {teacher.fullName}.
            </p>
          </div>

          <button
            onClick={handleSavePermissions}
            disabled={isSaving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {isSaved ? 'Saved!' : isSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { key: 'tests.create', label: 'Create & Author Live Tests', desc: 'Can author mock tests in assigned batches' },
            { key: 'tests.publish', label: 'Publish Tests to Students', desc: 'Can toggle test visibility to live' },
            { key: 'videos.create', label: 'Upload Video Lectures', desc: 'Can attach YouTube or R2 video files' },
            { key: 'notes.create', label: 'Upload PDF Notes', desc: 'Can upload PDF handouts and formula sheets' },
            { key: 'students.read', label: 'View Student Scores', desc: 'Can view student rosters and scorecard ranks' },
            { key: 'community.create', label: 'Post Community Announcements', desc: 'Can publish feed updates and batch polls' },
          ].map((perm) => (
            <label
              key={perm.key}
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                permissions[perm.key]
                  ? 'bg-brand-50/50 border-brand-200'
                  : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={permissions[perm.key] || false}
                onChange={() => handleToggle(perm.key)}
                className="mt-0.5 w-4 h-4 rounded text-brand-600"
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block">{perm.label}</span>
                <span className="text-[10px] text-slate-500">{perm.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
