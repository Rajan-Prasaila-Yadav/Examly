// apps/web/src/components/dashboard-feature-rail.tsx
'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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
      const scrollAmount = railRef.current.clientWidth * 0.7;
      railRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  // Define 3D Card Items based on active role
  const items = isStudent
    ? [
        {
          id: 'tests',
          title: 'Mock Tests',
          subtitle: liveTestsCount > 0 ? `${liveTestsCount} Live Now` : `${totalTestsCount} Available`,
          href: '/tests',
          sparkle: true,
          sparkleColor: 'text-purple-500 fill-purple-400',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>
                <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
                <linearGradient id="pencilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              {/* Soft ground shadow */}
              <ellipse cx="50" cy="80" rx="36" ry="6" fill="#1E293B" opacity="0.16" />
              {/* Clipboard Base */}
              <rect x="22" y="14" width="56" height="64" rx="12" fill="url(#boardGrad)" transform="rotate(-3 50 46)" />
              {/* Paper Sheet */}
              <rect x="26" y="20" width="48" height="54" rx="7" fill="url(#paperGrad)" transform="rotate(-3 50 46)" />
              {/* Clip at top */}
              <rect x="40" y="12" width="20" height="7" rx="3.5" fill="#94A3B8" />
              <rect x="44" y="9" width="12" height="6" rx="2" fill="#CBD5E1" />
              {/* Paper lines */}
              <line x1="32" y1="30" x2="66" y2="28" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="32" y1="37" x2="62" y2="35" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="32" y1="44" x2="58" y2="42" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="32" y1="51" x2="52" y2="49" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
              {/* Floating check badge */}
              <circle cx="68" cy="38" r="11" fill="#10B981" />
              <path d="M64 38 L67 41 L73 34" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* 3D Pencil */}
              <g transform="translate(62, 42) rotate(35)">
                <rect x="0" y="0" width="8" height="26" rx="2" fill="url(#pencilGrad)" />
                <polygon points="0,26 8,26 4,33" fill="#FDE68A" />
                <polygon points="3,31 5,31 4,33" fill="#1E293B" />
                <rect x="0" y="-4" width="8" height="4" rx="1.5" fill="#F43F5E" />
              </g>
            </svg>
          ),
        },
        {
          id: 'courses',
          title: 'My Courses',
          subtitle: `${batchesCount} Enrolled`,
          href: '/batches',
          sparkle: true,
          sparkleColor: 'text-blue-500 fill-blue-400',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="laptopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#312E81" />
                </linearGradient>
                <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E1B4B" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="80" rx="38" ry="6" fill="#1E293B" opacity="0.16" />
              {/* Laptop Screen */}
              <rect x="24" y="28" width="52" height="36" rx="6" fill="url(#laptopGrad)" />
              <rect x="28" y="32" width="44" height="28" rx="4" fill="url(#screenGrad)" opacity="0.9" />
              <line x1="33" y1="40" x2="50" y2="40" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
              <line x1="33" y1="46" x2="62" y2="46" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
              {/* Laptop Base */}
              <path d="M14 64 L86 64 L80 72 L20 72 Z" fill="#312E81" />
              <rect x="42" y="65" width="16" height="2.5" rx="1.2" fill="#93C5FD" opacity="0.8" />
              {/* 3D Graduation Cap floating above laptop */}
              <g transform="translate(48, 16) rotate(-8)">
                {/* Cap diamond */}
                <polygon points="0,10 24,18 0,26 -24,18" fill="url(#capGrad)" />
                {/* Cap skull cap base */}
                <path d="M-14 21 C-14 27 14 27 14 21" fill="#312E81" />
                {/* Cap Button */}
                <circle cx="0" cy="18" r="3" fill="#F59E0B" />
                {/* Golden Tassel */}
                <path d="M0 18 Q16 22 18 29" stroke="#F59E0B" strokeWidth="2" fill="none" />
                <circle cx="18" cy="29" r="2.5" fill="#D97706" />
              </g>
            </svg>
          ),
        },
        {
          id: 'videos',
          title: 'Video Lectures',
          subtitle: 'HD Classes',
          href: '/videos',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="videoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6D28D9" />
                </linearGradient>
                <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F43F5E" />
                  <stop offset="100%" stopColor="#BE123C" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              {/* TV / Monitor body */}
              <rect x="20" y="20" width="60" height="46" rx="14" fill="url(#videoGrad)" />
              {/* Screen Glass */}
              <rect x="24" y="24" width="52" height="38" rx="10" fill="#2E1065" opacity="0.6" />
              {/* Floating 3D Play Button Disc */}
              <circle cx="50" cy="43" r="16" fill="url(#playGrad)" />
              <polygon points="46,36 58,43 46,50" fill="#FFFFFF" />
              {/* Signal waves / sparkle */}
              <circle cx="78" cy="22" r="4" fill="#C084FC" />
              <circle cx="18" cy="32" r="3" fill="#F472B6" />
            </svg>
          ),
        },
        {
          id: 'notes',
          title: 'Lecture Notes',
          subtitle: 'PDF Downloads',
          href: '/notes',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="notesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#F1F5F9" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              {/* Stacked Back Sheet */}
              <rect x="30" y="16" width="46" height="58" rx="8" fill="#A7F3D0" transform="rotate(8 53 45)" />
              {/* Front Sheet */}
              <rect x="24" y="18" width="46" height="58" rx="8" fill="url(#docGrad)" stroke="#E2E8F0" strokeWidth="1.5" />
              {/* Emerald Spine Tag */}
              <rect x="24" y="18" width="10" height="58" rx="4" fill="url(#notesGrad)" />
              {/* Lines */}
              <line x1="40" y1="28" x2="62" y2="28" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="40" y1="36" x2="64" y2="36" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
              <line x1="40" y1="44" x2="60" y2="44" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="40" y1="52" x2="56" y2="52" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              {/* Red Ribbon Bookmark */}
              <polygon points="56,18 64,18 64,32 60,28 56,32" fill="#EF4444" />
            </svg>
          ),
        },
        {
          id: 'curriculum',
          title: 'Subjects',
          subtitle: `${subjectsCount} Topics`,
          href: '/curriculum',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="80" rx="36" ry="6" fill="#1E293B" opacity="0.16" />
              {/* 3D Open Book Base */}
              <path d="M50 36 C42 30 24 32 18 36 L18 66 C24 62 42 60 50 66 C58 60 76 62 82 66 L82 36 C76 32 58 30 50 36 Z" fill="url(#bookGrad)" />
              {/* White Pages Layer */}
              <path d="M50 34 C42 28 25 30 20 34 L20 62 C25 58 42 56 50 62 C58 56 75 58 80 62 L80 34 C75 30 58 28 50 34 Z" fill="#FFFFFF" />
              {/* Page Spine and Text Hints */}
              <line x1="50" y1="34" x2="50" y2="64" stroke="#D97706" strokeWidth="2" />
              <line x1="28" y1="42" x2="42" y2="40" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="28" y1="48" x2="40" y2="46" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="58" y1="40" x2="72" y2="42" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="58" y1="46" x2="70" y2="48" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              {/* Floating Atom / Knowledge Orb */}
              <circle cx="50" cy="22" r="8" fill="#3B82F6" />
              <ellipse cx="50" cy="22" rx="14" ry="5" fill="none" stroke="#60A5FA" strokeWidth="1.5" transform="rotate(-20 50 22)" />
            </svg>
          ),
        },
        {
          id: 'analytics',
          title: 'Performance',
          subtitle: '360 Analytics',
          href: studentId ? `/students/${studentId}` : '/students',
          sparkle: true,
          sparkleColor: 'text-amber-500 fill-amber-400',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              {/* Trophy Base */}
              <rect x="36" y="64" width="28" height="8" rx="3" fill="#78350F" />
              <rect x="42" y="56" width="16" height="8" rx="2" fill="url(#trophyGrad)" />
              {/* Trophy Cup */}
              <path d="M30 22 C30 46 70 46 70 22 Z" fill="url(#trophyGrad)" />
              <ellipse cx="50" cy="22" rx="20" ry="6" fill="#FDE68A" />
              {/* Handles */}
              <path d="M30 26 C20 26 20 40 32 40" stroke="#F59E0B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M70 26 C80 26 80 40 68 40" stroke="#F59E0B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              {/* Star Badge on Trophy */}
              <polygon points="50,30 52,35 57,35 53,38 55,43 50,40 45,43 47,38 43,35 48,35" fill="#FFFFFF" />
            </svg>
          ),
        },
        {
          id: 'community',
          title: 'Discussion',
          subtitle: 'Doubt Q&A',
          href: '/community',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="chat1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#0891B2" />
                </linearGradient>
                <linearGradient id="chat2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6D28D9" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              {/* Primary Chat Bubble */}
              <rect x="20" y="20" width="46" height="34" rx="14" fill="url(#chat1Grad)" />
              <polygon points="28,52 38,52 24,62" fill="url(#chat1Grad)" />
              <circle cx="34" cy="37" r="3" fill="#FFFFFF" />
              <circle cx="43" cy="37" r="3" fill="#FFFFFF" />
              <circle cx="52" cy="37" r="3" fill="#FFFFFF" />
              {/* Overlapping Chat Bubble */}
              <rect x="42" y="32" width="44" height="32" rx="13" fill="url(#chat2Grad)" />
              <polygon points="76,62 66,62 80,70" fill="url(#chat2Grad)" />
              <path d="M60 42 C60 40 64 40 64 43 C64 46 62 47 62 49" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="62" cy="53" r="1.2" fill="#FFFFFF" />
            </svg>
          ),
        },
      ]
    : isTeacher
    ? [
        {
          id: 'create-test',
          title: 'Create Test',
          subtitle: 'KaTeX & Sections',
          href: '/tests/create',
          sparkle: true,
          sparkleColor: 'text-purple-500 fill-purple-400',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <defs>
                <linearGradient id="createGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="24" y="20" width="52" height="56" rx="10" fill="url(#createGrad)" />
              <rect x="28" y="24" width="44" height="48" rx="7" fill="#FFFFFF" />
              <circle cx="50" cy="46" r="14" fill="#3B82F6" />
              <line x1="50" y1="38" x2="50" y2="54" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              <line x1="42" y1="46" x2="58" y2="46" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: 'test-suite',
          title: 'Test Suite',
          subtitle: `${totalTestsCount} Papers`,
          href: '/tests/builder',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="24" y="16" width="52" height="60" rx="10" fill="#8B5CF6" />
              <rect x="28" y="20" width="44" height="52" rx="7" fill="#FFFFFF" />
              <line x1="36" y1="32" x2="64" y2="32" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="36" y1="40" x2="58" y2="40" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="48" x2="62" y2="48" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <circle cx="64" cy="54" r="8" fill="#10B981" />
              <path d="M61 54 L63 56 L67 51" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          ),
        },
        {
          id: 'batches',
          title: 'My Batches',
          subtitle: `${batchesCount} Classes`,
          href: '/batches',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="22" y="24" width="56" height="48" rx="12" fill="#3B82F6" />
              <polygon points="50,14 74,22 50,30 26,22" fill="#1E1B4B" />
              <circle cx="50" cy="22" r="3" fill="#F59E0B" />
            </svg>
          ),
        },
        {
          id: 'videos',
          title: 'Upload Video',
          subtitle: 'Lectures',
          href: '/videos',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="20" y="22" width="60" height="44" rx="12" fill="#EC4899" />
              <circle cx="50" cy="44" r="14" fill="#FFFFFF" />
              <polygon points="46,38 58,44 46,50" fill="#BE185D" />
            </svg>
          ),
        },
        {
          id: 'notes',
          title: 'Upload Notes',
          subtitle: 'Study Material',
          href: '/notes',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="26" y="18" width="48" height="56" rx="8" fill="#10B981" />
              <rect x="30" y="22" width="40" height="48" rx="6" fill="#FFFFFF" />
              <line x1="38" y1="34" x2="62" y2="34" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: 'students',
          title: 'My Students',
          subtitle: `${studentsCount} Learners`,
          href: '/students',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <circle cx="36" cy="36" r="12" fill="#F59E0B" />
              <circle cx="64" cy="36" r="12" fill="#3B82F6" />
              <path d="M20 62 C20 50 52 50 52 62" fill="#D97706" />
              <path d="M48 62 C48 50 80 50 80 62" fill="#1D4ED8" />
            </svg>
          ),
        },
        {
          id: 'community',
          title: 'Q&A Forum',
          subtitle: 'Solve Doubts',
          href: '/community',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="24" y="22" width="52" height="40" rx="14" fill="#06B6D4" />
              <circle cx="40" cy="40" r="3" fill="#FFFFFF" />
              <circle cx="50" cy="40" r="3" fill="#FFFFFF" />
              <circle cx="60" cy="40" r="3" fill="#FFFFFF" />
            </svg>
          ),
        },
      ]
    : [
        {
          id: 'batches',
          title: 'Batches',
          subtitle: `${batchesCount} Active`,
          href: '/batches',
          sparkle: true,
          sparkleColor: 'text-blue-500 fill-blue-400',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="22" y="24" width="56" height="48" rx="12" fill="#3B82F6" />
              <polygon points="50,14 74,22 50,30 26,22" fill="#1E1B4B" />
              <circle cx="50" cy="22" r="3" fill="#F59E0B" />
            </svg>
          ),
        },
        {
          id: 'tests',
          title: 'Examinations',
          subtitle: `${totalTestsCount} Authored`,
          href: '/tests/builder',
          sparkle: true,
          sparkleColor: 'text-purple-500 fill-purple-400',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="24" y="16" width="52" height="60" rx="10" fill="#8B5CF6" />
              <rect x="28" y="20" width="44" height="52" rx="7" fill="#FFFFFF" />
              <line x1="36" y1="32" x2="64" y2="32" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="64" cy="54" r="8" fill="#10B981" />
              <path d="M61 54 L63 56 L67 51" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          ),
        },
        {
          id: 'students',
          title: 'Students',
          subtitle: `${studentsCount} Enrolled`,
          href: '/students',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <circle cx="36" cy="36" r="12" fill="#10B981" />
              <circle cx="64" cy="36" r="12" fill="#3B82F6" />
              <path d="M20 62 C20 50 52 50 52 62" fill="#047857" />
              <path d="M48 62 C48 50 80 50 80 62" fill="#1D4ED8" />
            </svg>
          ),
        },
        {
          id: 'teachers',
          title: 'Faculty',
          subtitle: `${teachersCount} Verified`,
          href: '/teachers',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <circle cx="50" cy="32" r="14" fill="#F59E0B" />
              <path d="M30 62 C30 48 70 48 70 62" fill="#D97706" />
              <circle cx="68" cy="28" r="8" fill="#EF4444" />
              <polygon points="68,23 70,27 74,27 71,29 72,33 68,31 64,33 65,29 62,27 66,27" fill="#FFFFFF" />
            </svg>
          ),
        },
        {
          id: 'curriculum',
          title: 'Curriculum',
          subtitle: 'Subjects & Units',
          href: '/curriculum',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="24" y="20" width="52" height="54" rx="8" fill="#4F46E5" />
              <circle cx="50" cy="44" r="12" fill="#FFFFFF" />
              <polygon points="50,34 54,46 42,42" fill="#4F46E5" />
            </svg>
          ),
        },
        {
          id: 'roles',
          title: 'Role Security',
          subtitle: 'RBAC Controls',
          href: '/settings/roles',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <path d="M50 18 L76 28 C76 50 50 64 50 64 C50 64 24 50 24 28 Z" fill="#EF4444" />
              <path d="M50 22 L72 30 C72 48 50 60 50 60 C50 60 28 48 28 30 Z" fill="#DC2626" />
              <circle cx="50" cy="40" r="5" fill="#FFFFFF" />
              <rect x="48" y="42" width="4" height="6" fill="#FFFFFF" />
            </svg>
          ),
        },
        {
          id: 'audit',
          title: 'Audit Logs',
          subtitle: 'System Trail',
          href: '/settings/audit',
          art: (
            <svg viewBox="0 0 100 90" className="w-20 h-18 drop-shadow-md group-hover:scale-105 transition-transform">
              <ellipse cx="50" cy="80" rx="34" ry="6" fill="#1E293B" opacity="0.16" />
              <rect x="26" y="20" width="48" height="54" rx="10" fill="#1E293B" />
              <line x1="34" y1="32" x2="60" y2="32" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="34" y1="42" x2="54" y2="42" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              <line x1="34" y1="52" x2="62" y2="52" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ),
        },
      ];

  return (
    <section className="relative w-full pb-2" aria-label="Quick Capabilities Showcase">
      {/* Scrollable Container with Snap */}
      <div
        ref={railRef}
        className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex flex-col items-center justify-between p-3 sm:p-3.5 rounded-[26px] sm:rounded-[28px] w-[138px] sm:w-[148px] h-[172px] sm:h-[180px] shrink-0 snap-start bg-gradient-to-b from-[#F2F7FD] via-[#EBF3FC] to-[#E3EFFB] dark:from-[#1D1F38] dark:via-[#16172E] dark:to-[#121326] border border-blue-100/90 dark:border-[#2A2C4A] shadow-[0_4px_16px_rgba(59,130,246,0.06)] dark:shadow-none hover:shadow-[0_12px_28px_rgba(59,130,246,0.16)] dark:hover:shadow-[0_12px_28px_rgba(139,128,245,0.2)] hover:border-brand-400 dark:hover:border-brand-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-center select-none"
          >
            {/* Sparkle Badge if present */}
            {item.sparkle && (
              <span className="absolute top-2.5 left-2.5 z-10 animate-pulse">
                <Sparkles className={`w-3.5 h-3.5 ${item.sparkleColor || 'text-purple-500'}`} />
              </span>
            )}

            {/* Top Label */}
            <div className="w-full pt-1 px-1">
              <h3 className="text-xs sm:text-[13px] font-extrabold text-slate-800 dark:text-[#ECECFA] truncate leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {item.title}
              </h3>
            </div>

            {/* Center 3D Illustration */}
            <div className="flex-1 flex items-center justify-center my-1 w-full overflow-hidden">
              {item.art}
            </div>

            {/* Bottom Subtitle / Count Badge */}
            <div className="w-full pb-0.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-600 dark:text-[#9A9DBD] bg-white/80 dark:bg-[#1C1E3A]/90 border border-slate-200/60 dark:border-[#2A2C4A] shadow-2xs truncate max-w-[124px]">
                {item.subtitle}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Navigation Arrows for desktop scroll */}
      <div className="hidden sm:flex items-center justify-end gap-1.5 mt-1 pr-1">
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
