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

// Sparkle Component matching the Unstop reference (purple 4-point star + smaller light star)
function ReferenceSparkle({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute top-8 left-3 z-10 pointer-events-none select-none flex items-center ${className}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        {/* Main 4-point purple star */}
        <path
          d="M10 2 C10 6 6 10 2 10 C6 10 10 14 10 18 C10 14 14 10 18 10 C14 10 10 6 10 2 Z"
          fill="#8B5CF6"
        />
        {/* Secondary small cyan star */}
        <path
          d="M17 14 C17 15.8 15.2 17 13.5 17 C15.2 17 17 18.2 17 20 C17 18.2 18.8 17 20.5 17 C18.8 17 17 15.8 17 14 Z"
          fill="#38BDF8"
        />
      </svg>
    </div>
  );
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

  // 3D SVG Artwork designed to match the reference images accurately:
  // 1. Competitions (Golden Trophy)
  const TrophyArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
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
      {/* Soft ground shadow */}
      <ellipse cx="50" cy="77" rx="30" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* 3D Round Pedestal Base */}
      <ellipse cx="50" cy="74" rx="22" ry="5" fill="url(#pedestal)" />
      <path d="M28 74 C28 76 72 76 72 74 L70 67 C70 65 30 65 30 67 Z" fill="url(#pedestal)" />
      <ellipse cx="50" cy="67" rx="20" ry="4" fill="#3D342E" />
      {/* Gold Ring Collar on Stem */}
      <ellipse cx="50" cy="63" rx="9" ry="2.5" fill="#F59E0B" />
      {/* Trophy Stem */}
      <path d="M44 52 C44 58 45 63 50 63 C55 63 56 58 56 52 Z" fill="url(#goldCup)" />
      {/* Handles */}
      <path d="M26 26 C12 26 13 46 29 45" stroke="url(#goldCup)" strokeWidth="4.2" fill="none" strokeLinecap="round" />
      <path d="M74 26 C88 26 87 46 71 45" stroke="url(#goldCup)" strokeWidth="4.2" fill="none" strokeLinecap="round" />
      {/* Trophy Main Cup */}
      <path d="M27 20 C27 52 73 52 73 20 Z" fill="url(#goldCup)" />
      {/* Cup Rim */}
      <ellipse cx="50" cy="20" rx="23" ry="5.5" fill="url(#goldRim)" />
      <ellipse cx="50" cy="20" rx="20" ry="4" fill="#B45309" />
      {/* Specular Gloss Reflection */}
      <path d="M33 24 C31 32 35 44 43 48" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" opacity="0.65" fill="none" />
      <path d="M45 23 C45 28 47 38 49 42" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" fill="none" />
    </svg>
  );

  // 2. Mock Tests (Blue Clipboard, Ruled Paper, Pencil & Brand Stickers)
  const MockTestsArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
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
      {/* Ground Shadow */}
      <ellipse cx="52" cy="78" rx="30" ry="5" fill="#1E293B" opacity="0.22" />
      {/* Blue 3D Clipboard Folder */}
      <rect x="26" y="12" width="50" height="62" rx="12" fill="url(#folderBlue)" transform="rotate(3 51 43)" />
      {/* White Paper Sheet */}
      <rect x="30" y="16" width="42" height="54" rx="7" fill="#FFFFFF" transform="rotate(3 51 43)" />
      {/* Paper Lines */}
      <line x1="36" y1="26" x2="65" y2="28" stroke="#93C5FD" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="36" y1="33" x2="62" y2="35" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="40" x2="58" y2="42" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="47" x2="55" y2="49" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      {/* Signature Squiggle */}
      <path d="M46 62 Q50 58 54 62 Q58 66 62 63" stroke="#1E293B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Red 'N' Sticker (Netflix Style) */}
      <circle cx="58" cy="22" r="9" fill="#E50914" />
      <text x="58" y="26" fill="#FFFFFF" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">N</text>
      {/* Google 'G' Style Circular Sticker */}
      <circle cx="68" cy="46" r="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
      <path d="M68 43 L71 43 C72 45 71 49 68 49 C65.5 49 64 47 64 45 C64 43 65.5 41 68 41 C69.5 41 70.5 41.8 71 42.5" stroke="#4285F4" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Amazon 'a' Style Circular Sticker */}
      <circle cx="36" cy="56" r="6.5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
      <text x="36" y="59.5" fill="#1E293B" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">a</text>
      {/* 3D Angled Pencil with Pink Eraser */}
      <g transform="translate(34, 38) rotate(32)">
        <rect x="0" y="0" width="8" height="28" rx="2" fill="url(#pencilWood)" />
        <polygon points="0,28 8,28 4,35" fill="#FDE68A" />
        <polygon points="3,33 5,33 4,35" fill="#1E293B" />
        <rect x="0" y="-3.5" width="8" height="3.5" fill="#94A3B8" />
        <rect x="0" y="-8" width="8" height="4.5" rx="1.5" fill="#FB7185" />
      </g>
    </svg>
  );

  // 3. Courses (Laptop with Graduation Mortarboard Cap)
  const CoursesArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
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
      {/* Ground Shadow */}
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* Laptop Screen Body */}
      <rect x="22" y="24" width="56" height="38" rx="7" fill="url(#laptopLid)" />
      <rect x="26" y="28" width="48" height="30" rx="4" fill="url(#laptopDisplay)" />
      {/* Screen Graphics */}
      <line x1="32" y1="36" x2="48" y2="36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <line x1="32" y1="42" x2="60" y2="42" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      {/* Laptop Base Keyboard */}
      <path d="M12 62 L88 62 L82 72 L18 72 Z" fill="#1E1B4B" />
      <rect x="42" y="64" width="16" height="2" rx="1" fill="#93C5FD" opacity="0.8" />
      {/* 3D Graduation Mortarboard Cap resting on laptop */}
      <g transform="translate(48, 14) rotate(-6)">
        {/* Diamond Mortarboard Top */}
        <polygon points="0,10 26,19 0,28 -26,19" fill="url(#capTop)" />
        {/* Cap Edge Highlight */}
        <line x1="-26" y1="19" x2="0" y2="28" stroke="#4338CA" strokeWidth="1.8" />
        <line x1="0" y1="28" x2="26" y2="19" stroke="#312E81" strokeWidth="1.8" />
        {/* Skullcap Underneath */}
        <path d="M-15 22 C-15 29 15 29 15 22" fill="#1E1B4B" />
        {/* Golden Button Center */}
        <circle cx="0" cy="19" r="3.2" fill="#FBBF24" />
        {/* Golden Tassel */}
        <path d="M0 19 Q18 22 20 32" stroke="#F59E0B" strokeWidth="2.4" fill="none" />
        <circle cx="20" cy="32" r="3" fill="#D97706" />
      </g>
    </svg>
  );

  // 4. Mock Interviews / Discussion (Laptop with Floating Avatar Video Bubbles)
  const MockInterviewsArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="screenNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* Laptop Screen */}
      <rect x="22" y="32" width="56" height="34" rx="6" fill="#1E1B4B" />
      <rect x="25" y="35" width="50" height="28" rx="4" fill="url(#screenNavy)" />
      {/* Laptop Base */}
      <path d="M14 66 L86 66 L80 74 L20 74 Z" fill="#0F172A" />
      <rect x="42" y="67" width="16" height="2" rx="1" fill="#64748B" />
      {/* Floating Left Avatar Bubble (Student) */}
      <g transform="translate(30, 24)">
        <circle cx="8" cy="8" r="14" fill="#F43F5E" />
        <circle cx="8" cy="8" r="12" fill="#FECDD3" />
        {/* Avatar Head/Body */}
        <circle cx="8" cy="6" r="4.5" fill="#E11D48" />
        <path d="M1 18 C1 13 15 13 15 18 Z" fill="#BE123C" />
      </g>
      {/* Floating Right Avatar Bubble (Interviewer / Mentor) */}
      <g transform="translate(56, 12)">
        <circle cx="8" cy="8" r="15" fill="#3B82F6" />
        <circle cx="8" cy="8" r="13" fill="#DBEAFE" />
        {/* Avatar Head/Body */}
        <circle cx="8" cy="6" r="5" fill="#1D4ED8" />
        <path d="M0 19 C0 14 16 14 16 19 Z" fill="#1E40AF" />
      </g>
      {/* Sparkle connection star */}
      <polygon points="50,28 52,32 56,32 53,35 54,39 50,36 46,39 47,35 44,32 48,32" fill="#FDE047" />
    </svg>
  );

  // 5. Hackathons / Test Suite (3D Browser Window with glowing </> Code Bracket)
  const HackathonsArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="codeWin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* 3D Browser Window Base */}
      <rect x="22" y="16" width="56" height="52" rx="10" fill="url(#codeWin)" transform="rotate(-3 50 42)" />
      {/* Window Header Bar with Dots */}
      <rect x="24" y="18" width="52" height="12" rx="6" fill="#3730A3" transform="rotate(-3 50 42)" />
      <circle cx="30" cy="24" r="2" fill="#F43F5E" />
      <circle cx="36" cy="24" r="2" fill="#FBBF24" />
      <circle cx="42" cy="24" r="2" fill="#34D399" />
      {/* Center Black Glass Screen */}
      <rect x="26" y="30" width="48" height="34" rx="6" fill="#18181B" transform="rotate(-3 50 42)" />
      {/* Glowing </> Code Mark */}
      <text x="50" y="54" fill="#67E8F9" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="monospace" transform="rotate(-3 50 42)">
        &lt;/&gt;
      </text>
      {/* Floating Tag Badges */}
      <rect x="14" y="38" width="16" height="8" rx="3" fill="#FB923C" opacity="0.85" />
      <rect x="74" y="44" width="18" height="18" rx="4" fill="#3B82F6" opacity="0.9" />
      <line x1="78" y1="50" x2="88" y2="50" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <line x1="78" y1="56" x2="86" y2="56" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  // 6. Mentorships / Faculty (Circular Avatar Cluster with ⭐ 5 Pill)
  const MentorshipsArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* Avatar Cluster */}
      <g transform="translate(50, 42)">
        {/* Top Center Avatar */}
        <circle cx="0" cy="-20" r="10" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="0" cy="-22" r="4" fill="#FEF3C7" />
        <path d="M-6 -12 C-6 -17 6 -17 6 -12 Z" fill="#D97706" />

        {/* Top Right Avatar */}
        <circle cx="16" cy="-10" r="9" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="16" cy="-12" r="3.5" fill="#DBEAFE" />

        {/* Center Main Avatar */}
        <circle cx="0" cy="-2" r="14" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="0" cy="-4" r="5.5" fill="#CFFAFE" />
        <path d="M-9 9 C-9 3 9 3 9 9 Z" fill="#0891B2" />

        {/* Bottom Left Avatar */}
        <circle cx="-16" cy="14" r="9" fill="#EC4899" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="-16" cy="12" r="3.5" fill="#FCE7F3" />

        {/* Bottom Center Avatar */}
        <circle cx="0" cy="18" r="9.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="0" cy="16" r="3.5" fill="#FEE2E2" />

        {/* Bottom Right Avatar */}
        <circle cx="16" cy="16" r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="16" cy="14" r="3.5" fill="#D1FAE5" />
      </g>
      {/* Floating 5-Star Rating Pill Badge */}
      <g transform="translate(18, 42)">
        <rect x="0" y="0" width="28" height="16" rx="8" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.14))" />
        <polygon points="7,4 8.5,8 13,8 9.5,10.5 11,14 7,11.5 3,14 4.5,10.5 1,8 5.5,8" fill="#FBBF24" />
        <text x="19" y="12" fill="#1E293B" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">5</text>
      </g>
    </svg>
  );

  // 7. Lecture Notes / Internships (Portfolio Briefcase, Documents & Gold Coin)
  const NotesArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <defs>
        <linearGradient id="leatherCase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* Stack of Documents in Background with Blue Tabs */}
      <rect x="22" y="16" width="36" height="48" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
      <rect x="22" y="24" width="8" height="6" fill="#3B82F6" rx="1.5" />
      <rect x="22" y="34" width="8" height="6" fill="#3B82F6" rx="1.5" />
      <line x1="34" y1="26" x2="52" y2="26" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="34" x2="50" y2="34" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      {/* 3D Tan / Brown Leather Briefcase in Foreground */}
      <rect x="32" y="28" width="52" height="42" rx="12" fill="url(#leatherCase)" />
      {/* Briefcase Handle */}
      <path d="M48 28 C48 20 68 20 68 28" stroke="#7C2D12" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Flap & Straps */}
      <path d="M32 38 L58 50 L84 38" stroke="#7C2D12" strokeWidth="2" fill="none" />
      <rect x="55" y="46" width="6" height="7" rx="1.5" fill="#FBBF24" />
      {/* 3D Shiny Gold Coins in front */}
      <ellipse cx="78" cy="66" rx="9" ry="6" fill="#F59E0B" />
      <ellipse cx="78" cy="64" rx="8" ry="5" fill="#FDE68A" />
      <text x="78" y="67" fill="#B45309" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">₹</text>
    </svg>
  );

  // 8. 100 Days to Code / Practice (Dark Terminal Window with Traffic Lights)
  const CodeTerminalArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* Terminal Window Box */}
      <rect x="20" y="16" width="60" height="54" rx="12" fill="#181A20" stroke="#2E333D" strokeWidth="2" />
      {/* 3 Traffic Light Dots (Red, Yellow, Green) */}
      <circle cx="30" cy="26" r="3" fill="#EF4444" />
      <circle cx="38" cy="26" r="3" fill="#F59E0B" />
      <circle cx="46" cy="26" r="3" fill="#10B981" />
      {/* Colored Code Lines matching reference */}
      <text x="28" y="38" fill="#EC4899" fontSize="6.5" fontWeight="700" fontFamily="monospace">require('eve</text>
      <text x="28" y="47" fill="#FBBF24" fontSize="6.5" fontWeight="700" fontFamily="monospace">nts').EventE</text>
      <text x="28" y="56" fill="#38BDF8" fontSize="6.5" fontWeight="700" fontFamily="monospace">mitter =100;</text>
      <text x="28" y="64" fill="#34D399" fontSize="6.5" fontWeight="700" fontFamily="monospace">const gulp</text>
    </svg>
  );

  // 9. Video Lectures (Video Player Monitor Console)
  const VideosArt = (
    <svg viewBox="0 0 100 85" className="w-[84px] h-[72px] drop-shadow-sm group-hover:scale-105 transition-transform">
      <ellipse cx="50" cy="78" rx="34" ry="5.5" fill="#1E293B" opacity="0.22" />
      {/* TV Console Frame */}
      <rect x="20" y="18" width="60" height="48" rx="14" fill="#7C3AED" />
      <rect x="24" y="22" width="52" height="40" rx="10" fill="#2E1065" />
      {/* 3D Round Magenta Play Button */}
      <circle cx="50" cy="42" r="16" fill="#F43F5E" />
      <polygon points="46,35 58,42 46,49" fill="#FFFFFF" />
      {/* Floating Signal Waves */}
      <circle cx="78" cy="22" r="3.5" fill="#C084FC" />
      <circle cx="18" cy="34" r="3" fill="#FB7185" />
    </svg>
  );

  // Configure items based on user role to match Examly capabilities
  const items = isStudent
    ? [
        {
          id: 'tests',
          title: 'Mock Tests',
          href: '/tests',
          sparkle: true,
          art: MockTestsArt,
        },
        {
          id: 'courses',
          title: 'Courses',
          href: '/batches',
          sparkle: true,
          art: CoursesArt,
        },
        {
          id: 'competitions',
          title: 'Competitions',
          href: '/tests',
          sparkle: false,
          art: TrophyArt,
        },
        {
          id: 'videos',
          title: 'Video Lectures',
          href: '/videos',
          sparkle: false,
          art: VideosArt,
        },
        {
          id: 'notes',
          title: 'Lecture Notes',
          href: '/notes',
          sparkle: false,
          art: NotesArt,
        },
        {
          id: 'interviews',
          title: 'Mock Interviews',
          href: '/community',
          sparkle: false,
          art: MockInterviewsArt,
        },
        {
          id: 'hackathons',
          title: 'Hackathons',
          href: '/tests/builder',
          sparkle: false,
          art: HackathonsArt,
        },
        {
          id: 'mentorships',
          title: 'Mentorships',
          href: '/teachers',
          sparkle: false,
          art: MentorshipsArt,
        },
        {
          id: 'practice',
          title: '100 Days to Code',
          href: '/curriculum',
          sparkle: false,
          art: CodeTerminalArt,
        },
      ]
    : isTeacher
    ? [
        {
          id: 'create-test',
          title: 'Create Test',
          href: '/tests/create',
          sparkle: true,
          art: MockTestsArt,
        },
        {
          id: 'courses',
          title: 'My Batches',
          href: '/batches',
          sparkle: true,
          art: CoursesArt,
        },
        {
          id: 'hackathons',
          title: 'Test Suite',
          href: '/tests/builder',
          sparkle: false,
          art: HackathonsArt,
        },
        {
          id: 'videos',
          title: 'Video Lectures',
          href: '/videos',
          sparkle: false,
          art: VideosArt,
        },
        {
          id: 'notes',
          title: 'Study Material',
          href: '/notes',
          sparkle: false,
          art: NotesArt,
        },
        {
          id: 'students',
          title: 'My Students',
          href: '/students',
          sparkle: false,
          art: MentorshipsArt,
        },
        {
          id: 'interviews',
          title: 'Q&A Forum',
          href: '/community',
          sparkle: false,
          art: MockInterviewsArt,
        },
      ]
    : [
        {
          id: 'courses',
          title: 'Batches',
          href: '/batches',
          sparkle: true,
          art: CoursesArt,
        },
        {
          id: 'tests',
          title: 'Mock Tests',
          href: '/tests/builder',
          sparkle: true,
          art: MockTestsArt,
        },
        {
          id: 'competitions',
          title: 'Competitions',
          href: '/tests',
          sparkle: false,
          art: TrophyArt,
        },
        {
          id: 'mentorships',
          title: 'Faculty Roster',
          href: '/teachers',
          sparkle: false,
          art: MentorshipsArt,
        },
        {
          id: 'hackathons',
          title: 'Curriculum',
          href: '/curriculum',
          sparkle: false,
          art: HackathonsArt,
        },
        {
          id: 'interviews',
          title: 'Discussion',
          href: '/community',
          sparkle: false,
          art: MockInterviewsArt,
        },
        {
          id: 'notes',
          title: 'Audit Logs',
          href: '/settings/audit',
          sparkle: false,
          art: NotesArt,
        },
      ];

  return (
    <section className="relative w-full pb-2 select-none" aria-label="Explore Capabilities">
      {/* Scrollable Container with exact pill card proportions */}
      <div
        ref={railRef}
        className="flex items-center gap-3 sm:gap-3.5 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-[28px] sm:rounded-[32px] w-[124px] sm:w-[130px] h-[148px] sm:h-[156px] shrink-0 snap-start bg-gradient-to-b from-[#F0F6FE] via-[#E8F2FD] to-[#DFEDFC] dark:from-[#1D203C] dark:via-[#161830] dark:to-[#111224] border border-blue-100/70 dark:border-[#2A2E50] shadow-[0_2px_12px_rgba(59,130,246,0.05)] dark:shadow-none hover:shadow-[0_12px_24px_rgba(59,130,246,0.14)] dark:hover:shadow-[0_12px_24px_rgba(139,128,245,0.18)] hover:border-brand-400 dark:hover:border-brand-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden text-center"
          >
            {/* Top-right subtle glossy shine curve */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/40 dark:bg-white/5 rounded-full blur-xs pointer-events-none" />

            {/* Sparkle icon placed on top-left of designated cards */}
            {item.sparkle && <ReferenceSparkle />}

            {/* Top Title */}
            <div className="w-full pt-1 px-1 z-10">
              <h3 className="text-[13px] sm:text-[13.5px] font-bold text-[#19243C] dark:text-[#F1F5F9] leading-tight text-center line-clamp-2">
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
