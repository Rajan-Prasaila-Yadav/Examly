// apps/web/src/components/dashboard-feature-rail.tsx
'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface FeatureRailProps {
  batchesCount?: number;
  liveTestsCount?: number;
  totalTestsCount?: number;
  subjectsCount?: number;
  studentsCount?: number;
  teachersCount?: number;
  studentId?: string;
}

export default function DashboardFeatureRail({
  batchesCount = 0,
  liveTestsCount = 0,
  totalTestsCount = 0,
  subjectsCount = 0,
  studentsCount = 0,
  teachersCount = 0,
  studentId,
}: FeatureRailProps) {
  const { user } = useAuth();
  const railRef = useRef<HTMLDivElement>(null);

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

  const scroll = (direction: number) => {
    if (railRef.current) {
      const scrollAmount = railRef.current.clientWidth * 0.75;
      railRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  // 1. Mock Tests (3D Blue Clipboard, Ruled Paper, Pencil & Stickers)
  const MockTestsArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="folderBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#70A8FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="pencilWood" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <ellipse cx="52" cy="78" rx="30" ry="5" fill="#1E293B" opacity="0.22" />
      <rect x="26" y="12" width="50" height="62" rx="12" fill="url(#folderBlue)" transform="rotate(3 51 43)" />
      <rect x="30" y="16" width="42" height="54" rx="7" fill="#FFFFFF" transform="rotate(3 51 43)" />
      <line x1="36" y1="26" x2="65" y2="28" stroke="#93C5FD" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="36" y1="33" x2="62" y2="35" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="40" x2="58" y2="42" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="47" x2="55" y2="49" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 62 Q50 58 54 62 Q58 66 62 63" stroke="#1E293B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="58" cy="22" r="9" fill="#E50914" />
      <text x="58" y="26" fill="#FFFFFF" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">N</text>
      <circle cx="68" cy="46" r="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
      <path d="M68 43 L71 43 C72 45 71 49 68 49 C65.5 49 64 47 64 45 C64 43 65.5 41 68 41 C69.5 41 70.5 41.8 71 42.5" stroke="#4285F4" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="36" cy="56" r="6.5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
      <text x="36" y="59.5" fill="#1E293B" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">a</text>
      <g transform="translate(34, 38) rotate(32)">
        <rect x="0" y="0" width="8" height="28" rx="2" fill="url(#pencilWood)" />
        <polygon points="0,28 8,28 4,35" fill="#FDE68A" />
        <polygon points="3,33 5,33 4,35" fill="#1E293B" />
        <rect x="0" y="-3.5" width="8" height="3.5" fill="#94A3B8" />
        <rect x="0" y="-8" width="8" height="4.5" rx="1.5" fill="#FB7185" />
      </g>
    </svg>
  );

  // 2. Batches (3D Laptop with Graduation Mortarboard Cap)
  const CoursesArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="laptopLid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id="laptopDisplay" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="capTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      <rect x="22" y="24" width="56" height="38" rx="7" fill="url(#laptopLid)" />
      <rect x="26" y="28" width="48" height="30" rx="4" fill="url(#laptopDisplay)" />
      <line x1="32" y1="36" x2="48" y2="36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <line x1="32" y1="42" x2="60" y2="42" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M12 62 L88 62 L82 72 L18 72 Z" fill="#1E1B4B" />
      <rect x="42" y="64" width="16" height="2" rx="1" fill="#93C5FD" opacity="0.8" />
      <g transform="translate(48, 14) rotate(-6)">
        <polygon points="0,10 26,19 0,28 -26,19" fill="url(#capTop)" />
        <line x1="-26" y1="19" x2="0" y2="28" stroke="#4338CA" strokeWidth="1.8" />
        <line x1="0" y1="28" x2="26" y2="19" stroke="#312E81" strokeWidth="1.8" />
        <path d="M-15 22 C-15 29 15 29 15 22" fill="#1E1B4B" />
        <circle cx="0" cy="19" r="3.2" fill="#FBBF24" />
        <path d="M0 19 Q18 22 20 32" stroke="#F59E0B" strokeWidth="2.4" fill="none" />
        <circle cx="20" cy="32" r="3" fill="#D97706" />
      </g>
    </svg>
  );

  // 3. Subjects (3D Open Textbook with Knowledge Orb)
  const SubjectsArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      <path d="M50 36 C42 30 24 32 18 36 L18 66 C24 62 42 60 50 66 C58 60 76 62 82 66 L82 36 C76 32 58 30 50 36 Z" fill="url(#bookCover)" />
      <path d="M50 34 C42 28 25 30 20 34 L20 62 C25 58 42 56 50 62 C58 56 75 58 80 62 L80 34 C75 30 58 28 50 34 Z" fill="#FFFFFF" />
      <line x1="50" y1="34" x2="50" y2="64" stroke="#D97706" strokeWidth="2" />
      <line x1="28" y1="42" x2="42" y2="40" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="48" x2="40" y2="46" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="58" y1="40" x2="72" y2="42" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="58" y1="46" x2="70" y2="48" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="22" r="8" fill="#3B82F6" />
      <ellipse cx="50" cy="22" rx="14" ry="5" fill="none" stroke="#60A5FA" strokeWidth="1.5" transform="rotate(-20 50 22)" />
    </svg>
  );

  // 4. Video Lectures (3D Purple Display & Magenta Play Button)
  const VideosArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      <rect x="20" y="18" width="60" height="48" rx="14" fill="#7C3AED" />
      <rect x="24" y="22" width="52" height="40" rx="10" fill="#2E1065" />
      <circle cx="50" cy="42" r="16" fill="#F43F5E" />
      <polygon points="46,35 58,42 46,49" fill="#FFFFFF" />
      <circle cx="78" cy="22" r="3.5" fill="#C084FC" />
      <circle cx="18" cy="34" r="3" fill="#FB7185" />
    </svg>
  );

  // 5. Lecture Notes / Audit (3D Leather Briefcase, Documents & Gold Coin)
  const NotesArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="leatherCase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      <rect x="22" y="16" width="36" height="48" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
      <rect x="22" y="24" width="8" height="6" fill="#3B82F6" rx="1.5" />
      <rect x="22" y="34" width="8" height="6" fill="#3B82F6" rx="1.5" />
      <line x1="34" y1="26" x2="52" y2="26" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="34" x2="50" y2="34" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <rect x="32" y="28" width="52" height="42" rx="12" fill="url(#leatherCase)" />
      <path d="M48 28 C48 20 68 20 68 28" stroke="#7C2D12" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M32 38 L58 50 L84 38" stroke="#7C2D12" strokeWidth="2" fill="none" />
      <rect x="55" y="46" width="6" height="7" rx="1.5" fill="#FBBF24" />
      <ellipse cx="78" cy="66" rx="9" ry="6" fill="#F59E0B" />
      <ellipse cx="78" cy="64" rx="8" ry="5" fill="#FDE68A" />
      <text x="78" y="67" fill="#B45309" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">₹</text>
    </svg>
  );

  // 6. Discussions (3D Laptop with Video Call Avatars)
  const DiscussionsArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="screenNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      <rect x="22" y="32" width="56" height="34" rx="6" fill="#1E1B4B" />
      <rect x="25" y="35" width="50" height="28" rx="4" fill="url(#screenNavy)" />
      <path d="M14 66 L86 66 L80 74 L20 74 Z" fill="#0F172A" />
      <rect x="42" y="67" width="16" height="2" rx="1" fill="#64748B" />
      <g transform="translate(30, 24)">
        <circle cx="8" cy="8" r="14" fill="#F43F5E" />
        <circle cx="8" cy="8" r="12" fill="#FECDD3" />
        <circle cx="8" cy="6" r="4.5" fill="#E11D48" />
        <path d="M1 18 C1 13 15 13 15 18 Z" fill="#BE123C" />
      </g>
      <g transform="translate(56, 12)">
        <circle cx="8" cy="8" r="15" fill="#3B82F6" />
        <circle cx="8" cy="8" r="13" fill="#DBEAFE" />
        <circle cx="8" cy="6" r="5" fill="#1D4ED8" />
        <path d="M0 19 C0 14 16 14 16 19 Z" fill="#1E40AF" />
      </g>
      <polygon points="50,28 52,32 56,32 53,35 54,39 50,36 46,39 47,35 44,32 48,32" fill="#FDE047" />
    </svg>
  );

  // 7. Students & Faculty (Avatar Cluster with 5-Star Badge)
  const RosterArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      <g transform="translate(50, 42)">
        <circle cx="0" cy="-20" r="10" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="0" cy="-22" r="4" fill="#FEF3C7" />
        <path d="M-6 -12 C-6 -17 6 -17 6 -12 Z" fill="#D97706" />
        <circle cx="16" cy="-10" r="9" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="16" cy="-12" r="3.5" fill="#DBEAFE" />
        <circle cx="0" cy="-2" r="14" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="0" cy="-4" r="5.5" fill="#CFFAFE" />
        <path d="M-9 9 C-9 3 9 3 9 9 Z" fill="#0891B2" />
        <circle cx="-16" cy="14" r="9" fill="#EC4899" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="-16" cy="12" r="3.5" fill="#FCE7F3" />
        <circle cx="0" cy="18" r="9.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="0" cy="16" r="3.5" fill="#FEE2E2" />
        <circle cx="16" cy="16" r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="16" cy="14" r="3.5" fill="#D1FAE5" />
      </g>
      <g transform="translate(18, 42)">
        <rect x="0" y="0" width="28" height="16" rx="8" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.14))" />
        <polygon points="7,4 8.5,8 13,8 9.5,10.5 11,14 7,11.5 3,14 4.5,10.5 1,8 5.5,8" fill="#FBBF24" />
        <text x="19" y="12" fill="#1E293B" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">5</text>
      </g>
    </svg>
  );

  // 8. Security (3D Metallic Shield with Keyhole)
  const SecurityArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="30" ry="5.5" fill="#1E293B" opacity="0.22" />
      <path d="M50 14 L78 24 C78 50 50 68 50 68 C50 68 22 50 22 24 Z" fill="url(#shieldGrad)" />
      <path d="M50 18 L74 26 C74 48 50 64 50 64 C50 64 26 48 26 26 Z" fill="#B91C1C" />
      <path d="M50 18 L26 26 C26 48 50 64 50 64 Z" fill="#FFFFFF" opacity="0.15" />
      <circle cx="50" cy="38" r="6" fill="#FFFFFF" />
      <rect x="47.5" y="40" width="5" height="8" rx="1.5" fill="#FFFFFF" />
    </svg>
  );

  // 9. Performance (3D Shiny Golden Trophy)
  const TrophyArt = (
    <svg viewBox="0 0 100 85" className="w-[58px] h-[50px] sm:w-[84px] sm:h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2A3" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="pedestal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2A2421" />
          <stop offset="50%" stopColor="#181311" />
          <stop offset="100%" stopColor="#0B0908" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="77" rx="30" ry="5.5" fill="#1E293B" opacity="0.22" />
      <ellipse cx="50" cy="74" rx="22" ry="5" fill="url(#pedestal)" />
      <path d="M28 74 C28 76 72 76 72 74 L70 67 C70 65 30 65 30 67 Z" fill="url(#pedestal)" />
      <ellipse cx="50" cy="67" rx="20" ry="4" fill="#3D342E" />
      <ellipse cx="50" cy="63" rx="9" ry="2.5" fill="#F59E0B" />
      <path d="M44 52 C44 58 45 63 50 63 C55 63 56 58 56 52 Z" fill="url(#goldCup)" />
      <path d="M26 26 C12 26 13 46 29 45" stroke="url(#goldCup)" strokeWidth="4.2" fill="none" strokeLinecap="round" />
      <path d="M74 26 C88 26 87 46 71 45" stroke="url(#goldCup)" strokeWidth="4.2" fill="none" strokeLinecap="round" />
      <path d="M27 20 C27 52 73 52 73 20 Z" fill="url(#goldCup)" />
      <ellipse cx="50" cy="20" rx="23" ry="5.5" fill="url(#goldRim)" />
      <ellipse cx="50" cy="20" rx="20" ry="4" fill="#B45309" />
      <path d="M33 24 C31 32 35 44 43 48" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" opacity="0.65" fill="none" />
      <path d="M45 23 C45 28 47 38 49 42" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" fill="none" />
    </svg>
  );

  // EXACT REQUESTED ORDER:
  // 1. Batches, 2. Subjects, 3. Mock Tests, 4. Students, 5. Faculty, 6. Discussions, 7. Audit Logs, 8. Security
  const items = isStudent
    ? [
        {
          id: 'batches',
          title: 'Batches',
          href: '/batches',
          art: CoursesArt,
        },
        {
          id: 'subjects',
          title: 'Subjects',
          href: '/curriculum',
          art: SubjectsArt,
        },
        {
          id: 'tests',
          title: 'Mock Tests',
          href: '/tests',
          art: MockTestsArt,
        },
        {
          id: 'videos',
          title: 'Video Lectures',
          href: '/videos',
          art: VideosArt,
        },
        {
          id: 'notes',
          title: 'Lecture Notes',
          href: '/notes',
          art: NotesArt,
        },
        {
          id: 'discussions',
          title: 'Discussions',
          href: '/community',
          art: DiscussionsArt,
        },
        {
          id: 'performance',
          title: 'My Performance',
          href: studentId ? `/students/${studentId}` : '/students',
          art: TrophyArt,
        },
      ]
    : isTeacher
    ? [
        {
          id: 'batches',
          title: 'Batches',
          href: '/batches',
          art: CoursesArt,
        },
        {
          id: 'subjects',
          title: 'Subjects',
          href: '/curriculum',
          art: SubjectsArt,
        },
        {
          id: 'tests',
          title: 'Mock Tests',
          href: '/tests/builder',
          art: MockTestsArt,
        },
        {
          id: 'students',
          title: 'Students',
          href: '/students',
          art: RosterArt,
        },
        {
          id: 'videos',
          title: 'Video Lectures',
          href: '/videos',
          art: VideosArt,
        },
        {
          id: 'notes',
          title: 'Study Notes',
          href: '/notes',
          art: NotesArt,
        },
        {
          id: 'discussions',
          title: 'Discussions',
          href: '/community',
          art: DiscussionsArt,
        },
      ]
    : [
        {
          id: 'batches',
          title: 'Batches',
          href: '/batches',
          art: CoursesArt,
        },
        {
          id: 'subjects',
          title: 'Subjects',
          href: '/curriculum',
          art: SubjectsArt,
        },
        {
          id: 'tests',
          title: 'Mock Tests',
          href: '/tests/builder',
          art: MockTestsArt,
        },
        {
          id: 'students',
          title: 'Students',
          href: '/students',
          art: RosterArt,
        },
        {
          id: 'faculty',
          title: 'Faculty',
          href: '/teachers',
          art: RosterArt,
        },
        {
          id: 'discussions',
          title: 'Discussions',
          href: '/community',
          art: DiscussionsArt,
        },
        {
          id: 'audit',
          title: 'Audit Logs',
          href: '/settings/audit',
          art: NotesArt,
        },
        {
          id: 'security',
          title: 'Security',
          href: '/settings/roles',
          art: SecurityArt,
        },
      ];

  return (
    <section className="relative w-full pb-2 select-none" aria-label="Explore Capabilities">
      {/* 
        Responsive layout matching reference:
        - Mobile: EXACT 3-Column Grid matching Image 2 (grid grid-cols-3)
        - Desktop (sm and up): Smooth horizontal track with scroll snap and chevron arrows
      */}
      <div
        ref={railRef}
        className="grid grid-cols-3 gap-2.5 sm:gap-3.5 sm:flex sm:items-center sm:overflow-x-auto pb-2 sm:pb-4 pt-1 px-0.5 sm:scroll-smooth sm:snap-x sm:snap-mandatory sm:scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex flex-col items-center justify-between p-2 sm:p-3 rounded-[22px] sm:rounded-[30px] w-full sm:w-[130px] h-[130px] sm:h-[156px] sm:shrink-0 sm:snap-start bg-gradient-to-b from-[#F0F6FE] via-[#E8F2FD] to-[#DFEDFC] dark:from-[#1D203C] dark:via-[#161830] dark:to-[#111224] border border-blue-100/70 dark:border-[#2A2E50] shadow-[0_2px_10px_rgba(59,130,246,0.05)] dark:shadow-none hover:shadow-[0_10px_22px_rgba(59,130,246,0.14)] dark:hover:shadow-[0_10px_22px_rgba(139,128,245,0.18)] hover:border-brand-400 dark:hover:border-brand-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden text-center"
          >
            {/* Top-right subtle glossy shine curve */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/40 dark:bg-white/5 rounded-full blur-xs pointer-events-none" />

            {/* Top Title - NO Gemini/sparkle symbol */}
            <div className="w-full pt-1 px-1 z-10">
              <h3 className="text-[12px] sm:text-[13.5px] font-bold text-[#19243C] dark:text-[#F1F5F9] leading-tight text-center line-clamp-2">
                {item.title}
              </h3>
            </div>

            {/* Center / Bottom 3D Illustration */}
            <div className="flex-1 flex items-end justify-center pb-1 w-full z-10">
              {item.art}
            </div>
          </Link>
        ))}
      </div>

      {/* Navigation Arrows for desktop scroll */}
      <div className="hidden sm:flex items-center justify-end gap-1.5 mt-0.5 pr-1">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Previous capabilities"
          className="w-7 h-7 rounded-full bg-white dark:bg-[#191A30] border border-slate-200 dark:border-[#2A2C4A] hover:border-brand-500 dark:hover:border-brand-500 text-slate-600 dark:text-[#ECECFA] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Next capabilities"
          className="w-7 h-7 rounded-full bg-white dark:bg-[#191A30] border border-slate-200 dark:border-[#2A2C4A] hover:border-brand-500 dark:hover:border-brand-500 text-slate-600 dark:text-[#ECECFA] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
