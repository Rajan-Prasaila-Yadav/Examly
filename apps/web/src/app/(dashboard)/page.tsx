// apps/web/src/app/(dashboard)/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import DashboardFeatureRail from '@/components/dashboard-feature-rail';
import {
  GraduationCap,
  Users,
  FileCheck2,
  Plus,
  Play,
  ChevronRight,
  BookOpen,
  Eye,
  Award,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Video,
} from 'lucide-react';

function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Just now';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

type ScheduleFilter = 'PREV_DAY' | 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH' | 'NEXT_MONTH';

function matchesScheduleFilter(dateStr?: string, filter: ScheduleFilter = 'TODAY'): boolean {
  if (!dateStr) return false;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (filter === 'TODAY') {
    return targetDate >= todayStart && targetDate <= todayEnd;
  }
  if (filter === 'PREV_DAY') {
    const yestStart = new Date(todayStart.getTime() - 86400000);
    const yestEnd = new Date(todayEnd.getTime() - 86400000);
    return targetDate >= yestStart && targetDate <= yestEnd;
  }
  if (filter === 'TOMORROW') {
    const tomStart = new Date(todayStart.getTime() + 86400000);
    const tomEnd = new Date(todayEnd.getTime() + 86400000);
    return targetDate >= tomStart && targetDate <= tomEnd;
  }
  if (filter === 'THIS_WEEK') {
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const weekStart = new Date(todayStart.getTime() - dayOfWeek * 86400000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000 - 1);
    return targetDate >= weekStart && targetDate <= weekEnd;
  }
  if (filter === 'THIS_MONTH') {
    return targetDate.getFullYear() === now.getFullYear() && targetDate.getMonth() === now.getMonth();
  }
  if (filter === 'NEXT_MONTH') {
    const nextMonth = (now.getMonth() + 1) % 12;
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    return targetDate.getFullYear() === nextYear && targetDate.getMonth() === nextMonth;
  }
  return true;
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();

  // ── High-Speed Instant-Hydrated Data States (0ms Initial Render) ──
  const [batches, setBatches] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const c = localStorage.getItem('examly.dashboard.cache');
      if (c) return JSON.parse(c).batches || [];
    } catch {}
    return [];
  });

  const [tests, setTests] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const c = localStorage.getItem('examly.dashboard.cache');
      if (c) return JSON.parse(c).tests || [];
    } catch {}
    return [];
  });

  const [studentsCount, setStudentsCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const c = localStorage.getItem('examly.dashboard.cache');
      if (c) return JSON.parse(c).studentsCount || 0;
    } catch {}
    return 0;
  });

  const [teachersCount, setTeachersCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const c = localStorage.getItem('examly.dashboard.cache');
      if (c) return JSON.parse(c).teachersCount || 0;
    } catch {}
    return 0;
  });

  const [recentStudents, setRecentStudents] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const c = localStorage.getItem('examly.dashboard.cache');
      if (c) return JSON.parse(c).recentStudents || [];
    } catch {}
    return [];
  });

  const [recentTeachers, setRecentTeachers] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const c = localStorage.getItem('examly.dashboard.cache');
      if (c) return JSON.parse(c).recentTeachers || [];
    } catch {}
    return [];
  });

  const [batchClasses, setBatchClasses] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const c = localStorage.getItem('examly.dashboard.cache');
      if (c) return JSON.parse(c).batchClasses || [];
    } catch {}
    return [];
  });

  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('TODAY');
  const [batchError, setBatchError] = useState('');

  // Persistence helper to keep next render at 0ms
  const persistCache = (patch: Record<string, any>) => {
    if (typeof window === 'undefined') return;
    try {
      const current = JSON.parse(localStorage.getItem('examly.dashboard.cache') || '{}');
      const updated = { ...current, ...patch, updatedAt: Date.now() };
      localStorage.setItem('examly.dashboard.cache', JSON.stringify(updated));
    } catch {}
  };

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    const fetchData = async (force = false) => {
      setBatchError('');
      const config = { bypassCache: force, timeout: 8000 };

      // 1. Fetch Batches
      api
        .get('/batches', config)
        .then((res) => {
          if (!active) return;
          const data = res.data || [];
          setBatches(data);
          persistCache({ batches: data });

          // Fetch workspace timetables for active batches
          const activeBatchesList = data.filter((b: any) => b.status === 'ACTIVE').slice(0, 4);
          if (activeBatchesList.length > 0) {
            Promise.allSettled(
              activeBatchesList.map((b: any) =>
                api.get(`/batches/${b.id}/workspace`, config).then((r) => ({
                  batchId: b.id,
                  batchName: b.name,
                  classes: r.data?.classes || [],
                })),
              ),
            ).then((results) => {
              if (!active) return;
              const allClasses: any[] = [];
              results.forEach((res) => {
                if (res.status === 'fulfilled' && res.value?.classes) {
                  res.value.classes.forEach((c: any) => {
                    allClasses.push({
                      ...c,
                      batchId: res.value.batchId,
                      batchName: res.value.batchName,
                    });
                  });
                }
              });
              setBatchClasses(allClasses);
              persistCache({ batchClasses: allClasses });
            });
          }
        })
        .catch((err) => {
          if (!active) return;
          if (err?.response?.status === 403) {
            setBatchError(
              'Your role does not have permission to view batches. Ask your administrator to enable Batches: Read.',
            );
          }
        });

      // 2. Fetch Tests
      api
        .get('/tests', config)
        .then((res) => {
          if (!active) return;
          const data = res.data || [];
          setTests(data);
          persistCache({ tests: data });
        })
        .catch(() => {});

      // 3. Fetch Recent Students (limit 3)
      api
        .get('/users/students?limit=3', config)
        .then((res) => {
          if (!active) return;
          const stdList = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          const total = res.data?.meta?.total ?? stdList.length;
          setRecentStudents(stdList.slice(0, 3));
          setStudentsCount(total);
          persistCache({ recentStudents: stdList.slice(0, 3), studentsCount: total });
        })
        .catch(() => {});

      // 4. Fetch Recent Faculty (limit 3)
      api
        .get('/users/teachers', config)
        .then((res) => {
          if (!active) return;
          const facList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setRecentTeachers(facList.slice(0, 3));
          setTeachersCount(facList.length);
          persistCache({ recentTeachers: facList.slice(0, 3), teachersCount: facList.length });
        })
        .catch(() => {});
    };

    void fetchData(false);

    const backgroundRefresh = () => {
      void fetchData(false);
    };

    window.addEventListener('focus', backgroundRefresh);
    window.addEventListener('examly-permissions-changed', backgroundRefresh);
    window.addEventListener('examly-refresh-dashboard', backgroundRefresh);

    return () => {
      active = false;
      window.removeEventListener('focus', backgroundRefresh);
      window.removeEventListener('examly-permissions-changed', backgroundRefresh);
      window.removeEventListener('examly-refresh-dashboard', backgroundRefresh);
    };
  }, [user?.id]);

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

  // Filter batches to active batches (Show only 3 as requested)
  const activeBatches = useMemo(() => {
    return batches.filter((b) => b.status === 'ACTIVE' || !b.status);
  }, [batches]);

  const displayBatches = useMemo(() => {
    return (activeBatches.length > 0 ? activeBatches : batches).slice(0, 3);
  }, [activeBatches, batches]);

  // Live and Upcoming Tests
  const liveTests = useMemo(() => {
    return tests.filter((t) => (t.testStatus === 'LIVE' || t.isPublished) && !isTestEnded(t));
  }, [tests]);

  const upcomingTests = useMemo(() => {
    return tests.filter((t) => {
      const ended = isTestEnded(t);
      const isLive = (t.testStatus === 'LIVE' || t.isPublished) && !ended;
      return !ended && !isLive && t.testStatus !== 'DRAFT';
    });
  }, [tests]);

  // Combined Academic Schedule & Timetable Events
  const filteredScheduleEvents = useMemo(() => {
    const events: any[] = [];

    // 1. Add batch classes
    batchClasses.forEach((c) => {
      if (matchesScheduleFilter(c.date, scheduleFilter)) {
        events.push({
          id: `class-${c.id}`,
          type: 'CLASS',
          title: c.topic || 'Class Session',
          batchName: c.batchName || 'Academic Batch',
          subjectName: c.subject?.name || 'Curriculum',
          teacherName: c.teacher?.fullName || 'Faculty Instructor',
          date: c.date,
          startTime: c.startTime,
          endTime: c.endTime,
          status: c.status || 'Upcoming',
          link: `/batches/${c.batchId}`,
        });
      }
    });

    // 2. Add scheduled/live tests
    tests.forEach((t) => {
      const testDate = t.startDateTime ? t.startDateTime.slice(0, 10) : null;
      if (matchesScheduleFilter(testDate, scheduleFilter)) {
        const ended = isTestEnded(t);
        const isLive = (t.testStatus === 'LIVE' || t.isPublished) && !ended;
        events.push({
          id: `test-${t.id}`,
          type: 'EXAM',
          title: t.title,
          batchName: t.batch?.name || 'All Batches',
          subjectName: 'CBT Examination',
          teacherName: 'Automated Proctor',
          date: testDate,
          startTime: t.startDateTime
            ? new Date(t.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Scheduled',
          endTime: `${t.durationMinutes || 120}m duration`,
          status: isLive ? 'Live' : ended ? 'Completed' : 'Upcoming',
          link: `/tests/${t.id}`,
        });
      }
    });

    return events;
  }, [batchClasses, tests, scheduleFilter]);

  // 3D Artwork 1: Live CBT Examination Terminal
  const LiveTestArena3DArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[74px] sm:h-[64px] drop-shadow-md shrink-0">
      <defs>
        <linearGradient id="liveTerminal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2A1435" />
          <stop offset="100%" stopColor="#140B1D" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.25" />
      <rect x="18" y="16" width="64" height="46" rx="10" fill="url(#liveTerminal)" stroke="#F43F5E" strokeWidth="1.5" strokeOpacity="0.5" />
      <rect x="22" y="20" width="56" height="38" rx="6" fill="#0F0816" />
      <path d="M26 39 L36 39 L40 28 L45 48 L50 34 L54 42 L58 39 L74 39" fill="none" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="26" r="3.5" fill="#E11D48" />
      <circle cx="70" cy="26" r="6" fill="#FB7185" opacity="0.4" />
      <path d="M42 62 L58 62 L64 74 L36 74 Z" fill="#2A1435" />
      <rect x="34" y="73" width="32" height="3" rx="1.5" fill="#E11D48" opacity="0.8" />
    </svg>
  );

  // 3D Artwork 2: Upcoming Test Schedule Pad & Clock
  const UpcomingTestSchedule3DArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[74px] sm:h-[64px] drop-shadow-md shrink-0">
      <defs>
        <linearGradient id="schedCal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.25" />
      <rect x="20" y="20" width="54" height="48" rx="8" fill="url(#schedCal)" stroke="#818CF8" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="24" y="24" width="46" height="12" rx="4" fill="#1E1B4B" />
      <rect x="28" y="15" width="4" height="9" rx="2" fill="#FBBF24" />
      <rect x="42" y="15" width="4" height="9" rx="2" fill="#FBBF24" />
      <rect x="56" y="15" width="4" height="9" rx="2" fill="#FBBF24" />
      <circle cx="33" cy="44" r="2.5" fill="#C7D2FE" />
      <circle cx="47" cy="44" r="2.5" fill="#C7D2FE" />
      <circle cx="61" cy="44" r="2.5" fill="#C7D2FE" />
      <circle cx="33" cy="54" r="2.5" fill="#C7D2FE" />
      <circle cx="47" cy="54" r="3.5" fill="#F59E0B" />
      <circle cx="61" cy="54" r="2.5" fill="#C7D2FE" />
      <g transform="translate(68, 36) scale(0.85)">
        <circle cx="12" cy="12" r="14" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.5" />
        <line x1="12" y1="12" x2="12" y2="4" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="12" y1="12" x2="18" y2="15" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
      </g>
    </svg>
  );

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-14 font-sans">
      {/* ── 1. UNIFIED 3D CAPABILITIES & LIVE STATS RAIL (SECTION 1 UNTOUCHED) ── */}
      <DashboardFeatureRail
        batchesCount={batches.length}
        activeBatchesCount={batches.filter((b) => b.status === 'ACTIVE').length}
        liveTestsCount={liveTests.length}
        totalTestsCount={tests.length}
        subjectsCount={totalCurriculumSubjects}
        studentsCount={studentsCount}
        teachersCount={teachersCount}
        studentId={user?.id}
      />

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

      {/* ── 2. ACTIVE BATCHES (EXACTLY 3 CARDS) ── */}
      <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-[#1E222F] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E222F]">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Active Batches
              <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8] font-mono">
                ({displayBatches.length} of {activeBatches.length})
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Manage ongoing study batches, curriculum, and learner enrollments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/batches"
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Batch
            </Link>
            <Link
              href="/batches"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              View All ({batches.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3 Active Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayBatches.map((b) => {
            const subjectsCount = b.subjects?.length ?? b._count?.subjects ?? 0;
            const batchTestsCount = b.tests?.length ?? b._count?.tests ?? 0;
            const enrolledCount = b._count?.students ?? 0;
            const feeLabel =
              b.priceNpr === 0 ? 'Free' : `NPR ${b.priceNpr?.toLocaleString('en-NP') || b.priceNpr}`;

            return (
              <div
                key={b.id}
                className="bg-slate-50/70 dark:bg-[#161824] border border-slate-200/80 dark:border-[#1E222F] rounded-2xl overflow-hidden hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-all flex flex-col justify-between group shadow-2xs"
              >
                {/* Header Strip */}
                <div className="p-3.5 bg-slate-100/60 dark:bg-[#1A1D2B] border-b border-slate-200/60 dark:border-[#1E222F] flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-[#12141C] border border-slate-200 dark:border-[#1E222F] text-[10px] font-mono font-bold text-brand-700 dark:text-brand-300">
                    {b.code || 'BATCH'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-[#0B291B] text-emerald-700 dark:text-emerald-300">
                      {feeLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-[#1C2548] text-blue-700 dark:text-blue-300">
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <Link
                      href={`/batches/${b.id}`}
                      className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1"
                    >
                      {b.name}
                    </Link>
                    {b.institute?.name && (
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] line-clamp-1 mt-0.5">
                        {b.institute.name}
                      </p>
                    )}
                    {b.description && (
                      <p className="text-xs text-slate-600 dark:text-[#94A3B8] line-clamp-2 mt-1.5 leading-relaxed">
                        {b.description}
                      </p>
                    )}
                  </div>

                  {/* Metrics Info */}
                  <div className="pt-3 border-t border-slate-200/50 dark:border-[#1E222F] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-[#94A3B8] text-[11px] font-mono">
                      <span className="flex items-center gap-1" title="Subjects">
                        <BookOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        {subjectsCount}
                      </span>
                      <span className="flex items-center gap-1" title="Tests">
                        <FileCheck2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        {batchTestsCount}
                      </span>
                      <span className="flex items-center gap-1" title="Learners">
                        <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {enrolledCount}
                      </span>
                    </div>

                    <Link
                      href={`/batches/${b.id}`}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {batches.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400 dark:text-[#94A3B8] text-xs bg-slate-50 dark:bg-[#161824] rounded-2xl border border-slate-200/70 dark:border-[#1E222F]">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold">No active batches created yet.</p>
              <p className="text-[11px] mt-1 text-slate-500 dark:text-[#94A3B8]">
                Create your first batch to add subjects and schedule tests.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. CBT EXAMINATION ARENA: LIVE TESTS & UPCOMING TESTS (WITH 3D ARTWORKS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
        {/* LEFT: LIVE TESTS ARENA (WITH 3D ART) */}
        <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-[#1E222F] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E222F]">
            <div className="flex items-center gap-3">
              {LiveTestArena3DArt}
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Live Examinations
                  {liveTests.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      {liveTests.length} Live
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Examinations currently ongoing and accepting submissions.
                </p>
              </div>
            </div>

            <Link
              href="/tests"
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 shrink-0"
            >
              Monitor <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {liveTests.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-rose-50/40 dark:bg-[#20121F] border border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/tests/${t.id}`}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors truncate max-w-sm"
                    >
                      {t.title}
                    </Link>
                    {t.batch?.name && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100/70 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 text-[10px] font-semibold">
                        {t.batch.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#94A3B8] font-mono">
                    <span>⏱ {t.durationMinutes || 120}m duration</span>
                    <span>•</span>
                    <span>{t.totalMarks || 100} points</span>
                  </div>
                </div>

                <Link
                  href={`/tests/${t.id}`}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Proctor Live →
                </Link>
              </div>
            ))}

            {liveTests.length === 0 && (
              <div className="py-8 text-center text-slate-400 dark:text-[#94A3B8] text-xs bg-slate-50 dark:bg-[#161824] rounded-2xl border border-slate-200/70 dark:border-[#1E222F]">
                <Clock className="w-7 h-7 mx-auto mb-1.5 opacity-40 text-rose-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No tests currently live</p>
                <p className="text-[11px] mt-0.5 text-slate-500">
                  Tests will automatically appear here when their scheduled time begins.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: UPCOMING TESTS (WITH 3D ART) */}
        <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-[#1E222F] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E222F]">
            <div className="flex items-center gap-3">
              {UpcomingTestSchedule3DArt}
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Upcoming Tests
                  <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8] font-mono">
                    ({upcomingTests.length} Scheduled)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Scheduled mock test papers awaiting start date.
                </p>
              </div>
            </div>

            <Link
              href="/tests/create"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
            >
              Author Test <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingTests.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#161824] border border-slate-200/70 dark:border-[#1E222F] hover:border-brand-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/tests/${t.id}`}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate max-w-sm"
                    >
                      {t.title}
                    </Link>
                    {t.batch?.name && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                        {t.batch.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#94A3B8] font-mono">
                    {t.startDateTime && (
                      <span>
                        Starts: {new Date(t.startDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span>•</span>
                    <span>⏱ {t.durationMinutes || 120}m</span>
                    <span>•</span>
                    <span>{t.totalMarks || 100} pts</span>
                  </div>
                </div>

                <Link
                  href={`/tests/${t.id}`}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-[#1E222F] hover:bg-brand-50 dark:hover:bg-brand-950/60 text-slate-700 dark:text-white hover:text-brand-600 font-bold text-xs rounded-xl border border-slate-200 dark:border-[#2A2F40] transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect Paper →
                </Link>
              </div>
            ))}

            {upcomingTests.length === 0 && (
              <div className="py-8 text-center text-slate-400 dark:text-[#94A3B8] text-xs bg-slate-50 dark:bg-[#161824] rounded-2xl border border-slate-200/70 dark:border-[#1E222F]">
                <Calendar className="w-7 h-7 mx-auto mb-1.5 opacity-40 text-indigo-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No upcoming tests scheduled</p>
                <p className="text-[11px] mt-0.5 text-slate-500">
                  Use the test authoring tool to schedule mock examinations for your batches.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. RECENT MEMBERS JOINED: 3 STUDENTS & 3 FACULTY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
        {/* RECENT STUDENTS (JUST 3) */}
        <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-[#1E222F] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E222F]">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Recently Joined Students
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                Latest student admissions and batch enrollments.
              </p>
            </div>

            <Link
              href="/students"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
            >
              All Students ({studentsCount}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentStudents.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="group p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#161824] hover:bg-slate-100/80 dark:hover:bg-[#1A1D2B] border border-slate-200/70 dark:border-[#1E222F] transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt={s.fullName} className="w-full h-full object-cover" />
                    ) : (
                      s.fullName?.[0] || 'S'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                      {s.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate">
                      {s.email || s.identifier}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 text-right">
                  {s.studentProfile?.batch?.name && (
                    <span className="px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 text-[10px] font-semibold">
                      {s.studentProfile.batch.name}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    {formatTimeAgo(s.createdAt)}
                  </span>
                </div>
              </Link>
            ))}

            {recentStudents.length === 0 && (
              <div className="py-6 text-center text-slate-400 dark:text-[#94A3B8] text-xs">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-40 text-blue-500" />
                <p className="font-semibold">No student admissions recorded</p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT FACULTY (JUST 3) */}
        <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-[#1E222F] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E222F]">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Newly Joined Faculty
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                Assigned instructors, lecturers, and evaluators.
              </p>
            </div>

            <Link
              href="/teachers"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
            >
              All Faculty ({teachersCount}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentTeachers.slice(0, 3).map((t) => (
              <Link
                key={t.id}
                href={`/teachers/${t.id}`}
                className="group p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#161824] hover:bg-slate-100/80 dark:hover:bg-[#1A1D2B] border border-slate-200/70 dark:border-[#1E222F] transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt={t.fullName} className="w-full h-full object-cover" />
                    ) : (
                      t.fullName?.[0] || 'F'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                      {t.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate">
                      {t.email || t.identifier}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 text-right">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold inline-flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Faculty
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    {formatTimeAgo(t.createdAt)}
                  </span>
                </div>
              </Link>
            ))}

            {recentTeachers.length === 0 && (
              <div className="py-6 text-center text-slate-400 dark:text-[#94A3B8] text-xs">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-40 text-amber-500" />
                <p className="font-semibold">No faculty members registered</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. ACADEMIC SCHEDULE & TIMETABLE (WITH INTERACTIVE FILTERS) ── */}
      <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-[#1E222F] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-[#1E222F]">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Academic Schedule & Timetable
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Live timetable of classes, mock examinations, and batch sessions.
            </p>
          </div>

          {/* Interactive Date Range Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'PREV_DAY', label: 'Previous Day' },
              { id: 'TODAY', label: 'Today' },
              { id: 'TOMORROW', label: 'Tomorrow' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'NEXT_MONTH', label: 'Next Month' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setScheduleFilter(f.id as ScheduleFilter)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                  scheduleFilter === f.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#161824] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-200/80 dark:hover:bg-[#1F2333] border border-transparent dark:border-[#1E222F]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Items List */}
        <div className="space-y-3">
          {filteredScheduleEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#161824] border border-slate-200/70 dark:border-[#1E222F] hover:border-brand-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    ev.type === 'EXAM'
                      ? 'bg-rose-100 dark:bg-[#2A1320] text-rose-600 dark:text-rose-400'
                      : 'bg-brand-100 dark:bg-[#162345] text-brand-600 dark:text-brand-400'
                  }`}
                >
                  {ev.type === 'EXAM' ? <FileCheck2 className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={ev.link}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                    >
                      {ev.title}
                    </Link>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-[#1E222F] text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                      {ev.batchName}
                    </span>
                    {ev.status === 'Live' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-extrabold animate-pulse">
                        🔴 LIVE NOW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 dark:text-[#94A3B8] font-mono text-[11px] flex-wrap">
                    <span>
                      🕒 {ev.startTime}
                      {ev.endTime ? ` – ${ev.endTime}` : ''}
                    </span>
                    <span>•</span>
                    <span>{ev.subjectName}</span>
                    <span>•</span>
                    <span className="font-sans text-slate-600 dark:text-slate-400">
                      Instructor: {ev.teacherName}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={ev.link}
                className="px-3.5 py-1.5 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 font-bold text-xs rounded-xl border border-brand-200/60 dark:border-brand-800 transition-colors flex items-center gap-1 shrink-0 self-start sm:self-center cursor-pointer"
              >
                View Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}

          {filteredScheduleEvents.length === 0 && (
            <div className="py-10 text-center text-slate-400 dark:text-[#94A3B8] text-xs bg-slate-50/50 dark:bg-[#161824] rounded-2xl border border-dashed border-slate-200 dark:border-[#1E222F]">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-brand-500" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No sessions or exams scheduled for this date range
              </p>
              <p className="text-[11px] mt-0.5 text-slate-500">
                Classes and mock examinations scheduled in batches will automatically populate this schedule.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
