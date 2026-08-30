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
} from 'lucide-react';

let cachedOverview: {
  batches: any[];
  tests: any[];
  studentsCount: number;
  teachersCount: number;
  student360: any;
} | null = null;

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

  const [batches, setBatches] = useState<any[]>(cachedOverview?.batches || []);
  const [tests, setTests] = useState<any[]>(cachedOverview?.tests || []);
  const [studentsCount, setStudentsCount] = useState<number>(cachedOverview?.studentsCount || 0);
  const [teachersCount, setTeachersCount] = useState<number>(cachedOverview?.teachersCount || 0);
  const [student360, setStudent360] = useState<any>(cachedOverview?.student360 || null);
  const [isLoading, setIsLoading] = useState(!cachedOverview);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchRes, testRes, studentsRes, teachersRes, profileRes] = await Promise.all([
          api.get('/batches').catch(() => ({ data: [] })),
          api.get('/tests').catch(() => ({ data: [] })),
          !isStudent ? api.get('/users/students').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          !isStudent ? api.get('/users/teachers').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          isStudent ? api.get(`/users/students/${user?.id || 'me'}/360`).catch(() => null) : Promise.resolve(null),
        ]);

        const fetchedBatches = batchRes.data || [];
        const fetchedTests = testRes.data || [];
        const totalStudents = studentsRes.data?.length || 0;
        const totalTeachers = teachersRes.data?.length || 0;
        const profileData = profileRes?.data || null;

        cachedOverview = {
          batches: fetchedBatches,
          tests: fetchedTests,
          studentsCount: totalStudents,
          teachersCount: totalTeachers,
          student360: profileData,
        };

        setBatches(fetchedBatches);
        setTests(fetchedTests);
        setStudentsCount(totalStudents);
        setTeachersCount(totalTeachers);
        setStudent360(profileData);
      } catch (e) {
        console.error('Failed to load dashboard overview data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  const liveTestsCount = tests.filter((t) => (t.testStatus === 'LIVE' || t.isPublished) && !isTestEnded(t)).length;

  // Student Real Metrics
  const studentStats = [
    {
      title: 'Enrolled Batches',
      value: String(batches.length),
      change: batches.length > 0 ? 'Active Access' : 'Not Enrolled',
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
      color: 'from-purple-500 to-accent-indigo',
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
      value: student360?.metrics?.avgPercentage !== undefined
        ? `${Math.round(student360.metrics.avgPercentage)}%`
        : `${student360?.metrics?.totalAttempts || 0} Taken`,
      change: student360?.metrics?.passRate !== undefined
        ? `${Math.round(student360.metrics.passRate)}% Pass Rate`
        : 'Detailed 360',
      icon: Award,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      href: user?.id ? `/students/${user.id}` : '/students',
    },
  ];

  // Admin / Faculty Real Metrics
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
      change: 'Live Database',
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
      color: 'from-purple-500 to-accent-indigo',
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

  const activeStats = isStudent ? studentStats : adminStats;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
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
            Welcome back, {user?.fullName || (isStudent ? 'Student' : 'Administrator')}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            {isStudent
              ? 'Access your enrolled batch curriculum, watch video lectures, download lecture notes, and take live timed mock examinations with instant scorecard analytics.'
              : 'Monitor real-time student exam attempts, author interactive questions with the Test Suite, and manage batch curriculums.'}
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
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
                  <BookOpen className="w-4 h-4" /> My Batches & Subjects
                </Link>
                {user?.id && (
                  <Link
                    href={`/students/${user.id}`}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-emerald-400" /> My 360 Profile
                  </Link>
                )}
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
              </>
            )}
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-600/20 to-transparent pointer-events-none" />
      </div>

      {/* Stat Metric Cards (100% Live Database Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
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
        }))}
      </div>

      {/* Main Grid: Live Mock Tests & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Live Mock Tests Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isStudent ? 'Assigned Live & Practice Examinations' : 'Recent & Live Examinations'}
              </h2>
              <p className="text-xs text-slate-500">
                {isStudent
                  ? 'Timed mock tests with anti-cheat protection and detailed scorecards'
                  : 'Examinations conducted across assigned batches'}
              </p>
            </div>
            <Link
              href="/tests"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Test Title</th>
                  {!isStudent && <th className="pb-3">Batch</th>}
                  {!isStudent && <th className="pb-3">Duration</th>}
                  <th className="pb-3">Marks</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tests.slice(0, 5).map((t) => {
                  const ended = isTestEnded(t);
                  const draft = t.testStatus === 'DRAFT' || !t.isPublished;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-semibold text-slate-900">
                        <Link href={`/tests/${t.id}`} className="hover:text-brand-600 transition-colors block truncate max-w-[180px] sm:max-w-[240px]">
                          {t.title}
                        </Link>
                        <span className="block text-[10px] font-normal text-slate-400 font-mono">
                          {t.sections?.length || 1} Sections • {t.durationMinutes}m
                        </span>
                      </td>
                      {!isStudent && <td className="py-3.5 text-slate-600">{t.batch?.name || 'General Batch'}</td>}
                      {!isStudent && <td className="py-3.5 text-slate-600 font-mono">{t.durationMinutes} mins</td>}
                      <td className="py-3.5 font-mono text-slate-800 font-bold">{t.totalMarks} pts</td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            ended
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : draft
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {ended ? (
                            'Ended'
                          ) : draft ? (
                            'Draft'
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {isStudent ? (
                          ended ? (
                            <Link
                              href={`/tests/${t.id}/runner?view=RESULT`}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1"
                            >
                              <BarChart3 className="w-3 h-3 text-brand-600" /> Result
                            </Link>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/tests/${t.id}/runner`}
                                className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg shadow-sm text-[11px] flex items-center gap-1"
                              >
                                <Play className="w-3 h-3 fill-white" /> Start
                              </Link>
                            </div>
                          )
                        ) : (
                          <Link
                            href={`/tests/${t.id}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 font-bold rounded-lg transition-colors text-[11px]"
                          >
                            Manage
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {tests.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={isStudent ? 4 : 6} className="py-8 text-center text-slate-400 text-xs">
                      No examinations found in database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Quick Action Hub & Batch Snapshot */}
        <div className="space-y-6">
          {/* Active Batches Snapshot */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              {isStudent ? 'My Enrolled Batches' : 'Active Batches Snapshot'}
            </h3>
            <div className="space-y-3">
              {batches.slice(0, 3).map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
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

              {batches.length === 0 && !isLoading && (
                <p className="text-xs text-slate-400 py-4 text-center">No batches found in database.</p>
              )}
            </div>

            <Link
              href="/batches"
              className="mt-4 block w-full py-2 text-center text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
            >
              {isStudent ? 'Explore My Batches →' : '+ View All Batches'}
            </Link>
          </div>

          {/* Student Quick Profile Card */}
          {isStudent && user?.id && (
            <div className="bg-gradient-to-br from-brand-50 to-indigo-50/50 border border-brand-200/60 rounded-2xl p-5 shadow-sm space-y-3">
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
                  View Details →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
