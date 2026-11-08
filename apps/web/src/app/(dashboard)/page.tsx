// apps/web/src/app/(dashboard)/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatCardSkeleton } from '@/components/skeleton';
import {
  GraduationCap,
  Users,
  FileCheck2,
  UserSquare2,
  Plus,
  Play,
  ChevronRight,
  BookOpen,
  Eye,
  Award,
  BarChart3,
  Edit2,
  Video,
  FileText,
  ShieldCheck,
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user } = useAuth();

  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' &&
      ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const isTeacher =
    user?.role === 'TEACHER' ||
    user?.role === 'Teacher' ||
    (typeof user?.role === 'object' &&
      ((user.role as any)?.name === 'TEACHER' || (user.role as any)?.code === 'TEACHER'));

  // Data States
  const [batches, setBatches] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [teachersCount, setTeachersCount] = useState<number>(0);
  const [student360, setStudent360] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [batchError, setBatchError] = useState('');

  // Interactive UI Filters & Search
  const [batchSearch, setBatchSearch] = useState('');
  const [testFilter, setTestFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    let version = 0;
    setBatches([]);
    setTests([]);
    setStudentsCount(0);
    setTeachersCount(0);
    setStudent360(null);

    const fetchData = async (force = false) => {
      const current = ++version;
      setIsLoading(true);
      setBatchError('');
      const config = { bypassCache: force, timeout: 30000 };

      const results = await Promise.allSettled([
        api.get('/batches', config),
        api.get('/tests', config),
        !isStudent ? api.get('/users/students', config) : Promise.resolve({ data: [] }),
        !isStudent ? api.get('/users/teachers', config) : Promise.resolve({ data: [] }),
        isStudent ? api.get(`/users/students/${user.id}/360`, config) : Promise.resolve({ data: null }),
      ]);

      if (!active || current !== version) return;

      const value = (i: number) =>
        results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value.data : null;

      if (results[0].status === 'rejected') {
        setBatchError(
          (results[0] as PromiseRejectedResult).reason?.response?.status === 403
            ? 'Your role does not have permission to view batches. Ask your administrator to enable Batches: Read.'
            : 'Could not load your batches. Please retry.',
        );
      }

      setBatches(value(0) || []);
      setTests(value(1) || []);
      setStudentsCount(value(2)?.length || 0);
      setTeachersCount(value(3)?.length || 0);
      setStudent360(value(4));
      setIsLoading(false);
    };

    const refresh = () => {
      void fetchData(true);
    };

    void fetchData();
    window.addEventListener('focus', refresh);
    window.addEventListener('examly-permissions-changed', refresh);
    window.addEventListener('examly-refresh-dashboard', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('examly-permissions-changed', refresh);
      window.removeEventListener('examly-refresh-dashboard', refresh);
    };
  }, [isStudent, user?.id]);

  const isTestEnded = (t: any) => {
    if (t.testStatus === 'EXPIRED' || t.testStatus === 'ENDED' || t.testStatus === 'COMPLETED') {
      return true;
    }
    if (t.endDateTime && new Date(t.endDateTime).getTime() < Date.now()) {
      return true;
    }
    return false;
  };

  const totalCurriculumSubjects = batches.reduce(
    (acc, b) => acc + (b.subjects?.length || b._count?.subjects || 0),
    0,
  );

  const liveTestsCount = tests.filter(
    (t) => (t.testStatus === 'LIVE' || t.isPublished) && !isTestEnded(t),
  ).length;

  // Filtered batches with real search query
  const filteredBatches = useMemo(() => {
    const q = batchSearch.toLowerCase().trim();
    if (!q) return batches;
    return batches.filter((b) => {
      return (
        b.name?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        (b.subjects || []).some((s: any) => s.name?.toLowerCase().includes(q))
      );
    });
  }, [batches, batchSearch]);

  // Filtered tests with status tabs
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const ended = isTestEnded(t);
      const draft = t.testStatus === 'DRAFT' || !t.isPublished;
      const isLive = !ended && !draft;
      const hasAttempted = t.attempts && t.attempts.length > 0;

      if (testFilter === 'LIVE') return isLive;
      if (testFilter === 'UPCOMING') return !ended && !isLive && !draft;
      if (testFilter === 'COMPLETED') return ended || hasAttempted;
      return true;
    });
  }, [tests, testFilter]);

  // Student Metrics (100% Real API Data)
  const studentStats = [
    {
      title: 'Enrolled Courses',
      value: String(batches.length),
      change: isLoading ? 'Loading…' : batches.length > 0 ? 'Active Access' : 'No Enrolled Courses',
      icon: GraduationCap,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      href: '/batches',
    },
    {
      title: 'Mock Examinations',
      value: String(tests.length),
      change: `${liveTestsCount} Live Now`,
      icon: FileCheck2,
      color: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/20',
      href: '/tests',
    },
    {
      title: 'Curriculum Subjects',
      value: String(totalCurriculumSubjects),
      change: 'Study Materials',
      icon: BookOpen,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      href: '/curriculum',
    },
    {
      title: 'Performance Score',
      value:
        student360?.metrics?.avgPercentage !== undefined
          ? `${Math.round(student360.metrics.avgPercentage)}%`
          : `${student360?.metrics?.totalAttempts || 0} Taken`,
      change:
        student360?.metrics?.passRate !== undefined
          ? `${Math.round(student360.metrics.passRate)}% Pass Rate`
          : '360 Analytics',
      icon: Award,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      href: user?.id ? `/students/${user.id}` : '/students',
    },
  ];

  // Faculty Metrics
  const teacherStats = [
    {
      title: 'Active Batches',
      value: String(batches.length),
      change: `${batches.filter((b) => b.status === 'ACTIVE').length} Active`,
      icon: GraduationCap,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      href: '/batches',
    },
    {
      title: 'Assigned Learners',
      value: String(studentsCount),
      change: 'Enrolled in Batches',
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      href: '/students',
    },
    {
      title: 'Mock Examinations',
      value: String(tests.length),
      change: `${liveTestsCount} Live Ongoing`,
      icon: FileCheck2,
      color: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/20',
      href: '/tests/builder',
    },
    {
      title: 'Teaching Subjects',
      value: String(totalCurriculumSubjects),
      change: 'Curriculum Units',
      icon: BookOpen,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      href: '/curriculum',
    },
  ];

  // Admin Metrics
  const adminStats = [
    {
      title: 'Total Batches',
      value: String(batches.length),
      change: `${batches.filter((b) => b.status === 'ACTIVE').length} Active`,
      icon: GraduationCap,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      href: '/batches',
    },
    {
      title: 'Enrolled Students',
      value: String(studentsCount),
      change: 'Active Learners',
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      href: '/students',
    },
    {
      title: 'Mock Examinations',
      value: String(tests.length),
      change: `${liveTestsCount} Live Ongoing`,
      icon: FileCheck2,
      color: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/20',
      href: '/tests/builder',
    },
    {
      title: 'Faculty Instructors',
      value: String(teachersCount),
      change: 'Verified Faculty',
      icon: UserSquare2,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      href: '/teachers',
    },
  ];

  const activeStats = isStudent ? studentStats : isTeacher ? teacherStats : adminStats;

  // Clean, High-Contrast Launchpad Capabilities
  const quickCategories = useMemo(() => {
    if (isStudent) {
      return [
        {
          id: 'batches',
          label: 'My Courses',
          subtitle: `${batches.length} Enrolled`,
          icon: GraduationCap,
          href: '/batches',
          iconColor: 'text-blue-500 dark:text-blue-400',
        },
        {
          id: 'tests',
          label: 'Mock Tests',
          subtitle: `${liveTestsCount} Live Now`,
          icon: FileCheck2,
          href: '/tests',
          iconColor: 'text-rose-500 dark:text-rose-400',
        },
        {
          id: 'videos',
          label: 'Video Lectures',
          subtitle: 'HD Classes',
          icon: Video,
          href: '/videos',
          iconColor: 'text-purple-500 dark:text-purple-400',
        },
        {
          id: 'notes',
          label: 'Lecture Notes',
          subtitle: 'PDF Downloads',
          icon: FileText,
          href: '/notes',
          iconColor: 'text-emerald-500 dark:text-emerald-400',
        },
        {
          id: 'curriculum',
          label: 'Subjects',
          subtitle: `${totalCurriculumSubjects} Topics`,
          icon: BookOpen,
          href: '/curriculum',
          iconColor: 'text-amber-500 dark:text-amber-400',
        },
        {
          id: 'analytics',
          label: 'My Performance',
          subtitle: '360 Analytics',
          icon: BarChart3,
          href: user?.id ? `/students/${user.id}` : '/students',
          iconColor: 'text-indigo-500 dark:text-indigo-400',
        },
        {
          id: 'community',
          label: 'Discussion',
          subtitle: 'Doubt Q&A',
          icon: MessageSquare,
          href: '/community',
          iconColor: 'text-teal-500 dark:text-teal-400',
        },
      ];
    } else if (isTeacher) {
      return [
        {
          id: 'create-test',
          label: 'Create Test',
          subtitle: 'KaTeX & Sections',
          icon: Plus,
          href: '/tests/create',
          iconColor: 'text-brand-500 dark:text-brand-400',
        },
        {
          id: 'test-builder',
          label: 'Test Suite',
          subtitle: `${tests.length} Papers`,
          icon: FileCheck2,
          href: '/tests/builder',
          iconColor: 'text-purple-500 dark:text-purple-400',
        },
        {
          id: 'batches',
          label: 'Assigned Batches',
          subtitle: `${batches.length} Classes`,
          icon: GraduationCap,
          href: '/batches',
          iconColor: 'text-blue-500 dark:text-blue-400',
        },
        {
          id: 'upload-video',
          label: 'Upload Video',
          subtitle: 'Lectures',
          icon: Video,
          href: '/videos',
          iconColor: 'text-rose-500 dark:text-rose-400',
        },
        {
          id: 'upload-notes',
          label: 'Upload Notes',
          subtitle: 'Study Material',
          icon: FileText,
          href: '/notes',
          iconColor: 'text-emerald-500 dark:text-emerald-400',
        },
        {
          id: 'students',
          label: 'My Students',
          subtitle: `${studentsCount} Learners`,
          icon: Users,
          href: '/students',
          iconColor: 'text-amber-500 dark:text-amber-400',
        },
        {
          id: 'community',
          label: 'Q&A Forum',
          subtitle: 'Solve Doubts',
          icon: MessageSquare,
          href: '/community',
          iconColor: 'text-indigo-500 dark:text-indigo-400',
        },
      ];
    } else {
      return [
        {
          id: 'manage-batches',
          label: 'Batches',
          subtitle: `${batches.length} Active`,
          icon: GraduationCap,
          href: '/batches',
          iconColor: 'text-blue-500 dark:text-blue-400',
        },
        {
          id: 'manage-tests',
          label: 'Examinations',
          subtitle: `${tests.length} Authored`,
          icon: FileCheck2,
          href: '/tests/builder',
          iconColor: 'text-purple-500 dark:text-purple-400',
        },
        {
          id: 'manage-students',
          label: 'Students Roster',
          subtitle: `${studentsCount} Enrolled`,
          icon: Users,
          href: '/students',
          iconColor: 'text-emerald-500 dark:text-emerald-400',
        },
        {
          id: 'manage-teachers',
          label: 'Faculty Roster',
          subtitle: `${teachersCount} Instructors`,
          icon: UserSquare2,
          href: '/teachers',
          iconColor: 'text-amber-500 dark:text-amber-400',
        },
        {
          id: 'curriculum',
          label: 'Curriculum Tree',
          subtitle: 'Subjects & Units',
          icon: BookOpen,
          href: '/curriculum',
          iconColor: 'text-indigo-500 dark:text-indigo-400',
        },
        {
          id: 'roles',
          label: 'Role Permissions',
          subtitle: 'RBAC Security',
          icon: ShieldCheck,
          href: '/settings/roles',
          iconColor: 'text-rose-500 dark:text-rose-400',
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          subtitle: 'System Logs',
          icon: ShieldCheck,
          href: '/settings/audit',
          iconColor: 'text-slate-500 dark:text-slate-400',
        },
      ];
    }
  }, [
    isStudent,
    isTeacher,
    batches.length,
    liveTestsCount,
    totalCurriculumSubjects,
    tests.length,
    studentsCount,
    teachersCount,
    user?.id,
  ]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      {batchError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-700 dark:text-red-300 flex items-center justify-between"
        >
          <span>{batchError}</span>
          <button
            className="underline font-bold cursor-pointer"
            onClick={() => window.dispatchEvent(new Event('examly-refresh-dashboard'))}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 1. QUICK CAPABILITIES LAUNCHPAD ── */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {quickCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              href={cat.href}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#191A30] border border-slate-200/80 dark:border-[#2A2C4A] hover:border-brand-500/60 dark:hover:border-brand-500/60 hover:shadow-md hover:scale-[1.02] transition-all flex flex-col items-center justify-center text-center group cursor-pointer shadow-xs"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#131428] border border-slate-100 dark:border-[#2A2C4A] flex items-center justify-center shadow-xs mb-2 group-hover:scale-110 transition-transform ${cat.iconColor}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-[#ECECFA] text-xs truncate max-w-full">
                {cat.label}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#9A9DBD] font-mono mt-0.5">
                {cat.subtitle}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── 2. STAT METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          activeStats.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                key={item.title}
                className="bg-white dark:bg-[#191A30] border border-slate-200/80 dark:border-[#2A2C4A] rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-[#9A9DBD]">{item.title}</span>
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-md ${item.shadow} group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-[#ECECFA] tracking-tight font-mono">
                    {item.value}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    {item.change}
                  </span>
                </div>
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.title} href={item.href} className="block">
                  {content}
                </Link>
              );
            }
            return content;
          })
        )}
      </div>

      {/* ── 3. MAIN WORKSPACE: BATCHES & EXAMS (LEFT 2/3) + SIDEBAR HUB (RIGHT 1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* LEFT COLUMN: COURSES & EXAMINATIONS */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* REAL BATCHES / COURSES SECTION */}
          <div className="bg-white dark:bg-[#191A30] border border-slate-200/80 dark:border-[#2A2C4A] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#2A2C4A]">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-[#ECECFA] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-brand-600 rounded-full inline-block" />
                  {isStudent ? 'My Enrolled Courses & Batches' : 'Active Batches'}
                  <span className="text-xs font-normal text-slate-500 dark:text-[#9A9DBD] font-mono">
                    ({batches.length})
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9DBD] mt-0.5">
                  {isStudent
                    ? 'Courses and study batches you are currently enrolled in.'
                    : 'Manage course curriculum, lecture materials, and enrolled students.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isStudent && (
                  <Link
                    href="/batches"
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Batch
                  </Link>
                )}
                <Link
                  href="/batches"
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  View All ({batches.length}) <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Real Batch Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredBatches.slice(0, 4).map((b) => {
                const subjectsCount = b.subjects?.length ?? b._count?.subjects ?? 0;
                const batchTestsCount = b.tests?.length ?? b._count?.tests ?? 0;
                const enrolledCount = b._count?.students ?? 0;
                const feeLabel = b.priceNpr === 0 ? 'Free' : `NPR ${b.priceNpr?.toLocaleString('en-NP') || b.priceNpr}`;

                return (
                  <div
                    key={b.id}
                    className="bg-slate-50/70 dark:bg-[#131428] border border-slate-200/80 dark:border-[#2A2C4A] rounded-2xl overflow-hidden hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-all flex flex-col justify-between group shadow-2xs"
                  >
                    {/* Header Strip */}
                    <div className="p-4 bg-slate-100/60 dark:bg-[#1B1D36] border-b border-slate-200/60 dark:border-[#2A2C4A] flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-[#131428] border border-slate-200 dark:border-[#2A2C4A] text-[10px] font-mono font-bold text-brand-700 dark:text-brand-300">
                        {b.code || 'BATCH'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-[#12301F] text-emerald-700 dark:text-emerald-300">
                          {feeLabel}
                        </span>
                        {b.status && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'ACTIVE'
                                ? 'bg-blue-100 dark:bg-[#1C2548] text-blue-700 dark:text-blue-300'
                                : 'bg-slate-200 dark:bg-[#2A2C4A] text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {b.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <Link
                          href={`/batches/${b.id}`}
                          className="font-bold text-sm text-slate-900 dark:text-[#ECECFA] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1"
                        >
                          {b.name}
                        </Link>
                        {b.institute?.name && (
                          <p className="text-[11px] text-slate-500 dark:text-[#9A9DBD] line-clamp-1 mt-0.5">
                            {b.institute.name}
                          </p>
                        )}
                        {b.description && (
                          <p className="text-xs text-slate-600 dark:text-[#9A9DBD] line-clamp-2 mt-1.5 leading-relaxed">
                            {b.description}
                          </p>
                        )}
                      </div>

                      {/* Real Metrics Info */}
                      <div className="pt-3 border-t border-slate-200/50 dark:border-[#2A2C4A] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-[#9A9DBD] text-[11px] font-mono">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                            {subjectsCount} Subjects
                          </span>
                          <span className="flex items-center gap-1">
                            <FileCheck2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            {batchTestsCount} Tests
                          </span>
                          {!isStudent && enrolledCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              {enrolledCount} Learners
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/batches/${b.id}`}
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {isStudent ? 'Open Course' : 'Manage'} →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {batches.length === 0 && !isLoading && (
                <div className="col-span-full py-10 text-center text-slate-400 dark:text-[#9A9DBD] text-xs bg-slate-50 dark:bg-[#131428] rounded-2xl border border-slate-200/70 dark:border-[#2A2C4A]">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">
                    {isStudent ? 'You are not enrolled in any batch yet.' : 'No active batches created yet.'}
                  </p>
                  <p className="text-[11px] mt-1 text-slate-500 dark:text-[#9A9DBD]">
                    {isStudent
                      ? 'Contact your institution to enroll into course batches.'
                      : 'Create your first batch to add subjects and assign tests.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CBT MOCK EXAMINATIONS SECTION */}
          <div className="bg-white dark:bg-[#191A30] border border-slate-200/80 dark:border-[#2A2C4A] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#2A2C4A]">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-[#ECECFA] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-purple-600 rounded-full inline-block" />
                  {isStudent ? 'My CBT Examination Arena' : 'Examinations & Live Submissions'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9DBD] mt-0.5">
                  {isStudent
                    ? 'Timed computer-based tests with step-by-step solutions and instant graded scorecards.'
                    : 'Manage active test papers, author questions, monitor attempts, and publish results.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isStudent && (
                  <Link
                    href="/tests/create"
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Author Test
                  </Link>
                )}
                <Link
                  href="/tests"
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  All Exams ({tests.length}) <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Test Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', label: `All (${tests.length})` },
                { id: 'LIVE', label: `🔴 Live Now (${liveTestsCount})` },
                { id: 'UPCOMING', label: '⏱ Upcoming' },
                { id: 'COMPLETED', label: isStudent ? 'Graded Scorecards' : 'Ended Papers' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTestFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    testFilter === f.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#131428] text-slate-700 dark:text-[#B2B5D6] hover:bg-slate-200/80 dark:hover:bg-[#1E2038] border border-transparent dark:border-[#2A2C4A]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tests List */}
            <div className="space-y-3">
              {filteredTests.slice(0, 8).map((t) => {
                const ended = isTestEnded(t);
                const draft = t.testStatus === 'DRAFT' || !t.isPublished;
                const isLive = !ended && !draft;
                const hasAttempt = t.attempts && t.attempts.length > 0;

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLive
                        ? 'bg-rose-50/50 dark:bg-[#231426] border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400'
                        : 'bg-slate-50/70 dark:bg-[#131428] border-slate-200/80 dark:border-[#2A2C4A] hover:border-brand-500/50 dark:hover:border-brand-500/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/tests/${t.id}`}
                          className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#ECECFA] hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate max-w-sm"
                        >
                          {t.title}
                        </Link>

                        {isLive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-600 text-white shadow-xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            🔴 LIVE NOW
                          </span>
                        )}

                        {ended && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 dark:bg-[#1E2038] text-slate-700 dark:text-[#B2B5D6] border border-slate-300/50 dark:border-[#2A2C4A]">
                            Closed
                          </span>
                        )}

                        {draft && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                            Draft
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#9A9DBD] font-mono flex-wrap">
                        {t.batch?.name && (
                          <span className="px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/80 text-[10px] font-sans font-semibold">
                            {t.batch.name}
                          </span>
                        )}
                        <span>⏱ {t.durationMinutes || 120}m</span>
                        <span className="text-slate-400 dark:text-slate-600">•</span>
                        <span>{t.totalMarks || 100} pts</span>
                        {t.startDateTime && (
                          <>
                            <span className="text-slate-400 dark:text-slate-600">•</span>
                            <span className="text-slate-500 dark:text-[#9A9DBD]">
                              Start: {new Date(t.startDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {isStudent ? (
                        ended || hasAttempt ? (
                          <Link
                            href={`/tests/${t.id}/runner?view=RESULT`}
                            className="px-3.5 py-1.5 bg-indigo-50 dark:bg-[#1E1B4B] hover:bg-indigo-100 dark:hover:bg-[#2E2875] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold rounded-xl text-xs inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <BarChart3 className="w-3.5 h-3.5" /> Scorecard & Proofs
                          </Link>
                        ) : (
                          <Link
                            href={`/tests/${t.id}/runner`}
                            className={`px-3.5 py-1.5 font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                              isLive
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                                : 'bg-brand-600 hover:bg-brand-500 text-white'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-white" /> {isLive ? 'Take Live Exam' : 'Start Exam'}
                          </Link>
                        )
                      ) : (
                        <>
                          <Link
                            href={`/tests/create?testId=${t.id}`}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-[#1E2038] text-slate-700 dark:text-[#ECECFA] hover:bg-slate-200 dark:hover:bg-[#2A2C4A] border border-slate-200 dark:border-[#2A2C4A] font-semibold rounded-xl text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500 dark:text-[#9A9DBD]" /> Edit
                          </Link>
                          <Link
                            href={`/tests/${t.id}`}
                            className="px-3 py-1.5 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800 font-semibold rounded-xl text-xs inline-flex items-center gap-1 transition-colors hover:bg-brand-100 dark:hover:bg-brand-900 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-brand-600 dark:text-brand-400" /> Details
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredTests.length === 0 && !isLoading && (
                <div className="py-10 text-center text-slate-400 dark:text-[#9A9DBD] text-xs bg-slate-50 dark:bg-[#131428] rounded-2xl border border-slate-200/70 dark:border-[#2A2C4A]">
                  <FileCheck2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">No examinations found under this filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PROFILE HUB, SHORTCUTS & SYSTEM READINESS */}
        <div className="space-y-6">
          {/* User Profile Card */}
          {user && (
            <div className="bg-white dark:bg-[#191A30] border border-slate-200/80 dark:border-[#2A2C4A] rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    user.fullName ? user.fullName[0] : 'U'
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#ECECFA] truncate">
                    {user.fullName || 'User'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#9A9DBD] font-mono truncate">
                    {user.email || user.identifier}
                  </p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-[10px] font-bold">
                    {user.role}
                  </span>
                </div>
              </div>

              {isStudent && (
                <div className="pt-2 border-t border-slate-100 dark:border-[#2A2C4A] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-600 dark:text-[#9A9DBD]">360 Student Analytics</span>
                  <Link
                    href={`/students/${user.id}`}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline text-xs flex items-center gap-1 cursor-pointer"
                  >
                    View Scorecard →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Academic Shortcuts */}
          <div className="bg-white dark:bg-[#191A30] border border-slate-200/80 dark:border-[#2A2C4A] rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#ECECFA] uppercase tracking-wider">
              Quick Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/videos"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131428] hover:bg-slate-100 dark:hover:bg-[#1B1D36] border border-slate-200/60 dark:border-[#2A2C4A] flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-[#2A1D3D] text-purple-700 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Video className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 dark:text-[#ECECFA] text-[11px]">Lectures</span>
              </Link>

              <Link
                href="/notes"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131428] hover:bg-slate-100 dark:hover:bg-[#1B1D36] border border-slate-200/60 dark:border-[#2A2C4A] flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-[#132A20] text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 dark:text-[#ECECFA] text-[11px]">Notes</span>
              </Link>

              <Link
                href="/curriculum"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131428] hover:bg-slate-100 dark:hover:bg-[#1B1D36] border border-slate-200/60 dark:border-[#2A2C4A] flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-[#162445] text-blue-700 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 dark:text-[#ECECFA] text-[11px]">Subjects</span>
              </Link>

              <Link
                href="/community"
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131428] hover:bg-slate-100 dark:hover:bg-[#1B1D36] border border-slate-200/60 dark:border-[#2A2C4A] flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-[#132B2B] text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 dark:text-[#ECECFA] text-[11px]">Doubt Q&A</span>
              </Link>
            </div>
          </div>

          {/* Engine & Proctoring Health Status */}
          <div className="bg-white dark:bg-[#191A30] border border-slate-200/80 dark:border-[#2A2C4A] rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#ECECFA] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> System Readiness
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-[#B2B5D6]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  CBT Server Engine
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Online</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-[#B2B5D6]">
                <span>Anti-Cheat Proctored Layer</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Enabled</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-[#B2B5D6]">
                <span>Adaptive Answer Key Proofs</span>
                <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
