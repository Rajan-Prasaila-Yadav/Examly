// apps/web/src/app/(dashboard)/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import DashboardFeatureRail from '@/components/dashboard-feature-rail';
import { optimizeBatchCover } from '@/lib/image-optimizer';
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
  UserPlus,
  FileText,
  Layers,
  Edit2,
  Camera,
  Trash2,
  Loader2,
  CheckCircle2,
  Play,
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

function getUpcomingRelativeTime(dateString?: string) {
  if (!dateString) return 'Upcoming';
  const target = new Date(dateString).getTime();
  const diffMs = target - Date.now();
  if (diffMs <= 0) return 'Live now';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 0) return `In ${Math.max(1, diffHours)}h`;
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

function formatDayAndMonth(dateString?: string) {
  if (!dateString) return { day: '--', month: '---' };
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return { day, month };
}

function formatTimeRange(start?: string, end?: string) {
  if (!start) return 'Flexible time';
  const s = new Date(start);
  const startTime = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (!end) return startTime;
  const e = new Date(end);
  const endTime = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${startTime} – ${endTime}`;
}

// ── 3D Isometric Artworks for Batches in Fixed 16:9 Ratio ──
function Batch3DArt({ index = 0 }: { index: number }) {
  if (index % 3 === 0) {
    // Medical & Clinical Study Visual (Stethoscope, Anatomy Chart, Medical Book)
    return (
      <svg viewBox="0 0 320 180" className="w-full h-full object-cover">
        <defs>
          <linearGradient id="medGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B1A28" />
            <stop offset="60%" stopColor="#07111D" />
            <stop offset="100%" stopColor="#03070D" />
          </linearGradient>
          <linearGradient id="medCyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891B2" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="medBookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
          <linearGradient id="medTubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill="url(#medGrad0)" />
        <ellipse cx="160" cy="144" rx="100" ry="24" fill="#000000" opacity="0.65" />
        <ellipse cx="160" cy="85" rx="88" ry="85" fill="url(#medCyanGlow)" />

        {/* Isometric Lab Desk Surface */}
        <polygon points="160,105 236,140 160,168 84,140" fill="#0E2236" />
        <polygon points="84,140 160,168 160,176 84,148" fill="#091522" />
        <polygon points="236,140 160,168 160,176 236,148" fill="#050C14" />

        {/* 3D Open Medical Textbook */}
        <g transform="translate(160, 118) scale(1.1)">
          <path d="M0,-8 C-18,-18 -48,-16 -58,-6 L-58,24 C-48,16 -18,14 0,22 C18,14 48,16 58,24 L58,-6 C48,-16 18,-18 0,-8 Z" fill="url(#medBookGrad)" />
          <path d="M0,-10 C-18,-20 -46,-18 -56,-8 L-56,22 C-46,14 -18,12 0,20 C18,12 46,14 56,22 L56,-8 C46,-18 18,-20 0,-10 Z" fill="#F0F9FF" opacity="0.95" />
          <line x1="0" y1="-10" x2="0" y2="20" stroke="#0284C7" strokeWidth="2.5" />
          {/* Anatomical sketch lines on pages */}
          <line x1="-42" y1="-1" x2="-12" y2="-5" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="-42" y1="7" x2="-16" y2="3" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="-42" y1="14" x2="-22" y2="10" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="12" y1="-5" x2="42" y2="-1" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="3" x2="42" y2="7" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="22" y1="10" x2="42" y2="14" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* 3D Metallic Medical Stethoscope */}
        <g transform="translate(160, 52)">
          {/* Earpieces */}
          <path d="M-22,0 C-22,18 -6,28 0,38 C6,28 22,18 22,0" fill="none" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
          <circle cx="-22" cy="0" r="3" fill="#38BDF8" />
          <circle cx="22" cy="0" r="3" fill="#38BDF8" />
          {/* Y-junction & Flexible tube */}
          <circle cx="0" cy="38" r="3" fill="#94A3B8" />
          <path d="M0,38 C-4,50 -26,62 -18,78 C-12,90 8,92 18,84" fill="none" stroke="url(#medTubeGrad)" strokeWidth="3.5" strokeLinecap="round" />
          {/* Chestpiece / Diaphragm Bell */}
          <circle cx="22" cy="82" r="9" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
          <circle cx="22" cy="82" r="5" fill="#E2E8F0" />
        </g>

        {/* Floating Medical Cross Badge & Pulse Line */}
        <g transform="translate(85, 48)">
          <rect x="-12" y="-12" width="24" height="24" rx="6" fill="#0369A1" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="-2" y="-7" width="4" height="14" rx="1.5" fill="#FFFFFF" />
          <rect x="-7" y="-2" width="14" height="4" rx="1.5" fill="#FFFFFF" />
        </g>

        {/* EKG Heartbeat waveform */}
        <path d="M210,48 L225,48 L230,36 L235,56 L240,42 L245,52 L248,48 L265,48" fill="none" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="265" cy="48" r="2.5" fill="#67E8F9" />
      </svg>
    );
  }
  if (index % 3 === 1) {
    // Digital Classroom & Engineering Terminal Visual
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
  // Academic Mastery & Golden Trophy Visual
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

  const isStudent = useMemo(() => {
    const role = user?.role;
    if (typeof role === 'string') return role.toUpperCase() === 'STUDENT';
    if (role && typeof role === 'object') {
      const name = (role as any).name || (role as any).code || '';
      return String(name).toUpperCase() === 'STUDENT';
    }
    return false;
  }, [user]);

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

  const [studentData, setStudentData] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const c = localStorage.getItem('examly.student.dashboard.cache');
      if (c) return JSON.parse(c);
    } catch {}
    return null;
  });

  const [batchError, setBatchError] = useState('');
  const [uploadingBatchId, setUploadingBatchId] = useState<string | null>(null);
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  // Persistence helper to keep next render at 0ms
  const persistCache = (patch: Record<string, any>) => {
    if (typeof window === 'undefined') return;
    try {
      const current = JSON.parse(localStorage.getItem('examly.dashboard.cache') || '{}');
      const updated = { ...current, ...patch, updatedAt: Date.now() };
      localStorage.setItem('examly.dashboard.cache', JSON.stringify(updated));
    } catch {}
  };

  // Direct Batch Cover Upload handler (Auto 16:9 Optimization)
  const handleBatchCoverUpload = async (batchId: string, file?: File) => {
    if (!file) return;
    setUploadingBatchId(batchId);
    try {
      // 1. Automatically center-crop to 16:9 and optimize/compress image (WebP/JPEG ~150KB)
      const { dataUrl, blob, fileName, mimeType } = await optimizeBatchCover(file);

      let finalUrl = '';
      try {
        const { data } = await api.post('/storage/presigned-url', {
          folder: 'images',
          fileName,
          contentType: mimeType,
          size: blob.size,
        });
        if (data?.uploadUrl && !data.uploadUrl.includes('mock-upload') && !data.publicUrl?.includes('pub-mock')) {
          const uploadRes = await fetch(data.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': mimeType },
            body: blob,
          });
          if (uploadRes.ok && data.publicUrl) {
            finalUrl = data.publicUrl;
          }
        }
      } catch {}

      if (!finalUrl) {
        finalUrl = dataUrl;
      }

      // 2. Persist to database (send both bannerUrl and imageUrl)
      await api.put(`/batches/${batchId}`, { bannerUrl: finalUrl, imageUrl: finalUrl });

      // 3. Invalidate API navigation cache so re-fetch never restores stale data
      api.invalidateCache('/batches');

      // 4. Update React state & persistence cache immediately
      setBatches((prev) => {
        const next = prev.map((b) => (b.id === batchId ? { ...b, imageUrl: finalUrl } : b));
        persistCache({ batches: next });
        return next;
      });

      // 5. Broadcast event across windows and components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('examly-batches-changed'));
      }

      setUploadToast('Batch cover updated in 16:9 ratio!');
      setTimeout(() => setUploadToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || err?.response?.data?.message || 'Failed to update batch cover image.');
    } finally {
      setUploadingBatchId(null);
    }
  };

  const handleRemoveBatchCover = async (batchId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadingBatchId(batchId);
    try {
      await api.put(`/batches/${batchId}`, { bannerUrl: '', imageUrl: '' });
      api.invalidateCache('/batches');
      setBatches((prev) => {
        const next = prev.map((b) => (b.id === batchId ? { ...b, imageUrl: null } : b));
        persistCache({ batches: next });
        return next;
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('examly-batches-changed'));
      }
      setUploadToast('Batch cover reset to 3D artwork.');
      setTimeout(() => setUploadToast(null), 3500);
    } catch {
      alert('Failed to reset cover image.');
    } finally {
      setUploadingBatchId(null);
    }
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

      // 3. Data Fetching based on Role
      api
        .get('/dashboard/student', config)
        .then((res) => {
          if (!active) return;
          const data = res.data;
          setStudentData(data);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('examly.student.dashboard.cache', JSON.stringify(data));
            } catch {}
          }
        })
        .catch(() => {});

      if (!isStudent) {
        // 4. Fetch Recent Students (limit 5)
        api
          .get('/users/students?limit=5', config)
          .then((res) => {
            if (!active) return;
            const stdList = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            const total = res.data?.meta?.total ?? stdList.length;
            setRecentStudents(stdList.slice(0, 5));
            setStudentsCount(total);
            persistCache({ recentStudents: stdList.slice(0, 5), studentsCount: total });
          })
          .catch(() => {});

        // 5. Fetch Recent Faculty (limit 5)
        api
          .get('/users/teachers', config)
          .then((res) => {
            if (!active) return;
            const facList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setRecentTeachers(facList.slice(0, 5));
            setTeachersCount(facList.length);
            persistCache({ recentTeachers: facList.slice(0, 5), teachersCount: facList.length });
          })
          .catch(() => {});
      }
    };

    void fetchData(false);

    const backgroundRefresh = () => {
      void fetchData(false);
    };

    window.addEventListener('focus', backgroundRefresh);
    window.addEventListener('examly-permissions-changed', backgroundRefresh);
    window.addEventListener('examly-refresh-dashboard', backgroundRefresh);
    window.addEventListener('examly-batches-changed', backgroundRefresh);

    return () => {
      active = false;
      window.removeEventListener('focus', backgroundRefresh);
      window.removeEventListener('examly-permissions-changed', backgroundRefresh);
      window.removeEventListener('examly-refresh-dashboard', backgroundRefresh);
      window.removeEventListener('examly-batches-changed', backgroundRefresh);
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

  // Dashboard sorted tests: Live tests first, then scheduled/upcoming, then others
  const sortedDashboardTests = useMemo(() => {
    return [...tests].sort((a, b) => {
      const aEnded = isTestEnded(a);
      const bEnded = isTestEnded(b);
      const aLive = (a.testStatus === 'LIVE' || a.isPublished) && !aEnded;
      const bLive = (b.testStatus === 'LIVE' || b.isPublished) && !bEnded;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;

      const aSched = !aEnded && !aLive && (a.testStatus === 'SCHEDULED' || !!a.startDateTime);
      const bSched = !bEnded && !bLive && (b.testStatus === 'SCHEDULED' || !!b.startDateTime);
      if (aSched && !bSched) return -1;
      if (!aSched && bSched) return 1;

      if (!aEnded && bEnded) return -1;
      if (aEnded && !bEnded) return 1;

      return 0;
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

      {/* ── 2. QUICK ACTIONS BAR (ADMIN & FACULTY ONLY) ── */}
      {!isStudent && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Link
            href="/batches"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#EEF2FF] hover:bg-[#E0E7FF] dark:bg-[#1E1B4B]/50 dark:hover:bg-[#1E1B4B]/80 border border-[#C7D2FE]/60 dark:border-[#312E81]/40 transition-all group shadow-2xs hover:shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-white/10 flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8] shadow-2xs shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Create batch
            </span>
          </Link>

          <Link
            href="/students"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#ECFDF5] hover:bg-[#D1FAE5] dark:bg-[#064E3B]/40 dark:hover:bg-[#064E3B]/70 border border-[#A7F3D0]/60 dark:border-[#065F46]/40 transition-all group shadow-2xs hover:shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-white/10 flex items-center justify-center text-[#059669] dark:text-[#34D399] shadow-2xs shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Add student
            </span>
          </Link>

          <Link
            href="/teachers"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FFFBEB] hover:bg-[#FEF3C7] dark:bg-[#451A03]/40 dark:hover:bg-[#451A03]/70 border border-[#FDE68A]/60 dark:border-[#78350F]/40 transition-all group shadow-2xs hover:shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-white/10 flex items-center justify-center text-[#D97706] dark:text-[#FBBF24] shadow-2xs shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Add teacher
            </span>
          </Link>

          <Link
            href="/tests/create"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FDF2F8] hover:bg-[#FCE7F3] dark:bg-[#500724]/40 dark:hover:bg-[#500724]/70 border border-[#FBCFE8]/60 dark:border-[#831843]/40 transition-all group shadow-2xs hover:shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-white/10 flex items-center justify-center text-[#DB2777] dark:text-[#F472B6] shadow-2xs shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Create test
            </span>
          </Link>

          <Link
            href="/batches"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#ECFEFF] hover:bg-[#CFFAFE] dark:bg-[#083344]/40 dark:hover:bg-[#083344]/70 border border-[#A5F3FC]/60 dark:border-[#155E75]/40 transition-all group shadow-2xs hover:shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-white/10 flex items-center justify-center text-[#0891B2] dark:text-[#38BDF8] shadow-2xs shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Add class
            </span>
          </Link>

          <Link
            href="/videos"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F5F3FF] hover:bg-[#EDE9FE] dark:bg-[#2E1065]/40 dark:hover:bg-[#2E1065]/70 border border-[#DDD6FE]/60 dark:border-[#4C1D95]/40 transition-all group shadow-2xs hover:shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-white/10 flex items-center justify-center text-[#7C3AED] dark:text-[#A78BFA] shadow-2xs shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Upload video
            </span>
          </Link>
        </div>
      )}

      {/* ── 3. BATCHES & TESTS OVERVIEW (2-COLUMN GRID) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
        {/* LEFT: BATCHES */}
        <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {isStudent ? 'My Enrolled Batch' : 'Batches'}
            </h3>
            <Link
              href="/batches"
              className="px-3.5 py-1 bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 text-[#4F46E5] dark:text-[#818CF8] text-xs font-bold rounded-full hover:bg-[#E0E7FF] dark:hover:bg-[#1E1B4B] transition-colors"
            >
              View all
            </Link>
          </div>

          {/* Batches Rows */}
          <div className="space-y-2.5">
            {batches.slice(0, 4).map((b) => {
              const enrolled = b._count?.students ?? 0;
              const testCount = b._count?.tests ?? b.tests?.length ?? 0;
              const isAct = b.status === 'ACTIVE' || !b.status;
              const isDrf = b.status === 'DRAFT';

              return (
                <Link
                  key={b.id}
                  href={`/batches/${b.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {isStudent ? b.name?.replace(/🎓\s*/g, '') : b.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {enrolled} students · {testCount} tests
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      isAct
                        ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#064E3B]/60 dark:text-[#34D399]'
                        : isDrf
                        ? 'bg-[#FEF3C7] text-[#D97706] dark:bg-[#451A03]/60 dark:text-[#FBBF24]'
                        : 'bg-[#F3E8FF] text-[#9333EA] dark:bg-[#2E1065]/60 dark:text-[#C084FC]'
                    }`}
                  >
                    {b.status === 'DRAFT' ? 'Draft' : b.status === 'ARCHIVED' ? 'Archived' : 'Active'}
                  </span>
                </Link>
              );
            })}

            {batches.length === 0 && (
              <div className="py-2.5 px-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <GraduationCap className="w-4 h-4 text-brand-500 opacity-70 shrink-0" />
                <span>{isStudent ? 'Not enrolled in any batch' : 'No batches created yet'}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: TESTS */}
        <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Tests
            </h3>
            <div className="flex items-center gap-2">
              <Link
                href="/tests"
                className="px-3.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full hover:bg-amber-500/20 transition-colors"
              >
                Upcoming tests
              </Link>
              <Link
                href="/tests"
                className="px-3.5 py-1 bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 text-[#4F46E5] dark:text-[#818CF8] text-xs font-bold rounded-full hover:bg-[#E0E7FF] dark:hover:bg-[#1E1B4B] transition-colors"
              >
                View all
              </Link>
            </div>
          </div>

          {/* Tests Rows */}
          <div className="space-y-2.5">
            {sortedDashboardTests.slice(0, 4).map((t) => {
              const ended = isTestEnded(t);
              const isLive = (t.testStatus === 'LIVE' || t.isPublished) && !ended;
              const isSched = !ended && !isLive && (t.testStatus === 'SCHEDULED' || !!t.startDateTime);
              const isDraft = t.testStatus === 'DRAFT';

              const badgeStatus = isLive ? 'Live' : isSched ? 'Scheduled' : ended ? 'Completed' : isDraft ? 'Draft' : 'Active';

              return (
                <Link
                  key={t.id}
                  href={isStudent ? `/tests/${t.id}/runner` : `/tests/${t.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      {isLive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block shrink-0" />
                      )}
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {t.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                      {t.type ? t.type.replace('_', ' ').toLowerCase() : 'Batch test'} · {t.batch?.name || 'All Batches'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      isLive
                        ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#064E3B]/60 dark:text-[#34D399]'
                        : isSched
                        ? 'bg-[#FEF3C7] text-[#D97706] dark:bg-[#451A03]/60 dark:text-[#FBBF24]'
                        : ended
                        ? 'bg-[#EDE9FE] text-[#6366F1] dark:bg-[#312E81]/60 dark:text-[#A5B4FC]'
                        : 'bg-[#F3E8FF] text-[#9333EA] dark:bg-[#2E1065]/60 dark:text-[#C084FC]'
                    }`}
                  >
                    {badgeStatus}
                  </span>
                </Link>
              );
            })}

            {tests.length === 0 && (
              <div className="py-2.5 px-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <FileCheck2 className="w-4 h-4 text-rose-500 opacity-70 shrink-0" />
                <span>No tests available yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. TIMETABLE SCHEDULE: TODAY'S CLASSES ── */}
      <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Today’s classes
          </h3>
          <Link
            href="/batches"
            className="px-3.5 py-1 bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 text-[#4F46E5] dark:text-[#818CF8] text-xs font-bold rounded-full hover:bg-[#E0E7FF] dark:hover:bg-[#1E1B4B] transition-colors"
          >
            Open timetable
          </Link>
        </div>

        <div className="space-y-2.5">
          {(studentData?.todayClasses || []).map((c: any, idx: number) => {
            const timeColors = ['bg-[#2563EB]', 'bg-[#EC4899]', 'bg-[#059669]', 'bg-[#7C3AED]'];
            const badgeColor = timeColors[idx % timeColors.length];
            const status = c.status || 'Upcoming';
            const isLive = status.toLowerCase() === 'live';
            const isCancelled = status.toLowerCase() === 'cancelled';
            const isCompleted = status.toLowerCase() === 'completed';

            return (
              <div
                key={c.id || idx}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`px-2.5 py-1.5 rounded-xl ${badgeColor} text-white font-mono font-bold text-xs shrink-0 shadow-2xs`}>
                    {c.startTime || '07:00'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {c.subject?.name || 'Subject'}
                      </h4>
                      {c.subject?.code && (
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {c.subject.code}
                        </span>
                      )}
                      {c.topic && (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          · {c.topic}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                      {c.batch?.name || studentData?.batch?.name || 'Class Batch'} · {c.teacher?.fullName || 'Faculty Instructor'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isLive
                      ? 'bg-[#FEF3C7] text-[#D97706] dark:bg-[#451A03]/60 dark:text-[#FBBF24]'
                      : isCancelled
                      ? 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/60 dark:text-[#FCA5A5]'
                      : isCompleted
                      ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#064E3B]/60 dark:text-[#34D399]'
                      : 'bg-[#EDE9FE] text-[#6366F1] dark:bg-[#312E81]/60 dark:text-[#A5B4FC]'
                  }`}
                >
                  {status}
                </span>
              </div>
            );
          })}

          {(!studentData?.todayClasses || studentData.todayClasses.length === 0) && (
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Clock className="w-4 h-4 text-brand-500 opacity-70 shrink-0" />
              <span>No classes scheduled for today</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. CONDITIONAL: RECENT ROSTERS (ADMIN) vs TEST RESULTS (STUDENT) ── */}
      {isStudent ? (
        /* MY RECENT TEST RESULTS */
        <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              My Recent Test Results
            </h3>
            <Link
              href="/tests"
              className="px-3.5 py-1 bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 text-[#4F46E5] dark:text-[#818CF8] text-xs font-bold rounded-full hover:bg-[#E0E7FF] dark:hover:bg-[#1E1B4B] transition-colors"
            >
              All Tests
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(studentData?.recentAttempts || []).slice(0, 4).map((att: any) => {
              const percentage = att.result?.percentage ?? Math.round(((att.score || 0) / (att.test?.totalMarks || 100)) * 100);
              const isPassed = percentage >= (att.test?.passMarks ?? 40);

              return (
                <div
                  key={att.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#0D0F16] border border-slate-200/80 dark:border-[#171A27] flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {att.test?.title || 'Examination'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>Score: {att.result?.totalMarksObtained ?? att.score ?? 0} / {att.test?.totalMarks ?? 100}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(att.submittedAt)}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                      isPassed
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {percentage}% {isPassed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              );
            })}

            {(!studentData?.recentAttempts || studentData.recentAttempts.length === 0) && (
              <div className="col-span-full py-2.5 px-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <FileCheck2 className="w-4 h-4 text-emerald-500 opacity-70 shrink-0" />
                <span>No test attempts completed yet</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ADMIN & FACULTY: RECENT STUDENTS & TEACHERS (2-COLUMN GRID) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
          {/* RECENTLY JOINED STUDENTS */}
          <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Recently joined students
              </h3>
              <Link
                href="/students"
                className="px-3.5 py-1 bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 text-[#4F46E5] dark:text-[#818CF8] text-xs font-bold rounded-full hover:bg-[#E0E7FF] dark:hover:bg-[#1E1B4B] transition-colors"
              >
                All students
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentStudents.slice(0, 5).map((s) => {
                const feeStatus = s.studentProfile?.feeStatus;
                const isPaid = feeStatus === 'PAID';
                const isOverdue = feeStatus === 'OVERDUE';
                const isPartial = feeStatus === 'PARTIAL';
                const feeLabel = isPaid
                  ? 'Paid fully'
                  : isOverdue
                  ? 'Overdue'
                  : isPartial
                  ? 'Partial'
                  : s.status === 'BLOCKED'
                  ? 'Blocked'
                  : 'Active';

                return (
                  <Link
                    key={s.id}
                    href={`/students/${s.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {s.avatarUrl ? (
                        <img
                          src={s.avatarUrl}
                          alt={s.fullName}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                          {s.fullName?.[0]?.toUpperCase() || 'S'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {s.fullName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                          Joined {formatTimeAgo(s.createdAt)} · {s.studentProfile?.batch?.name || 'No batch'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        isPaid || feeLabel === 'Active'
                          ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#064E3B]/60 dark:text-[#34D399]'
                          : isOverdue || feeLabel === 'Blocked'
                          ? 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/60 dark:text-[#FCA5A5]'
                          : 'bg-[#FEF3C7] text-[#D97706] dark:bg-[#451A03]/60 dark:text-[#FBBF24]'
                      }`}
                    >
                      {feeLabel}
                    </span>
                  </Link>
                );
              })}

              {recentStudents.length === 0 && (
                <div className="py-2.5 px-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Users className="w-4 h-4 text-blue-500 opacity-70 shrink-0" />
                  <span>No students recorded</span>
                </div>
              )}
            </div>
          </div>

          {/* RECENTLY JOINED TEACHERS */}
          <div className="bg-white dark:bg-[#090B10] border border-slate-200/90 dark:border-[#161824] rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Recently joined teachers
              </h3>
              <Link
                href="/teachers"
                className="px-3.5 py-1 bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 text-[#4F46E5] dark:text-[#818CF8] text-xs font-bold rounded-full hover:bg-[#E0E7FF] dark:hover:bg-[#1E1B4B] transition-colors"
              >
                All teachers
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentTeachers.slice(0, 5).map((t) => {
                const isBlocked = t.status === 'BLOCKED';
                const subjects =
                  t.teacherProfile?.specialization ||
                  t.subjects?.map((sub: any) => sub.name).join(', ') ||
                  'Faculty';

                return (
                  <Link
                    key={t.id}
                    href={`/teachers/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={t.fullName}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                          {t.fullName?.[0]?.toUpperCase() || 'T'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {t.fullName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                          {subjects} · joined {formatTimeAgo(t.createdAt)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        isBlocked
                          ? 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/60 dark:text-[#FCA5A5]'
                          : 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#064E3B]/60 dark:text-[#34D399]'
                      }`}
                    >
                      {isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </Link>
                );
              })}

              {recentTeachers.length === 0 && (
                <div className="py-2.5 px-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <UserCheck className="w-4 h-4 text-amber-500 opacity-70 shrink-0" />
                  <span>No teachers recorded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Notification Pill */}
      {uploadToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-[#10131F]/95 backdrop-blur-md border border-emerald-500/40 text-white text-xs font-bold shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadToast}</span>
        </div>
      )}
    </div>
  );
}
