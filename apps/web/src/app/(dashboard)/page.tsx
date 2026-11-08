// apps/web/src/app/(dashboard)/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
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
  Clock,
  ChevronRight,
  Sparkles,
  BookOpen,
  Eye,
  Award,
  BarChart3,
  CheckCircle2,
  Edit2,
  Video,
  FileText,
  Trophy,
  ArrowUpRight,
  Upload,
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

  const [batches, setBatches] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [teachersCount, setTeachersCount] = useState<number>(0);
  const [student360, setStudent360] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testFilter, setTestFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [batchError, setBatchError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    let active = true, version = 0;
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
            : 'Could not load your batches. This does not mean you are not enrolled. Please retry.'
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
    0
  );

  const liveTestsCount = tests.filter((t) => (t.testStatus === 'LIVE' || t.isPublished) && !isTestEnded(t)).length;

  // Filtered test list
  const filteredTests = tests.filter((t) => {
    const ended = isTestEnded(t);
    const draft = t.testStatus === 'DRAFT' || !t.isPublished;
    const isLive = !ended && !draft;
    const hasAttempted = t.attempts && t.attempts.length > 0;

    if (testFilter === 'LIVE') return isLive;
    if (testFilter === 'UPCOMING') return !ended && !isLive && !draft;
    if (testFilter === 'COMPLETED') return ended || hasAttempted;
    return true;
  });

  // Student Metrics
  const studentStats = [
    {
      title: 'Enrolled Batches',
      value: String(batches.length),
      change: isLoading ? 'Loading…' : batchError ? 'Unable to load' : batches.length > 0 ? 'Active Access' : 'Not Enrolled',
      icon: GraduationCap,
      color: 'from-blue-500 to-brand-600',
      shadow: 'shadow-blue-500/20',
      href: '/batches',
    },
    {
      title: 'Assigned Mock Tests',
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
      change: 'Video & Notes',
      icon: BookOpen,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      href: '/batches',
    },
    {
      title: 'My Performance Score',
      value:
        student360?.metrics?.avgPercentage !== undefined
          ? `${Math.round(student360.metrics.avgPercentage)}%`
          : `${student360?.metrics?.totalAttempts || 0} Taken`,
      change:
        student360?.metrics?.passRate !== undefined
          ? `${Math.round(student360.metrics.passRate)}% Pass Rate`
          : 'Detailed 360',
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
      color: 'from-blue-500 to-brand-600',
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
      href: '/tests',
    },
    {
      title: 'Teaching Subjects',
      value: String(totalCurriculumSubjects),
      change: 'Curriculum Units',
      icon: BookOpen,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      href: '/batches',
    },
  ];

  // Admin Metrics
  const adminStats = [
    {
      title: 'Active Batches',
      value: String(batches.length),
      change: `${batches.filter((b) => b.status === 'ACTIVE').length} Active`,
      icon: GraduationCap,
      color: 'from-blue-500 to-brand-600',
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
      href: '/tests',
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

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {batchError && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs text-red-700 flex items-center justify-between">
          <span>{batchError}</span>
          <button className="underline font-bold" onClick={() => window.dispatchEvent(new Event('examly-refresh-dashboard'))}>
            Retry
          </button>
        </div>
      )}

      {/* Role-Specific Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-brand-900/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {isStudent
              ? 'Student Learning & Examination Portal'
              : isTeacher
              ? 'Faculty Academic Management Portal'
              : 'Institute Administration & Exam Engine'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.fullName || (isStudent ? 'Student' : isTeacher ? 'Instructor' : 'Administrator')}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            {isStudent
              ? 'Access your enrolled batch curriculum, watch video lectures, download lecture notes, and take live timed mock examinations with instant scorecard analytics.'
              : isTeacher
              ? 'Author and edit examination papers with LaTeX formulas, manage batch curricula, upload lecture videos & notes, and monitor student test performance in real-time.'
              : 'Monitor real-time student exam attempts, author interactive tests with the Test Suite, manage batch curriculums, and configure institutional access rules.'}
          </p>

          <div className="flex flex-wrap gap-2.5 sm:gap-3 mt-6">
            {isStudent ? (
              <>
                <Link
                  href="/tests"
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Take Mock Tests
                </Link>
                <Link
                  href="/batches"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" /> My Batches
                </Link>
                <Link
                  href="/videos"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" /> Lectures
                </Link>
                <Link
                  href="/notes"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> Notes
                </Link>
              </>
            ) : isTeacher ? (
              <>
                <Link
                  href="/tests/create"
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Test
                </Link>
                <Link
                  href="/videos"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Upload Video
                </Link>
                <Link
                  href="/notes"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> Upload Notes
                </Link>
                <Link
                  href="/batches"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" /> Assigned Batches
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/tests/create"
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create New Test
                </Link>
                <Link
                  href="/batches"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" /> Manage Batches
                </Link>
                <Link
                  href="/students"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" /> Students Directory
                </Link>
                <Link
                  href="/teachers"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <UserSquare2 className="w-4 h-4" /> Faculty Directory
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-600/20 to-transparent pointer-events-none" />
      </div>

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all group cursor-pointer"
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
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {item.value}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
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

      {/* Main Grid: Live Mock Tests & Right Snapshot Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Live Mock Tests Section with Filter Tabs */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isStudent ? 'My Examination Suite' : 'Examinations & Live Submissions'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isStudent
                  ? 'Active mock examinations, scheduled test windows, and graded scorecards.'
                  : 'Manage active tests, author questions, monitor attempts, and review leaderboards.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isStudent && (
                <Link
                  href="/tests/create"
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Test
                </Link>
              )}
              <Link
                href="/tests"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Test Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: `All (${tests.length})` },
              { id: 'LIVE', label: `🔴 Live (${liveTestsCount})` },
              { id: 'UPCOMING', label: '⏱ Upcoming' },
              { id: 'COMPLETED', label: isStudent ? 'Scorecards' : 'Ended' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTestFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  testFilter === f.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tests Card List */}
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
                      ? 'bg-rose-50/30 border-rose-200/70 hover:border-rose-300'
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/tests/${t.id}`}
                        className="font-bold text-xs sm:text-sm text-slate-900 hover:text-brand-600 transition-colors truncate max-w-sm"
                      >
                        {t.title}
                      </Link>

                      {isLive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-600 text-white shadow-xs animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          🔴 LIVE
                        </span>
                      )}

                      {ended && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-200/80 text-slate-600">
                          Closed
                        </span>
                      )}

                      {draft && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono flex-wrap">
                      {t.batch?.name && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-sans font-medium">
                          {t.batch.name}
                        </span>
                      )}
                      <span>⏱ {t.durationMinutes}m</span>
                      <span>•</span>
                      <span>{t.totalMarks} pts</span>
                      {t.startDateTime && (
                        <>
                          <span>•</span>
                          <span>Start: {new Date(t.startDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
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
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs inline-flex items-center gap-1 transition-all"
                        >
                          <BarChart3 className="w-3.5 h-3.5" /> Scorecard
                        </Link>
                      ) : (
                        <Link
                          href={`/tests/${t.id}/runner`}
                          className={`px-3.5 py-1.5 font-bold rounded-xl shadow-sm text-xs flex items-center gap-1.5 transition-all ${
                            isLive
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                              : 'bg-brand-600 hover:bg-brand-500 text-white'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-white" /> {isLive ? 'Take Live' : 'Start'}
                        </Link>
                      )
                    ) : (
                      <>
                        <Link
                          href={`/tests/create?testId=${t.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" /> Edit
                        </Link>
                        <Link
                          href={`/tests/${t.id}`}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 font-semibold rounded-xl text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-brand-600" /> Details
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTests.length === 0 && !isLoading && (
              <div className="py-12 text-center text-slate-400 text-xs">
                No examinations found matching this filter.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Action Hub & Batch Snapshot */}
        <div className="space-y-6">
          {/* Active Batches Snapshot */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              {isStudent ? 'My Enrolled Batches' : 'Active Batches'}
            </h3>
            <div className="space-y-2.5">
              {batches.slice(0, 4).map((b) => (
                <div key={b.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{b.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {isStudent
                        ? `${b.subjects?.length || b._count?.subjects || 0} Subjects • Enrolled`
                        : `${b.subjects?.length || b._count?.subjects || 0} Subjects • ${b._count?.students || 0} Students`}
                    </p>
                  </div>
                  <Link
                    href={`/batches/${b.id}`}
                    className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold rounded-lg border border-brand-200/60 transition-colors shrink-0"
                  >
                    {isStudent ? 'Open →' : 'Manage →'}
                  </Link>
                </div>
              ))}

              {batches.length === 0 && !isLoading && !batchError && (
                <p className="text-xs text-slate-400 py-4 text-center">No batches found in database.</p>
              )}
            </div>

            <Link
              href="/batches"
              className="mt-3 block w-full py-2 text-center text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
            >
              {isStudent ? 'Explore My Batches →' : '+ View All Batches'}
            </Link>
          </div>

          {/* Student Quick Profile Card */}
          {isStudent && user?.id && (
            <div className="bg-gradient-to-br from-brand-50 to-indigo-50/50 border border-brand-200/60 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName || 'Student'} className="w-full h-full object-cover" />
                  ) : (
                    user.fullName ? user.fullName[0] : 'S'
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{user.fullName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{user.identifier || user.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-brand-200/40 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-600">360 Examination Profile</span>
                <Link
                  href={`/students/${user.id}`}
                  className="font-bold text-brand-700 hover:text-brand-800 text-xs flex items-center gap-1"
                >
                  View Scorecard →
                </Link>
              </div>
            </div>
          )}

          {/* Quick Learning Shortcuts */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900">Academic Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/videos"
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex flex-col items-center justify-center text-center gap-1 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Video className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 text-[11px]">Lectures</span>
              </Link>

              <Link
                href="/notes"
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex flex-col items-center justify-center text-center gap-1 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 text-[11px]">Notes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
