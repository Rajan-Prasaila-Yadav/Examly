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
  ChevronRight,
  BookOpen,
  Eye,
  Clock,
  Calendar,
  UserCheck,
  Edit2,
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

// ── 3D Isometric Artworks for Batches in Fixed 16:9 Ratio ──
function Batch3DArt({ index = 0 }: { index: number }) {
  if (index % 3 === 0) {
    return (
      <svg viewBox="0 0 320 180" className="w-full h-full object-cover">
        <defs>
          <linearGradient id="bArtGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#060709" />
          </linearGradient>
          <linearGradient id="bArtGlow0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="bArtLid0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
          <linearGradient id="bArtCap0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill="url(#bArtGrad0)" />
        <ellipse cx="160" cy="142" rx="95" ry="24" fill="#000000" opacity="0.6" />
        <ellipse cx="160" cy="85" rx="85" ry="85" fill="url(#bArtGlow0)" />

        {/* Isometric Stage */}
        <polygon points="160,105 230,138 160,166 90,138" fill="#1C2138" />
        <polygon points="90,138 160,166 160,174 90,146" fill="#111422" />
        <polygon points="230,138 160,166 160,174 230,146" fill="#0A0C16" />

        {/* 3D Laptop Display */}
        <rect x="116" y="68" width="88" height="56" rx="8" fill="url(#bArtLid0)" stroke="#818CF8" strokeWidth="1.5" />
        <rect x="121" y="73" width="78" height="46" rx="5" fill="#080A14" />
        <line x1="130" y1="88" x2="160" y2="88" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="130" y1="96" x2="182" y2="96" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <line x1="130" y1="104" x2="152" y2="104" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" />

        {/* Floating 3D Graduation Mortarboard */}
        <g transform="translate(160, 44) scale(1.15)">
          <polygon points="0,-16 38,-4 0,8 -38,-4" fill="url(#bArtCap0)" stroke="#6366F1" strokeWidth="1.5" />
          <path d="M-22,0 C-22,14 22,14 22,0" fill="#1E1B4B" stroke="#312E81" strokeWidth="1" />
          <circle cx="0" cy="-4" r="4" fill="#FBBF24" />
          <path d="M0,-4 Q24,-2 28,15" stroke="#F59E0B" strokeWidth="3" fill="none" />
          <circle cx="28" cy="15" r="3.5" fill="#D97706" />
        </g>

        {/* Floating Orbitals */}
        <circle cx="85" cy="48" r="4" fill="#38BDF8" opacity="0.85" />
        <circle cx="238" cy="62" r="3.5" fill="#F43F5E" opacity="0.85" />
        <polygon points="235,38 237,43 242,45 237,47 235,52 233,47 228,45 233,43" fill="#FBBF24" />
      </svg>
    );
  }
  if (index % 3 === 1) {
    return (
      <svg viewBox="0 0 320 180" className="w-full h-full object-cover">
        <defs>
          <linearGradient id="bArtGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#062E22" />
            <stop offset="60%" stopColor="#081816" />
            <stop offset="100%" stopColor="#040608" />
          </linearGradient>
          <linearGradient id="bArtGlow1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="bArtBook1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill="url(#bArtGrad1)" />
        <ellipse cx="160" cy="142" rx="95" ry="24" fill="#000000" opacity="0.6" />
        <ellipse cx="160" cy="85" rx="85" ry="85" fill="url(#bArtGlow1)" />

        {/* Isometric Stage */}
        <polygon points="160,105 230,138 160,166 90,138" fill="#12241F" />
        <polygon points="90,138 160,166 160,174 90,146" fill="#0C1714" />
        <polygon points="230,138 160,166 160,174 230,146" fill="#060E0B" />

        {/* 3D Open Knowledge Book */}
        <g transform="translate(160, 96) scale(1.15)">
          <path d="M0,0 C-18,-10 -50,-8 -60,2 L-60,34 C-50,26 -18,24 0,32 C18,24 50,26 60,34 L60,2 C50,-8 18,-10 0,0 Z" fill="url(#bArtBook1)" />
          <path d="M0,-2 C-18,-12 -48,-10 -58,-2 L-58,30 C-48,22 -18,20 0,28 C18,20 48,22 58,30 L58,-2 C48,-10 18,-12 0,-2 Z" fill="#FFFFFF" opacity="0.95" />
          <line x1="0" y1="-2" x2="0" y2="28" stroke="#047857" strokeWidth="2.5" />
          <line x1="-42" y1="8" x2="-12" y2="4" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          <line x1="-42" y1="16" x2="-16" y2="12" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="4" x2="42" y2="8" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="12" x2="42" y2="16" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Floating Glowing Science Atom Orb */}
        <circle cx="160" cy="48" r="14" fill="#06B6D4" />
        <ellipse cx="160" cy="48" rx="26" ry="9" fill="none" stroke="#67E8F9" strokeWidth="2.5" transform="rotate(-30 160 48)" />
        <ellipse cx="160" cy="48" rx="26" ry="9" fill="none" stroke="#A7F3D0" strokeWidth="2.5" transform="rotate(30 160 48)" />
        <circle cx="178" cy="38" r="3" fill="#FFFFFF" />

        {/* Orbitals */}
        <circle cx="85" cy="62" r="3.5" fill="#34D399" opacity="0.85" />
        <circle cx="235" cy="52" r="4" fill="#38BDF8" opacity="0.85" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full object-cover">
      <defs>
        <linearGradient id="bArtGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#361508" />
          <stop offset="60%" stopColor="#1E0A04" />
          <stop offset="100%" stopColor="#050302" />
        </linearGradient>
        <linearGradient id="bArtGlow2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="bArtCup2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#bArtGrad2)" />
      <ellipse cx="160" cy="142" rx="95" ry="24" fill="#000000" opacity="0.6" />
      <ellipse cx="160" cy="85" rx="85" ry="85" fill="url(#bArtGlow2)" />

      {/* Isometric Stage */}
      <polygon points="160,105 230,138 160,166 90,138" fill="#26130C" />
      <polygon points="90,138 160,166 160,174 90,146" fill="#190B06" />
      <polygon points="230,138 160,166 160,174 230,146" fill="#100502" />

      {/* 3D Golden Trophy Cup */}
      <g transform="translate(160, 78) scale(1.15)">
        <ellipse cx="0" cy="22" rx="18" ry="5" fill="#B45309" />
        <rect x="-6" y="10" width="12" height="12" fill="#D97706" />
        <path d="M-18,-18 L18,-18 C18,8 -18,8 -18,-18 Z" fill="url(#bArtCup2)" stroke="#FBBF24" strokeWidth="1.5" />
        <path d="M-18,-14 C-28,-14 -28,0 -16,-2" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <path d="M18,-14 C28,-14 28,0 16,-2" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="-6" r="4" fill="#FEF3C7" />
      </g>

      <polygon points="160,32 163,39 170,41 164,44 161,51 158,44 152,41 158,39" fill="#FBBF24" />
      <circle cx="95" cy="52" r="3.5" fill="#FB923C" opacity="0.85" />
      <circle cx="230" cy="62" r="4" fill="#F43F5E" opacity="0.85" />
    </svg>
  );
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

  // Filter batches to active batches (Show only top 3 as requested)
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

  // 3D Artwork: Live CBT Examination Terminal
  const LiveTestArena3DArt = (
    <svg viewBox="0 0 100 85" className="w-[54px] h-[46px] sm:w-[68px] sm:h-[58px] drop-shadow-md shrink-0">
      <defs>
        <linearGradient id="liveTerminal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B1228" />
          <stop offset="100%" stopColor="#140510" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#000000" opacity="0.4" />
      <rect x="18" y="16" width="64" height="46" rx="10" fill="url(#liveTerminal)" stroke="#F43F5E" strokeWidth="1.5" strokeOpacity="0.5" />
      <rect x="22" y="20" width="56" height="38" rx="6" fill="#0A0309" />
      <path d="M26 39 L36 39 L40 28 L45 48 L50 34 L54 42 L58 39 L74 39" fill="none" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="26" r="3.5" fill="#E11D48" />
      <circle cx="70" cy="26" r="6" fill="#FB7185" opacity="0.4" />
      <path d="M42 62 L58 62 L64 74 L36 74 Z" fill="#250B19" />
      <rect x="34" y="73" width="32" height="3" rx="1.5" fill="#E11D48" opacity="0.8" />
    </svg>
  );

  // 3D Artwork: Upcoming Test Schedule Pad & Clock
  const UpcomingTestSchedule3DArt = (
    <svg viewBox="0 0 100 85" className="w-[54px] h-[46px] sm:w-[68px] sm:h-[58px] drop-shadow-md shrink-0">
      <defs>
        <linearGradient id="schedCal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#131438" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#000000" opacity="0.4" />
      <rect x="20" y="20" width="54" height="48" rx="8" fill="url(#schedCal)" stroke="#818CF8" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="24" y="24" width="46" height="12" rx="4" fill="#0A0B1A" />
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
        <circle cx="12" cy="12" r="14" fill="#080A12" stroke="#F59E0B" strokeWidth="2.5" />
        <line x1="12" y1="12" x2="12" y2="4" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="12" y1="12" x2="18" y2="15" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
      </g>
    </svg>
  );

  return (
    <div className="space-y-6 sm:space-y-7 max-w-7xl mx-auto pb-14 font-sans">
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
          className="rounded-2xl border border-red-300 dark:border-red-950/80 bg-red-50 dark:bg-red-950/20 p-4 text-xs text-red-700 dark:text-red-400 flex items-center justify-between"
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

      {/* ── 2. ACTIVE BATCHES (PROPER 3D COVERS & FIXED 16:9 RATIO) ── */}
      <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-4">
        {/* Header with zero secondary text */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#161824]">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Active Batches
          </h2>

          <div className="flex items-center gap-2">
            <Link
              href="/batches"
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#121520] dark:hover:bg-[#1A1E2E] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#1E2336] transition-all cursor-pointer flex items-center gap-1"
            >
              Manage All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/batches"
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Batch
            </Link>
          </div>
        </div>

        {/* 3D Batch Cards Grid with Fixed 16:9 Cover Artwork */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {displayBatches.map((b, idx) => {
            const subjectsCount = b.subjects?.length ?? b._count?.subjects ?? 0;
            const batchTestsCount = b.tests?.length ?? b._count?.tests ?? 0;
            const enrolledCount = b._count?.students ?? 0;
            const feeLabel =
              b.priceNpr === 0 ? 'Free' : `NPR ${b.priceNpr?.toLocaleString('en-NP') || b.priceNpr}`;

            return (
              <div
                key={b.id}
                className="group relative rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 bg-gradient-to-b from-white via-slate-50/70 to-slate-100/50 dark:from-[#0E1017] dark:via-[#0B0D13] dark:to-[#07080D] border border-slate-200/90 dark:border-white/[0.07] hover:border-brand-500/50 dark:hover:border-indigo-500/50 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_16px_32px_-8px_rgba(99,102,241,0.18)]"
              >
                {/* 3D Sheen Highlight line */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent rounded-t-2xl" />

                <div>
                  {/* Fixed 16:9 Aspect Ratio Cover / 3D Art System */}
                  <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-3.5 bg-slate-900 border border-slate-200/80 dark:border-[#181C2A] shadow-inner group-hover:shadow-md transition-shadow">
                    {b.imageUrl ? (
                      <img
                        src={b.imageUrl}
                        alt={b.name}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <Batch3DArt index={idx} />
                    )}

                    {/* Dark gradient overlay for contrast */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/35" />

                    {/* Floating Top Left: Code Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="px-2.5 py-1 rounded-lg backdrop-blur-md bg-black/60 border border-white/20 text-white font-mono font-black text-[10px] tracking-wider shadow-sm">
                        {b.code || 'BATCH'}
                      </span>
                    </div>

                    {/* Floating Top Right: Fee & Status Pills */}
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md bg-emerald-500/80 text-white border border-emerald-400/30 shadow-xs">
                        {feeLabel}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md bg-blue-500/80 text-white border border-blue-400/30 shadow-xs">
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  {/* Title & Institute */}
                  <div className="space-y-1">
                    <Link
                      href={`/batches/${b.id}`}
                      className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1"
                    >
                      {b.name}
                    </Link>
                    {b.institute?.name && (
                      <p className="text-[11px] font-medium text-slate-500 dark:text-[#94A3B8] line-clamp-1">
                        {b.institute.name}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {b.description && (
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8] line-clamp-2 leading-relaxed mt-1.5">
                      {b.description}
                    </p>
                  )}
                </div>

                {/* Footer Metrics & 3D Manage Button */}
                <div className="pt-3.5 mt-3 border-t border-slate-200/60 dark:border-[#161824] flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2.5 text-slate-500 dark:text-[#94A3B8] text-[11px] font-mono">
                    <span className="flex items-center gap-1" title="Curriculum Subjects">
                      <BookOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      {subjectsCount}
                    </span>
                    <span className="flex items-center gap-1" title="Mock Tests">
                      <FileCheck2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      {batchTestsCount}
                    </span>
                    <span className="flex items-center gap-1" title="Enrolled Learners">
                      <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {enrolledCount}
                    </span>
                  </div>

                  <Link
                    href={`/batches/${b.id}`}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.35)] active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            );
          })}

          {batches.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400 dark:text-[#94A3B8] text-xs bg-slate-50 dark:bg-[#0E1017] rounded-2xl border border-slate-200/70 dark:border-[#161824]">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold">No active batches created yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. CBT EXAMINATION ARENA: LIVE EXAMINATIONS & UPCOMING TESTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
        {/* LEFT: LIVE EXAMINATIONS */}
        <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-4">
          {/* Header with zero secondary text, Manage All button */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#161824]">
            <div className="flex items-center gap-3">
              {LiveTestArena3DArt}
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Live Examinations
              </h3>
            </div>

            <Link
              href="/tests"
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-200/80 dark:border-rose-900/60 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              Manage All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {liveTests.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="group p-4 rounded-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 bg-gradient-to-b from-rose-50/40 via-white to-rose-50/20 dark:from-[#170914] dark:via-[#11060E] dark:to-[#0A0308] border border-rose-200/90 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-500 shadow-[0_4px_16px_rgba(244,63,94,0.06)] dark:shadow-[0_8px_24px_rgba(244,63,94,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/tests/${t.id}`}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors truncate max-w-sm"
                    >
                      {t.title}
                    </Link>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-600 text-white animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>
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
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(225,29,72,0.25)] hover:shadow-[0_6px_16px_rgba(225,29,72,0.35)] active:scale-95 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Manage →
                </Link>
              </div>
            ))}

            {liveTests.length === 0 && (
              <div className="py-8 text-center text-slate-400 dark:text-[#94A3B8] text-xs bg-slate-50 dark:bg-[#0E1017] rounded-2xl border border-slate-200/70 dark:border-[#161824]">
                <Clock className="w-7 h-7 mx-auto mb-1 opacity-40 text-rose-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No examinations currently live</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: UPCOMING TESTS */}
        <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-4">
          {/* Header with zero secondary text, Author Test button */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#161824]">
            <div className="flex items-center gap-3">
              {UpcomingTestSchedule3DArt}
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Upcoming Tests
              </h3>
            </div>

            <Link
              href="/tests/create"
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Author Test
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingTests.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="group p-4 rounded-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 bg-gradient-to-b from-indigo-50/30 via-white to-slate-50/30 dark:from-[#0E101A] dark:via-[#0A0C14] dark:to-[#07080E] border border-slate-200/80 dark:border-white/[0.07] hover:border-brand-500/50 dark:hover:border-indigo-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5">
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
                  href={`/tests/create?testId=${t.id}`}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#151824] dark:hover:bg-[#1D2132] text-slate-800 dark:text-white font-extrabold text-xs rounded-xl border border-slate-200 dark:border-[#22283A] shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Author Test
                </Link>
              </div>
            ))}

            {upcomingTests.length === 0 && (
              <div className="py-8 text-center text-slate-400 dark:text-[#94A3B8] text-xs bg-slate-50 dark:bg-[#0E1017] rounded-2xl border border-slate-200/70 dark:border-[#161824]">
                <Calendar className="w-7 h-7 mx-auto mb-1 opacity-40 text-indigo-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No upcoming tests scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. RECENT MEMBERS JOINED: RECENT STUDENTS & RECENT FACULTY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
        {/* RECENT STUDENTS (EXACTLY 3) */}
        <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-4">
          {/* Header with zero secondary text */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#161824]">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Recent Students
            </h3>

            <Link
              href="/students"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentStudents.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="group p-3.5 rounded-2xl transition-all duration-200 bg-slate-50/70 dark:bg-[#0D0F16] hover:bg-slate-100/90 dark:hover:bg-[#121520] border border-slate-200/80 dark:border-[#171A27] flex items-center justify-between gap-3 cursor-pointer shadow-2xs"
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
                <p className="font-semibold">No students recorded</p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT FACULTY (EXACTLY 3) */}
        <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-4">
          {/* Header with zero secondary text */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#161824]">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Recent Faculty
            </h3>

            <Link
              href="/teachers"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentTeachers.slice(0, 3).map((t) => (
              <Link
                key={t.id}
                href={`/teachers/${t.id}`}
                className="group p-3.5 rounded-2xl transition-all duration-200 bg-slate-50/70 dark:bg-[#0D0F16] hover:bg-slate-100/90 dark:hover:bg-[#121520] border border-slate-200/80 dark:border-[#171A27] flex items-center justify-between gap-3 cursor-pointer shadow-2xs"
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
                <p className="font-semibold">No faculty registered</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
