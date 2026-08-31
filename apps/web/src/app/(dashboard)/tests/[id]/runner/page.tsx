// apps/web/src/app/(dashboard)/tests/[id]/runner/page.tsx
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FileCheck2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowLeft,
  X,
  RotateCcw,
  Sparkles,
  Lock,
  Eye,
  Award,
  HelpCircle,
  FileSpreadsheet,
  FileText,
  Download,
  ListFilter,
  Check,
  Loader2,
  Star,
  Calculator,
  Trophy,
  BarChart3,
  PieChart,
  Lightbulb,
  MessageSquare,
  LayoutGrid,
  Search,
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';
import { useAuth } from '@/lib/auth-context';

// ── Solution Step Parser & Timeline Renderer ────────────────────────────────
interface ParsedSolutionStep {
  stepNumber: number;
  title?: string;
  content: string;
}

function parseSolutionSteps(rawText: string | null | undefined): ParsedSolutionStep[] {
  if (!rawText || !rawText.trim()) return [];

  // Clean HTML tags & unescape entities
  const text = rawText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?(p|div|span|strong|b|em|i)[^>]*>/gi, '')
    .trim();

  // Pattern: Strict line-start step markers (Step 1, Step 2, ①, ②, (1), (2), or "1. <Text>")
  // Crucial: Must start at newline or beginning of string, never in middle of formula e.g. 3(1) + 2(16)
  const stepSplitRegex = /(?:^|\n)\s*(?=(?:Step\s*\d+[:.]?|[①②③④⑤⑥⑦⑧⑨⑩]|\(\d+\)\s+|(?:\d+\.\s+[A-Za-z])))/i;
  const rawSegments = text.split(stepSplitRegex).map((s) => s.trim()).filter(Boolean);

  if (rawSegments.length > 1) {
    const validSteps: ParsedSolutionStep[] = [];

    rawSegments.forEach((segment) => {
      // Extract step header if present
      const headerMatch = segment.match(/^(?:Step\s*\d+[:.]?|[①②③④⑤⑥⑦⑧⑨⑩]|\(\d+\)|\d+\.)\s*(.*)$/is);
      const cleanContent = headerMatch ? headerMatch[1].trim() : segment;

      // Ignore trivial or orphaned fragments
      if (!cleanContent || cleanContent.length < 2) {
        return;
      }

      // Extract optional title from first line
      const lines = cleanContent.split('\n');
      let title: string | undefined;
      let body = cleanContent;

      if (lines.length > 1 && lines[0].length < 90 && !lines[0].includes('=')) {
        title = lines[0].trim().replace(/[:.]+$/, '');
        body = lines.slice(1).join('\n').trim();
      }

      validSteps.push({
        stepNumber: validSteps.length + 1,
        title,
        content: body || cleanContent,
      });
    });

    if (validSteps.length > 1) {
      return validSteps;
    }
  }

  // Fallback: Check for distinct calculation paragraphs separated by blank lines
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length >= 8);
  if (paragraphs.length >= 2 && paragraphs.length <= 6) {
    return paragraphs.map((p, idx) => ({
      stepNumber: idx + 1,
      content: p,
    }));
  }

  return [{ stepNumber: 1, content: text }];
}

function StepByStepSolutionRenderer({ solutionText }: { solutionText: string }) {
  const steps = parseSolutionSteps(solutionText);

  if (steps.length <= 1) {
    return (
      <div className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans text-xs sm:text-sm overflow-x-auto max-w-full py-0.5">
        {renderMath(solutionText)}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.stepNumber} className="relative flex gap-3 sm:gap-4">
            {/* Step Circle & Dynamic Vertical Timeline Connector */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-600 dark:bg-purple-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {step.stepNumber}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-purple-200 dark:bg-purple-800/60 my-1" />}
            </div>

            {/* Step Body */}
            <div className={`flex-1 min-w-0 ${!isLast ? 'pb-3' : ''}`}>
              {step.title && (
                <h4 className="font-bold text-purple-950 dark:text-purple-200 text-xs sm:text-sm mb-1">
                  {step.title}
                </h4>
              )}
              <div className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans text-xs sm:text-sm overflow-x-auto max-w-full py-0.5">
                {renderMath(step.content)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewAccordion({
  icon,
  title,
  isOpen,
  onToggle,
  colorScheme,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  colorScheme: 'amber' | 'blue' | 'purple';
  children: React.ReactNode;
}) {
  const styles = {
    amber: {
      card: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-800/50',
      header: 'text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 dark:hover:bg-amber-950/40',
      iconBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
      border: 'border-amber-200/70 dark:border-amber-800/40',
    },
    blue: {
      card: 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/90 dark:border-blue-800/50',
      header: 'text-blue-900 dark:text-blue-200 hover:bg-blue-100/60 dark:hover:bg-blue-950/40',
      iconBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
      border: 'border-blue-200/70 dark:border-blue-800/40',
    },
    purple: {
      card: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/90 dark:border-purple-800/50',
      header: 'text-purple-900 dark:text-purple-200 hover:bg-purple-100/60 dark:hover:bg-purple-950/40',
      iconBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
      border: 'border-purple-200/70 dark:border-purple-800/40',
    },
  }[colorScheme];

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${styles.card}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full p-3.5 sm:p-4 flex items-center justify-between transition-colors cursor-pointer text-left ${styles.header}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${styles.iconBg}`}>
            {icon}
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-tight">{title}</span>
        </div>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <ChevronDown className="w-4 h-4 opacity-75" />
        </div>
      </button>

      {isOpen && (
        <div className={`p-4 pt-3 border-t text-xs sm:text-sm leading-relaxed ${styles.border}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function LiveTestRunnerContent() {
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view'); // 'REVIEW' | 'ANSWER_KEY' | 'RESULT'
  const testId = params.id as string;

  const downloadFile = async (path: string, filename: string) => {
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed');
    }
  };

  // Phase: 'RULES' -> 'RUNNING' -> 'RESULT' | 'REVIEW' | 'ANSWER_KEY'
  const [phase, setPhase] = useState<'RULES' | 'RUNNING' | 'RESULT' | 'REVIEW' | 'ANSWER_KEY'>('RULES');
  const [mounted, setMounted] = useState(false);
  const [hasAgreedRules, setHasAgreedRules] = useState(false);

  // Test & Attempt State
  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [pastAttempt, setPastAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User Responses Map: questionId -> { selectedOptionIds: string[], isMarkedForReview: boolean }
  const [userAnswers, setUserAnswers] = useState<Record<string, { selectedOptionIds: string[]; isMarkedForReview: boolean }>>({});

  // Timers & Anti-Cheat
  const [remainingSeconds, setRemainingSeconds] = useState(7200);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [antiCheatStrikes, setAntiCheatStrikes] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Review & Answer Key states
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED' | 'REVIEW'>('ALL');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewOpenSections, setReviewOpenSections] = useState<Record<string, { hint?: boolean; explanation?: boolean; solution?: boolean }>>({});
  const [answerKeyData, setAnswerKeyData] = useState<any[]>([]);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  // Palette drawer
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState<'ALL' | 'ANSWERED' | 'REVIEW' | 'UNVISITED'>('ALL');

  const [startError, setStartError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingTest, setIsLoadingTest] = useState(true);

  const flattenQuestions = (testPayload: any) =>
    (testPayload?.sections || []).flatMap((sec: any) =>
      (sec.questions || []).map((q: any) => ({ ...q, sectionName: sec.name })),
    );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep phase in sync with view query parameter changes
  useEffect(() => {
    if (viewParam === 'REVIEW') setPhase('REVIEW');
    else if (viewParam === 'ANSWER_KEY') setPhase('ANSWER_KEY');
    else if (viewParam === 'RESULT') setPhase('RESULT');
  }, [viewParam]);

  // Load Test metadata & past evaluation (if student previously submitted)
  useEffect(() => {
    const fetchTestAndEvaluation = async () => {
      setIsLoadingTest(true);
      try {
        const [testRes, keyRes] = await Promise.all([
          api.get(`/tests/${testId}`),
          api.get(`/tests/${testId}/answer-key`).catch(() => null),
        ]);

        const testData = testRes?.data || null;
        let loadedQuestions = flattenQuestions(testData);

        if (keyRes?.data?.questions && keyRes.data.questions.length > 0) {
          loadedQuestions = keyRes.data.questions;
        }

        // Restore user answers in atomic pass to eliminate UI jumping / delayed renders
        const restored: Record<string, { selectedOptionIds: string[]; isMarkedForReview: boolean }> = {};
        (keyRes?.data?.questions || keyRes?.data?.answerKey || []).forEach((q: any) => {
          const sIds = q.selectedOptionIds || (q.options || []).filter((o: any) => o.isSelected).map((o: any) => o.id) || [];
          if (sIds.length > 0 || q.isMarkedForReview) {
            restored[q.id || q.questionId] = {
              selectedOptionIds: sIds,
              isMarkedForReview: !!q.isMarkedForReview,
            };
          }
        });

        // Batch update state in 1 go
        setTest(testData);
        setQuestions(loadedQuestions);
        setUserAnswers(restored);
        if (keyRes?.data?.answerKey) {
          setAnswerKeyData(keyRes.data.answerKey);
        }
        if (keyRes?.data?.result) {
          setPastAttempt(keyRes.data.result);
          setSubmitResult(keyRes.data.result);
          if (keyRes.data.result.durationSeconds) {
            setElapsedSeconds(keyRes.data.result.durationSeconds);
          }
        }

        // Check if there is an active running attempt to resume automatically (e.g. after refresh or device restart)
        if (!viewParam && !keyRes?.data?.result) {
          try {
            const startRes = await api.post(`/tests/${testId}/start`);
            if (startRes.data?.attemptId) {
              setAttemptId(startRes.data.attemptId);
              if (startRes.data.test) {
                setTest(startRes.data.test);
                setQuestions(flattenQuestions(startRes.data.test));
              }
              const startedAt = startRes.data.startedAt ? new Date(startRes.data.startedAt).getTime() : Date.now();
              const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
              const allocated = startRes.data.effectiveDurationSeconds || (testRes.data?.durationMinutes ? testRes.data.durationMinutes * 60 : 0);
              const remaining = Math.max(0, allocated - elapsed);

              setElapsedSeconds(elapsed);
              setRemainingSeconds(remaining);

              if (startRes.data.existingAnswers?.length) {
                const activeAnswers: Record<string, { selectedOptionIds: string[]; isMarkedForReview: boolean }> = {};
                startRes.data.existingAnswers.forEach((a: any) => {
                  activeAnswers[a.questionId] = {
                    selectedOptionIds: a.selectedOptionIds || [],
                    isMarkedForReview: !!a.isMarkedForReview,
                  };
                });
                setUserAnswers(activeAnswers);
              }

              if (remaining <= 0) {
                // Auto-submit expired attempt
                handleAutoSubmit('Time Expired on Resume');
              } else if (startRes.data.existingAnswers?.length || elapsed > 10) {
                setPhase('RUNNING');
              }
            }
          } catch {}
        }

        // Direct view requested via URL (e.g. ?view=REVIEW or ?view=ANSWER_KEY or ?view=RESULT)
        if (viewParam === 'REVIEW') {
          setPhase('REVIEW');
        } else if (viewParam === 'ANSWER_KEY') {
          setPhase('ANSWER_KEY');
        } else if (viewParam === 'RESULT') {
          setPhase('RESULT');
        } else if (keyRes?.data?.result) {
          setPhase('RESULT');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingTest(false);
      }
    };

    if (testId) {
      fetchTestAndEvaluation();
    }
  }, [testId, viewParam]);

  // Anti-Cheat & Screen Protection (doc 9.5 & doc 22.2)
  useEffect(() => {
    if (phase !== 'RUNNING') return;

    // 1. Tab / App Switch Detector
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const newStrikes = antiCheatStrikes + 1;
        setAntiCheatStrikes(newStrikes);
        setShowCheatWarning(true);

        if (attemptId) {
          try {
            const res = await api.post(`/tests/attempts/${attemptId}/strike`);
            if (res.data.autoSubmitted) {
              setSubmitResult(res.data.result);
              setPhase('RESULT');
              return;
            }
          } catch (e) {
            console.error('Failed to record strike', e);
          }
        }

        const maxStrikes = test?.config?.antiCheatLevel || 3;
        if (newStrikes >= maxStrikes) {
          handleAutoSubmit('Anti-cheat strike threshold exceeded');
        }
      }
    };

    // 2. Prevent Copy-Paste and Right-Click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'p')) {
        e.preventDefault();
      }
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, test, attemptId, antiCheatStrikes]);

  // Timer Countdown
  useEffect(() => {
    if (phase !== 'RUNNING') return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit('Time Expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const handleStartExam = async () => {
    setStartError('');
    setIsStarting(true);
    try {
      const res = await api.post(`/tests/${testId}/start`);
      setAttemptId(res.data.attemptId);
      if (res.data.test) {
        setTest(res.data.test);
        setQuestions(flattenQuestions(res.data.test));
      }
      const startedAt = res.data.startedAt ? new Date(res.data.startedAt).getTime() : Date.now();
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const allocated = res.data.effectiveDurationSeconds || (test?.durationMinutes ? test.durationMinutes * 60 : 0);
      setElapsedSeconds(elapsed);
      setRemainingSeconds(Math.max(0, allocated - elapsed));

      const restored: Record<string, { selectedOptionIds: string[]; isMarkedForReview: boolean }> = {};
      (res.data.existingAnswers || []).forEach((a: any) => {
        restored[a.questionId] = {
          selectedOptionIds: a.selectedOptionIds || [],
          isMarkedForReview: !!a.isMarkedForReview,
        };
      });
      setUserAnswers(restored);
      setPhase('RUNNING');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setStartError(Array.isArray(msg) ? msg.join(' ') : msg || 'Could not start this test.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string, isMulti: boolean = false) => {
    setUserAnswers((prev) => {
      const current = prev[questionId]?.selectedOptionIds || [];
      let updated: string[];

      if (isMulti) {
        updated = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      } else {
        updated = current.includes(optionId) ? [] : [optionId];
      }

      const next = {
        ...prev,
        [questionId]: {
          selectedOptionIds: updated,
          isMarkedForReview: prev[questionId]?.isMarkedForReview || false,
        },
      };

      if (attemptId && attemptId !== 'attempt-live-demo') {
        api.post(`/tests/attempts/${attemptId}/answer`, {
          questionId,
          selectedOptionIds: updated,
          isMarkedForReview: next[questionId].isMarkedForReview,
        }).catch(() => {});
      }

      return next;
    });
  };

  const handleToggleReview = (questionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: prev[questionId]?.selectedOptionIds || [],
        isMarkedForReview: !prev[questionId]?.isMarkedForReview,
      },
    }));
  };

  const handleClearAnswer = (questionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: [],
        isMarkedForReview: prev[questionId]?.isMarkedForReview || false,
      },
    }));
  };

  const handleJumpToQuestion = (targetIdx: number) => {
    setCurrentIndex(targetIdx);
    setIsMobilePaletteOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`question-card-${targetIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const handleAutoSubmit = async (reason?: string) => {
    if (isSubmittingExam) return;
    setIsSubmittingExam(true);
    setIsSubmitModalOpen(false);
    try {
      if (attemptId && attemptId !== 'attempt-live-demo') {
        const res = await api.post(`/tests/attempts/${attemptId}/submit`, { answers: userAnswers });
        const resultData = res.data || {};
        const negativeMarks =
          resultData.negativeMarks !== undefined
            ? resultData.negativeMarks
            : Math.abs((resultData.totalWrong || 0) * (test?.negativeMarkRate || 1));

        setSubmitResult({
          ...resultData,
          negativeMarks,
        });

        // Immediately fetch post-submission verified questions with step solutions and answer keys
        const [reviewRes, keyRes] = await Promise.all([
          api.get(`/tests/attempts/${attemptId}/review`).catch(() => null),
          api.get(`/tests/${testId}/answer-key`).catch(() => null),
        ]);

        if (reviewRes?.data?.questions) {
          setQuestions(reviewRes.data.questions);
        }
        if (keyRes?.data?.answerKey) {
          setAnswerKeyData(keyRes.data.answerKey);
        }
      } else {
        // Calculation fallback
        let correctCount = 0;
        let wrongCount = 0;
        let unans = 0;
        let score = 0;
        let negDeducted = 0;

        questions.forEach((q) => {
          const ans = userAnswers[q.id];
          if (!ans || ans.selectedOptionIds.length === 0) {
            unans++;
          } else {
            const correctIds = (q.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.id);
            const isMatch = correctIds.length === ans.selectedOptionIds.length && correctIds.every((id: string) => ans.selectedOptionIds.includes(id));
            if (isMatch) {
              correctCount++;
              score += q.marksPositive || 4;
            } else {
              wrongCount++;
              const neg = q.marksNegative || 1;
              score -= neg;
              negDeducted += neg;
            }
          }
        });

        const maxMarks = test?.totalMarks || questions.length * 4 || 200;
        const pct = Math.round((Math.max(0, score) / maxMarks) * 10000) / 100;

        setSubmitResult({
          totalScore: score,
          totalCorrect: correctCount,
          totalWrong: wrongCount,
          totalUnanswered: unans,
          percentage: pct,
          negativeMarks: negDeducted,
          rank: 1,
          isPassed: score >= (test?.passMarks || 80),
        });
      }
    } catch (e) {
      console.error('Submit error', e);
    } finally {
      setIsSubmittingExam(false);
      setPhase('RESULT');
    }
  };

  const cleanOptionText = (text: string) => {
    if (!text) return '';
    return text.replace(/^[A-Za-z0-9][\)\.\:\-]\s*/, '').trim();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex] || {};
  const currentAns = userAnswers[currentQ.id] || { selectedOptionIds: [], isMarkedForReview: false };

  // Answered Counts
  const answeredCount = Object.values(userAnswers).filter((a: any) => a?.selectedOptionIds?.length > 0).length;
  const reviewCount = Object.values(userAnswers).filter((a: any) => a?.isMarkedForReview).length;
  const unansCount = questions.length - answeredCount;

  // Submit unlock countdown (e.g. 5 minutes from start)
  const submitUnlockDelaySeconds = (test?.config?.submitUnlockDelayMins || 5) * 60;
  const isSubmitLocked = elapsedSeconds < submitUnlockDelaySeconds;
  const unlockRemainingSeconds = Math.max(0, submitUnlockDelaySeconds - elapsedSeconds);
  const questionsPerScreen = Math.max(1, Number(test?.config?.questionsPerScreen) || 1);
  const pageStart = Math.floor(currentIndex / questionsPerScreen) * questionsPerScreen;
  const pageQuestions = questions.slice(pageStart, pageStart + questionsPerScreen);

  // ══════════════════════════════════════════════════════════════════════════════
  // LOADING / HYDRATION GUARD
  // ══════════════════════════════════════════════════════════════════════════════
  if (!mounted || (isLoadingTest && !test)) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading examination system & results...</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 1: RULES & REGULATIONS (SCR-STU-10)
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'RULES') {
    if (isLoadingTest) {
      return (
        <div className="max-w-2xl mx-auto py-6 px-3 sm:px-6 space-y-6 animate-pulse">
          <div className="w-32 h-5 bg-slate-200 rounded-lg" />
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto" />
            <div className="w-2/3 h-7 bg-slate-200 mx-auto rounded-xl" />
            <div className="w-1/2 h-4 bg-slate-100 mx-auto rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              <div className="h-14 bg-slate-100 rounded-xl" />
              <div className="h-14 bg-slate-100 rounded-xl" />
              <div className="h-14 bg-slate-100 rounded-xl" />
              <div className="h-14 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-40 bg-slate-50 rounded-2xl border border-slate-100" />
            <div className="h-12 bg-slate-200 rounded-xl" />
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-6 px-3 sm:px-6 space-y-6">
        <Link
          href={isStudent ? '/tests' : '/tests/builder'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {isStudent ? 'Back to My Mock Tests' : 'Back to Test Suite'}
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-mono text-[11px] font-bold border border-purple-200">
              {test?.batch?.name || test?.subject?.name || 'Mock Examination'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">{test?.title}</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {test?.description || 'Please read all examination rules, anti-cheat instructions, and time policies carefully.'}
            </p>
          </div>

          {/* Previous Attempt Review Banner */}
          {pastAttempt && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-brand-500/10 to-purple-500/10 border border-emerald-300 text-left space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed Attempt Available
                </span>
                <span className="text-xs font-bold font-mono text-emerald-700">
                  Score: {pastAttempt.totalScore ?? 0} / {test?.totalMarks} ({pastAttempt.percentage ?? 0}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                You can review your verified answers, step solutions, and calculation tables anytime!
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => setPhase('REVIEW')}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> Review Answers & Step Solutions
                </button>
                <button
                  onClick={() => setPhase('ANSWER_KEY')}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> View Answer Key Table
                </button>
              </div>
            </div>
          )}

          {/* Key Metrics Chips (SCR-STU-10) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{test?.durationMinutes} Min</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Questions</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{questions.length} Qs</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Total Marks</span>
              <span className="font-bold text-brand-700 font-mono text-sm">{test?.totalMarks} Marks</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Pass Mark</span>
              <span className="font-bold text-emerald-600 font-mono text-sm">{test?.passMarks} Marks</span>
            </div>
          </div>

          {/* Timing & Schedule Window */}
          {test?.startDateTime && (
            <div className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-200 text-left text-xs text-brand-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-600 block">Scheduled Examination Window</span>
                <span className="font-mono text-xs font-semibold">
                  {new Date(test.startDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {test.endDateTime ? ` → ${new Date(test.endDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-brand-200 font-bold text-brand-700 w-fit">
                ⏱ {test.durationMinutes} Minutes Allotted
              </span>
            </div>
          )}

          {/* Rules List (SCR-STU-10 pixel accurate) */}
          <div className="text-left space-y-2.5 text-xs text-slate-700 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. <strong>Strict Window Focus:</strong> Tab switches increment anti-cheat strikes.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. <strong>Screenshot & Stream Protected:</strong> DRM stream protection active.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>3. <strong>Anti-Cheat Strike Policy:</strong> Accumulating 3 cheating strikes triggers auto-submission.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>4. <strong>Marking Scheme:</strong> +{test?.config?.defaultPositiveMarks || (test?.totalMarks && questions.length ? Number((test.totalMarks / questions.length).toFixed(1)) : 1)} marks for correct, -{test?.negativeMarkRate !== undefined ? test.negativeMarkRate : 1} for incorrect.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>5. <strong>Submit Unlock:</strong> Submit button unlocks {test?.config?.submitUnlockDelayMins || 5} min after starting.</span>
            </div>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-center justify-center gap-2.5 cursor-pointer text-xs pt-1 p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={hasAgreedRules}
              onChange={(e) => setHasAgreedRules(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <span className="font-semibold text-slate-800 select-none">
              I have read the rules & regulations and agree to follow.
            </span>
          </label>

          {startError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left">{startError}</div>
          )}

          <button
            disabled={!hasAgreedRules || isStarting || questions.length === 0}
            onClick={handleStartExam}
            className={`w-full py-3.5 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
              hasAgreedRules && questions.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40 scale-[1.01]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Starting Examination...</span>
              </>
            ) : questions.length === 0 ? (
              'No questions authored yet'
            ) : pastAttempt ? (
              'Start Retake Examination'
            ) : (
              'Start Examination'
            )}{' '}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 3: SUBMITTED RESULT SUMMARY (Single-screen Viewport Fit + Celebration Animations)
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'RESULT') {
    const totalMarks = test?.totalMarks || 200;
    const finalScore = submitResult?.totalScore ?? pastAttempt?.totalScore ?? 0;
    const pct =
      submitResult?.percentage ??
      pastAttempt?.percentage ??
      (totalMarks > 0 ? Math.round((Math.max(0, finalScore) / totalMarks) * 100) : 0);
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

    const timeTakenSeconds = submitResult?.durationSeconds ?? pastAttempt?.durationSeconds ?? elapsedSeconds ?? 0;
    const negDeducted =
      submitResult?.negativeMarks !== undefined
        ? submitResult.negativeMarks
        : ((submitResult?.totalWrong || pastAttempt?.totalWrong || 0) * (test?.negativeMarkRate || 1));
    const displayRank = submitResult?.rank ?? pastAttempt?.rank ?? 1;

    // Check pass criteria dynamically from test settings
    let passMarksVal = 0;
    let passPct = 0;
    if (test?.config?.passPercentage !== undefined && test.config.passPercentage !== null) {
      passPct = Number(test.config.passPercentage);
      passMarksVal = Math.round((passPct / 100) * totalMarks * 100) / 100;
    } else if (test?.passMarks !== undefined && test.passMarks !== null) {
      passMarksVal = Number(test.passMarks);
      passPct = totalMarks > 0 ? Math.round((passMarksVal / totalMarks) * 100) : 40;
    } else {
      passPct = 40;
      passMarksVal = Math.round(0.4 * totalMarks);
    }
    const isPassed =
      submitResult?.isPassed ??
      pastAttempt?.isPassed ??
      (finalScore >= passMarksVal || pct >= passPct);

    return (
      <div className="min-h-[88vh] bg-gradient-to-b from-[#eaf9eb] via-[#f4faf4] to-slate-50 py-3 sm:py-5 px-3 flex flex-col items-center justify-center animate-in fade-in duration-300">
        {/* Top Floating Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-700/90 text-white text-[11px] font-bold shadow-md shadow-emerald-700/20 mb-2 sm:mb-3">
          <CheckCircle2 className="w-3.5 h-3.5 fill-white text-emerald-700" />
          <span>Test submitted successfully</span>
        </div>

        {/* 3D Celebration Hero with Checkmark & Confetti */}
        <div className="relative mb-2 flex items-center justify-center">
          {/* Confetti Particles */}
          <span className="absolute -top-2 -left-5 w-2.5 h-3.5 rounded-xs bg-purple-500 rotate-12 animate-pulse" />
          <span className="absolute top-1 -left-8 w-2 h-3.5 rounded-xs bg-amber-400 -rotate-45" />
          <span className="absolute -top-3 right-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="absolute top-3 -right-8 w-3 h-1.5 rounded-xs bg-emerald-400 rotate-45" />
          <span className="absolute bottom-0 -left-6 w-2 h-2 rounded-xs bg-rose-400 rotate-12" />
          <span className="absolute bottom-1 -right-6 w-2.5 h-2.5 rounded-full bg-amber-500" />

          {/* 3D Checkmark Orb */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-[#4ade80] to-[#15803d] p-1 shadow-[0_10px_20px_rgba(22,163,74,0.3),inset_0_2px_4px_rgba(255,255,255,0.7)] flex items-center justify-center relative z-10 animate-in zoom-in duration-500">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] flex items-center justify-center shadow-[inset_0_-3px_5px_rgba(0,0,0,0.25)]">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[3.5]" />
            </div>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight text-center">
          Test Submitted Successfully!
        </h1>
        <p className="text-[11px] sm:text-xs text-slate-500 font-medium text-center mt-0.5 mb-2 sm:mb-3">
          Your answers have been recorded securely.
        </p>

        {/* White Results Card (Fits single viewport on Desktop & Mobile) */}
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl p-4 sm:p-5 space-y-3 sm:space-y-3.5">
          {/* Top Grab Bar & Status Badge */}
          <div className="flex items-center justify-between">
            <div className="w-8 h-1 bg-slate-200 rounded-full" />
            <span
              className={`px-3 py-0.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs ${
                isPassed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isPassed ? 'fill-emerald-600 text-white' : 'fill-amber-600 text-white'}`} />
              {isPassed ? 'PASSED' : 'NEEDS PRACTICE'}
            </span>
          </div>

          {/* Main Middle Section: Circular Gauge (Left) + 2x2 Stats Grid (Right) */}
          <div className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
            {/* Left: Circular Progress Gauge */}
            <div className="col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f1f5f9"
                    strokeWidth="7"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#scoreGradientCompact)"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="scoreGradientCompact" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Score in Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {finalScore}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      / {totalMarks}
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-indigo-600 font-mono">
                    {pct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right: 2x2 Stats Grid with Styled Icons */}
            <div className="col-span-7 grid grid-cols-2 gap-1.5 sm:gap-2 text-center">
              {/* Time Taken */}
              <div className="p-2 bg-slate-50/90 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-0.5 shadow-inner">
                  <Clock className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-[9px] font-semibold text-slate-500">Time Taken</span>
                <span className="text-xs font-bold font-mono text-slate-900">{formatTimer(timeTakenSeconds)}</span>
              </div>

              {/* Percentage */}
              <div className="p-2 bg-slate-50/90 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-0.5 shadow-inner font-bold text-[10px]">
                  %
                </div>
                <span className="text-[9px] font-semibold text-slate-500">Percentage</span>
                <span className="text-xs font-bold font-mono text-slate-900">{pct}%</span>
              </div>

              {/* Correct */}
              <div className="p-2 bg-slate-50/90 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                </div>
                <span className="text-[9px] font-semibold text-slate-500">Correct</span>
                <span className="text-xs font-bold font-mono text-slate-900">{submitResult?.totalCorrect ?? pastAttempt?.totalCorrect ?? 0}</span>
              </div>

              {/* Wrong */}
              <div className="p-2 bg-slate-50/90 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mb-0.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-600 fill-rose-100" />
                </div>
                <span className="text-[9px] font-semibold text-slate-500">Wrong</span>
                <span className="text-xs font-bold font-mono text-slate-900">{submitResult?.totalWrong ?? pastAttempt?.totalWrong ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Bottom 4-Item Horizontal Stat Strip */}
          <div className="p-2 sm:p-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-4 gap-1 items-center text-center">
            {/* Unanswered */}
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black flex items-center justify-center mb-0.5">
                ?
              </div>
              <span className="text-[9px] text-slate-500 font-semibold">Unanswered</span>
              <span className="text-xs font-bold text-slate-900 font-mono">{submitResult?.totalUnanswered ?? pastAttempt?.totalUnanswered ?? 0}</span>
            </div>

            {/* Negative */}
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-black flex items-center justify-center mb-0.5">
                -
              </div>
              <span className="text-[9px] text-slate-500 font-semibold">Negative</span>
              <span className="text-xs font-bold text-rose-600 font-mono">
                {negDeducted > 0 ? `-${negDeducted}` : '0'}
              </span>
            </div>

            {/* Rank */}
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center mb-0.5">
                <Trophy className="w-3 h-3 text-purple-600" />
              </div>
              <span className="text-[9px] text-slate-500 font-semibold">Rank</span>
              <span className="text-xs font-bold text-purple-700 font-mono">
                #{displayRank}
              </span>
            </div>

            {/* Leaderboard */}
            <button
              type="button"
              onClick={() => router.push(`/tests/${testId}?tab=leaderboard`)}
              className="flex flex-col items-center text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer group"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center mb-0.5 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-3 h-3 text-indigo-600" />
              </div>
              <span className="text-[9px] font-bold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                Leaderboard <ChevronRight className="w-2 h-2" />
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Button 1: Solutions & Review */}
            <button
              type="button"
              onClick={() => setPhase('REVIEW')}
              className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" /> Solutions & Review
            </button>

            {/* Button 2: Answer Key & Calculation */}
            <button
              type="button"
              onClick={() => setPhase('ANSWER_KEY')}
              className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Answer Key & Calculation
            </button>

            {/* Button 3: Download PDF Report */}
            <button
              type="button"
              onClick={() => downloadFile(`/tests/${testId}/export/answer-key/pdf`, `answer-key-${testId}.pdf`)}
              className="w-full py-2.5 sm:py-3 bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-brand-600" /> Download PDF Report
            </button>

            {/* Button 4: View Leaderboard */}
            <button
              type="button"
              onClick={() => router.push(`/tests/${testId}?tab=leaderboard`)}
              className="w-full py-2.5 sm:py-3 bg-white hover:bg-indigo-50/50 border border-indigo-200 text-indigo-600 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Trophy className="w-4 h-4 text-indigo-600" /> View Leaderboard
            </button>

            {/* Retake Exam & Return Link */}
            <div className="flex items-center justify-between pt-1 px-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setUserAnswers({});
                  setPastAttempt(null);
                  setSubmitResult(null);
                  handleStartExam();
                }}
                className="text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
              >
                <RotateCcw className="w-3 h-3" /> Start Retake Exam
              </button>
              <Link
                href={isStudent ? '/tests' : '/tests/builder'}
                className="text-slate-500 hover:text-slate-900 font-semibold transition-colors text-[11px]"
              >
                ← Back to My Tests
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 4: CHECK ANSWERS & STEP SOLUTIONS (SCR-STU-15)
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'REVIEW') {
    const getQuestionStatus = (q: any) => {
      const qId = q.id || q.questionId;
      const ans = userAnswers[qId];
      const selectedIds: string[] =
        (ans && ans.selectedOptionIds && ans.selectedOptionIds.length > 0)
          ? ans.selectedOptionIds
          : q.selectedOptionIds || (q.options || []).filter((o: any) => o.isSelected).map((o: any) => o.id) || [];
      const hasAns = selectedIds.length > 0;
      const correctOpts = (q.options || []).filter((o: any) => o.isCorrect);
      const isCorrect =
        hasAns &&
        correctOpts.length > 0 &&
        correctOpts.length === selectedIds.length &&
        correctOpts.every((o: any) => selectedIds.includes(o.id));
      const isReview = ans?.isMarkedForReview || q.isMarkedForReview || false;

      return { qId, hasAns, isCorrect, isReview, selectedIds, correctOpts };
    };

    const countCorrect = questions.filter((q) => getQuestionStatus(q).isCorrect).length;
    const countWrong = questions.filter((q) => {
      const s = getQuestionStatus(q);
      return s.hasAns && !s.isCorrect;
    }).length;
    const countUnanswered = questions.filter((q) => !getQuestionStatus(q).hasAns).length;
    const countMarked = questions.filter((q) => getQuestionStatus(q).isReview).length;

    const filteredQs = questions.filter((q) => {
      const { hasAns, isCorrect, isReview } = getQuestionStatus(q);
      if (reviewFilter === 'CORRECT') return isCorrect;
      if (reviewFilter === 'WRONG') return hasAns && !isCorrect;
      if (reviewFilter === 'UNANSWERED') return !hasAns;
      if (reviewFilter === 'REVIEW') return isReview;
      return true;
    });

    const activeReviewQ = filteredQs[reviewIndex] || filteredQs[0] || questions[0] || {};
    const activeStatus = getQuestionStatus(activeReviewQ);

    // Current question index within full test
    const globalQIndex = questions.findIndex(
      (q) => (q.id || q.questionId) === (activeReviewQ.id || activeReviewQ.questionId),
    );
    const displayQNum = activeReviewQ.questionNumber || (globalQIndex >= 0 ? globalQIndex + 1 : reviewIndex + 1);
    const totalQuestions = questions.length || 1;
    const progressPct = Math.min(100, Math.max(0, Math.round((displayQNum / totalQuestions) * 100)));

    // Active question accordion states (stored per question ID)
    const activeQKey = activeReviewQ.id || activeReviewQ.questionId || `q-${reviewIndex}`;

    // Toggle helper
    const toggleAccordion = (type: 'hint' | 'explanation' | 'solution') => {
      const current = reviewOpenSections[activeQKey] || { hint: false, explanation: false, solution: true };
      setReviewOpenSections((prev) => ({
        ...prev,
        [activeQKey]: {
          ...current,
          [type]: !current[type],
        },
      }));
    };

    const currentSections = reviewOpenSections[activeQKey] || {
      hint: false,
      explanation: false,
      solution: true,
    };

    const posMarks = activeReviewQ.marksPositive || test?.config?.defaultPositiveMarks || 1;
    const negMarks = activeReviewQ.marksNegative || test?.config?.defaultNegativeMarks || 0;

    return (
      <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-5 pb-32 sm:pb-36">
        {/* ── 1. Top Header App Bar ── */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setPhase('RESULT')}
              className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Back to Scorecard"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate tracking-tight">
                Solutions & Review
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {test?.title || 'Mock Examination'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Palette Trigger */}
            <button
              onClick={() => setIsMobilePaletteOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden sm:inline">Palette</span>
              <span className="text-[10px] font-mono bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-md">
                {displayQNum}/{totalQuestions}
              </span>
            </button>

            <button
              onClick={() => router.push(isStudent ? '/tests' : '/tests/builder')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>

        {/* ── 2. Review Mode Tabs (Segmented Control) ── */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={() => setPhase('REVIEW')}
            className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              phase === 'REVIEW'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="truncate">Solutions</span>
          </button>
          <button
            onClick={() => setPhase('ANSWER_KEY')}
            className="py-2 px-2 sm:px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate">Answer Key</span>
          </button>
          <button
            onClick={() => setPhase('RESULT')}
            className="py-2 px-2 sm:px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span className="truncate">Scorecard</span>
          </button>
        </div>

        {/* ── 3. Question Progress Card ── */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white">
                Q{displayQNum} <span className="text-slate-400 font-normal">of {totalQuestions}</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-100 dark:border-purple-800/50">
                {activeReviewQ.sectionName || 'General Section'}
              </span>
            </div>

            {/* Answer Status Pill */}
            <div>
              {activeStatus.hasAns && activeStatus.isCorrect ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct (+{posMarks})
                </span>
              ) : activeStatus.hasAns ? (
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-bold border border-rose-200 dark:border-rose-800/60 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Incorrect (-{negMarks})
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                  Unanswered (0)
                </span>
              )}
            </div>
          </div>

          {/* Smooth Linear Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── 4. Quick Filter Chips Bar ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'ALL', label: `All (${questions.length})` },
            { key: 'CORRECT', label: `Correct (${countCorrect})` },
            { key: 'WRONG', label: `Wrong (${countWrong})` },
            { key: 'UNANSWERED', label: `Unanswered (${countUnanswered})` },
            { key: 'REVIEW', label: `Marked (${countMarked})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setReviewFilter(f.key as any);
                setReviewIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                reviewFilter === f.key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── 5. Question Statement & Options Card ── */}
        {activeReviewQ && (activeReviewQ.id || activeReviewQ.questionId || activeReviewQ.contentHtml) ? (
          <div className="space-y-4">
            {/* Question Statement Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Question Statement
              </div>
              <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                {renderMath(activeReviewQ.contentHtml)}
              </div>

              {activeReviewQ.diagramUrl && (
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 inline-block">
                  <img
                    src={activeReviewQ.diagramUrl}
                    alt="Question Diagram"
                    className="max-h-72 rounded-xl object-contain"
                  />
                </div>
              )}
            </div>

            {/* Answer Options Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-0.5">
                Answer Options
              </div>

              <div className="space-y-2.5">
                {(activeReviewQ.options || []).map((opt: any) => {
                  const isSelected = activeStatus.selectedIds.includes(opt.id);
                  const isCorrect = opt.isCorrect;

                  let containerStyle =
                    'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';
                  let badgeStyle =
                    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';

                  if (isCorrect) {
                    containerStyle =
                      'bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs';
                    badgeStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs';
                  } else if (isSelected && !isCorrect) {
                    containerStyle =
                      'bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-950 dark:text-rose-100 font-semibold shadow-xs';
                    badgeStyle = 'bg-rose-600 text-white border-rose-600 shadow-2xs';
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition-all ${containerStyle}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${badgeStyle}`}
                        >
                          {opt.optionLabel}
                        </div>
                        <div className="flex-1 leading-relaxed text-slate-900 dark:text-slate-100">
                          {renderMath(opt.contentHtml)}
                        </div>
                      </div>

                      {/* Right Tag */}
                      <div className="shrink-0">
                        {isCorrect && (
                          <span className="text-[10px] sm:text-xs font-bold uppercase text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Correct Answer
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-[10px] sm:text-xs font-bold uppercase text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                            <X className="w-3.5 h-3.5 stroke-[2.5]" /> Your Answer
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 6. Interactive 3-Tier Solutions Accordions ── */}
            <div className="space-y-3">
              {/* Accordion 1: Hint */}
              {activeReviewQ.solution?.hintHtml && (
                <ReviewAccordion
                  icon={<Lightbulb className="w-3.5 h-3.5" />}
                  title="Hint"
                  isOpen={currentSections.hint ?? false}
                  onToggle={() => toggleAccordion('hint')}
                  colorScheme="amber"
                >
                  <div className="text-amber-950 dark:text-amber-200 leading-relaxed font-sans text-xs sm:text-sm">
                    {renderMath(activeReviewQ.solution.hintHtml)}
                  </div>
                </ReviewAccordion>
              )}

              {/* Accordion 2: Short Explanation */}
              {activeReviewQ.solution?.shortExplanation && (
                <ReviewAccordion
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  title="Short Explanation"
                  isOpen={currentSections.explanation ?? false}
                  onToggle={() => toggleAccordion('explanation')}
                  colorScheme="blue"
                >
                  <div className="text-blue-950 dark:text-blue-200 leading-relaxed font-sans text-xs sm:text-sm">
                    {renderMath(activeReviewQ.solution.shortExplanation)}
                  </div>
                </ReviewAccordion>
              )}

              {/* Accordion 3: Step-by-Step Solution */}
              {(activeReviewQ.solution?.stepByStepHtml || activeReviewQ.solution?.contentHtml) && (
                <ReviewAccordion
                  icon={<FileText className="w-3.5 h-3.5" />}
                  title="Step-by-Step Solution"
                  isOpen={currentSections.solution ?? true}
                  onToggle={() => toggleAccordion('solution')}
                  colorScheme="purple"
                >
                  <StepByStepSolutionRenderer
                    solutionText={activeReviewQ.solution.stepByStepHtml || activeReviewQ.solution.contentHtml}
                  />
                </ReviewAccordion>
              )}
            </div>

            {/* ── 7. Question Navigation Bar (Bottom) ── */}
            <div className="sticky bottom-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between gap-2">
              <button
                disabled={reviewIndex === 0}
                onClick={() => setReviewIndex((prev) => Math.max(0, prev - 1))}
                className="px-3.5 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-35 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden xs:inline">Previous</span>
              </button>

              {/* Center Trigger to Open Palette */}
              <button
                type="button"
                onClick={() => setIsMobilePaletteOpen(true)}
                className="flex flex-col items-center justify-center px-3 py-1 text-center hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                  Q {displayQNum} / {totalQuestions}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5">
                  <LayoutGrid className="w-2.5 h-2.5" /> Jump to Question
                </span>
              </button>

              <button
                disabled={reviewIndex >= filteredQs.length - 1}
                onClick={() => setReviewIndex((prev) => Math.min(filteredQs.length - 1, prev + 1))}
                className="px-4 sm:px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-35 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 text-xs sm:text-sm">
            No questions match the selected filter.
          </div>
        )}

        {/* ── 8. Question Navigator Palette Modal ── */}
        {isMobilePaletteOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-brand-600" /> Question Navigator
                  </h3>
                  <p className="text-[11px] text-slate-500">Tap any number to view question & solution</p>
                </div>
                <button
                  onClick={() => setIsMobilePaletteOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Summary Filter Bar */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { key: 'ALL', label: `All (${questions.length})` },
                  { key: 'CORRECT', label: `Correct (${countCorrect})` },
                  { key: 'WRONG', label: `Wrong (${countWrong})` },
                  { key: 'UNANSWERED', label: `Unanswered (${countUnanswered})` },
                  { key: 'REVIEW', label: `Marked (${countMarked})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setReviewFilter(f.key as any)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      reviewFilter === f.key
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Question Badges Grid */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 pt-1">
                  {questions.map((q, idx) => {
                    const { hasAns, isCorrect } = getQuestionStatus(q);
                    const isCurrent = (activeReviewQ.id || activeReviewQ.questionId) === (q.id || q.questionId);

                    let badgeStyle =
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200';
                    if (hasAns && isCorrect) {
                      badgeStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-2xs';
                    } else if (hasAns && !isCorrect) {
                      badgeStyle = 'bg-rose-500 text-white border-rose-600 shadow-2xs';
                    }

                    return (
                      <button
                        key={q.id || q.questionId || idx}
                        onClick={() => {
                          setReviewFilter('ALL');
                          const targetIdx = questions.findIndex(
                            (item) => (item.id || item.questionId) === (q.id || q.questionId),
                          );
                          setReviewIndex(Math.max(0, targetIdx));
                          setIsMobilePaletteOpen(false);
                        }}
                        className={`h-10 rounded-xl font-bold font-mono text-xs border flex items-center justify-center transition-all cursor-pointer ${badgeStyle} ${
                          isCurrent
                            ? 'ring-2 ring-brand-600 ring-offset-2 scale-105 font-black shadow-md'
                            : ''
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Palette Legend */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Correct ({countCorrect})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Wrong ({countWrong})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Unanswered ({countUnanswered})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 5: ANSWER KEY & CALCULATION BREAKDOWN TABLE (SCR-STU-16)
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'ANSWER_KEY') {
    const dataList = answerKeyData.length > 0 ? answerKeyData : questions;

    // Rates from test config or defaults
    const posRate = test?.config?.defaultPositiveMarks ?? (test?.totalMarks && questions.length ? Number((test.totalMarks / questions.length).toFixed(2)) : 4);
    const negRate = test?.config?.defaultNegativeMarks ?? (test?.negativeMarkRate !== undefined ? Number(test.negativeMarkRate) : 1);

    // Map rows cleanly
    const rows = dataList.map((item: any, idx: number) => {
      let qNum = idx + 1;
      let correctAns = '-';
      let yourAns = '—';
      let isCorrect = false;
      let isWrong = false;
      let marks = 0;
      let neg = 0;

      if (answerKeyData.length > 0) {
        qNum = item.questionNumber || idx + 1;
        correctAns = item.correctAnswer || '-';
        yourAns = item.yourAnswer && item.yourAnswer !== '-' ? item.yourAnswer : '—';
        isCorrect = item.status === 'CORRECT' || item.status === '✔ Correct';
        isWrong = item.status === 'WRONG' || item.status === '✖ Wrong';
        marks = isCorrect ? (Number(item.marks) || posRate) : 0;
        neg = isWrong ? (Number(item.negative) > 0 ? -Number(item.negative) : -negRate) : 0;
      } else {
        const q = item;
        const ans = userAnswers[q.id];
        const hasAns = ans && ans.selectedOptionIds?.length > 0;
        const correctOpts = (q.options || []).filter((o: any) => o.isCorrect);
        correctAns = correctOpts.map((o: any) => o.optionLabel).join(', ') || '-';

        if (hasAns) {
          const selectedOpts = (q.options || []).filter((o: any) => ans.selectedOptionIds.includes(o.id));
          yourAns = selectedOpts.map((o: any) => o.optionLabel).join(', ') || '—';
          isCorrect =
            correctOpts.length > 0 &&
            correctOpts.length === selectedOpts.length &&
            correctOpts.every((o: any) => ans.selectedOptionIds.includes(o.id));
          if (isCorrect) {
            marks = q.marksPositive || posRate;
          } else {
            isWrong = true;
            neg = -(q.marksNegative || negRate);
          }
        } else {
          yourAns = '—';
        }
      }

      return {
        qNum,
        correctAns,
        yourAns,
        isCorrect,
        isWrong,
        isUnanswered: !isCorrect && !isWrong,
        marks,
        neg,
      };
    });

    const correctCount = rows.filter((r) => r.isCorrect).length;
    const wrongCount = rows.filter((r) => r.isWrong).length;
    const unansweredCount = rows.length - (correctCount + wrongCount);

    const totalPossible = test?.totalMarks || Number((rows.length * posRate).toFixed(2));
    const correctTotal = Number((correctCount * posRate).toFixed(2));
    const wrongTotal = Number((wrongCount * negRate).toFixed(2));
    const rawScore = Number((correctTotal - wrongTotal).toFixed(2));
    const finalScore = submitResult?.totalScore ?? pastAttempt?.totalScore ?? rawScore;
    const percentage =
      submitResult?.percentage ??
      pastAttempt?.percentage ??
      (totalPossible > 0 ? Number(((finalScore / totalPossible) * 100).toFixed(2)) : 0);

    // Support both direct mark setting and percentage setting dynamically
    let passMarksVal = 0;
    let passPct = 0;
    if (test?.config?.passPercentage !== undefined && test.config.passPercentage !== null) {
      passPct = Number(test.config.passPercentage);
      passMarksVal = Math.round((passPct / 100) * totalPossible * 100) / 100;
    } else if (test?.passMarks !== undefined && test.passMarks !== null) {
      passMarksVal = Number(test.passMarks);
      passPct = totalPossible > 0 ? Math.round((passMarksVal / totalPossible) * 100) : 40;
    } else {
      passPct = 40;
      passMarksVal = Math.round(0.4 * totalPossible);
    }

    const isPassed =
      submitResult?.isPassed !== undefined
        ? submitResult.isPassed
        : pastAttempt?.isPassed !== undefined
        ? pastAttempt.isPassed
        : finalScore >= passMarksVal || percentage >= passPct;

    return (
      <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-6">
        {/* Top Header & Tab Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPhase('REVIEW')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-brand-600" /> Solutions & Review
            </button>
            <button
              onClick={() => setPhase('ANSWER_KEY')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Answer Key & Calculation
            </button>
            <button
              onClick={() => setPhase('RESULT')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-purple-600" /> Scorecard
            </button>
          </div>

          <button
            onClick={() => router.push(isStudent ? '/tests' : '/tests/builder')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors self-end sm:self-auto cursor-pointer"
          >
            ← Exit Test
          </button>
        </div>

        {/* Legend / Key Label */}
        <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-[11px] text-slate-600 font-medium flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span><strong className="text-brand-700 font-bold">CA</strong> = Correct Ans</span>
            <span><strong className="text-brand-700 font-bold">YA</strong> = Your Ans</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold"><Check className="w-3.5 h-3.5 stroke-[2.5]" /> Correct</span>
            <span className="flex items-center gap-1 text-rose-700 font-semibold"><X className="w-3.5 h-3.5 stroke-[2.5]" /> Wrong</span>
            <span className="flex items-center gap-1 text-slate-500 font-semibold"><span className="font-bold text-slate-400">—</span> Unanswered</span>
          </div>
        </div>

        {/* Answer Key Grid Table matching reference image */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="w-full">
            <table className="w-full text-center text-xs border-collapse table-fixed">
              <thead>
                <tr className="bg-[#EEF0FF] text-brand-700 font-bold text-[11px] border-b border-indigo-100/80">
                  <th className="py-3 px-1 border-r border-indigo-100/80 font-bold w-[15%]">Q.No</th>
                  <th className="py-3 px-1 border-r border-indigo-100/80 font-bold w-[16%]" title="Correct Answer">CA</th>
                  <th className="py-3 px-1 border-r border-indigo-100/80 font-bold w-[16%]" title="Your Answer">YA</th>
                  <th className="py-3 px-1 border-r border-indigo-100/80 font-bold w-[19%]">Status</th>
                  <th className="py-3 px-1 border-r border-indigo-100/80 font-bold w-[17%]">Marks</th>
                  <th className="py-3 px-1 font-bold w-[17%]">Negative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-xs font-sans">
                {rows.map((row) => (
                  <tr key={row.qNum} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-1 font-bold text-slate-900 border-r border-slate-100">
                      {row.qNum}
                    </td>
                    <td className="py-2.5 px-1 font-bold text-slate-900 border-r border-slate-100">
                      {row.correctAns}
                    </td>
                    <td className="py-2.5 px-1 font-bold text-slate-900 border-r border-slate-100">
                      {row.yourAns}
                    </td>
                    <td className="py-2.5 px-1 border-r border-slate-100">
                      {row.isCorrect ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto stroke-[2.5]" />
                      ) : row.isWrong ? (
                        <X className="w-4 h-4 text-rose-600 mx-auto stroke-[2.5]" />
                      ) : (
                        <span className="text-slate-400 font-bold text-sm select-none">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-1 font-bold text-slate-900 border-r border-slate-100">
                      {row.marks}
                    </td>
                    <td className="py-2.5 px-1 font-bold text-slate-900">
                      {row.neg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Score Calculation Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 text-xs font-sans">
          {/* Card Title */}
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm sm:text-base">
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-brand-700 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <span>Score Calculation</span>
          </div>

          {/* Formulas */}
          <div className="space-y-2 text-slate-700 font-medium">
            <div className="flex items-center justify-between">
              <span>Total Questions × Marks per Q</span>
              <span className="font-mono text-slate-900 font-bold">
                = {rows.length} × {posRate} = {totalPossible}
              </span>
            </div>

            <div className="flex items-center justify-between text-emerald-600 font-semibold">
              <span>Correct</span>
              <span className="font-mono text-emerald-600 font-bold">
                {correctCount} × {posRate} = +{correctTotal}
              </span>
            </div>

            <div className="flex items-center justify-between text-rose-600 font-semibold">
              <span>Wrong</span>
              <span className="font-mono text-rose-600 font-bold">
                {wrongCount} × (-{negRate}) = -{wrongTotal}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>Unanswered</span>
              <span className="font-mono text-slate-800 font-bold">
                {unansweredCount} × 0 = 0
              </span>
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="border-t border-dashed border-slate-200 pt-1" />

          {/* Final Score */}
          <div className="flex items-center justify-between font-bold text-slate-900 text-sm sm:text-base">
            <span>Final Score</span>
            <span className="font-mono font-extrabold text-slate-900">
              = {finalScore} / {totalPossible}
            </span>
          </div>

          {/* Percentage Box */}
          <div className="p-3 bg-[#EEF0FF] rounded-xl border border-indigo-100 flex items-center justify-between font-bold text-brand-700">
            <span>Percentage</span>
            <span className="font-mono font-extrabold text-sm text-brand-700">
              = {Number(percentage).toFixed(2)}%
            </span>
          </div>

          {/* Result Passed/Failed Box */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 font-bold text-xs shadow-xs ${
              isPassed
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                isPassed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
              <span>
                Result: <span className="uppercase font-extrabold">{isPassed ? 'PASSED' : 'FAILED'}</span>
              </span>
              <span className="text-[11px] font-mono opacity-90">
                (Pass mark: {passMarksVal} Marks / {passPct}%)
              </span>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => downloadFile(`/tests/${testId}/export/answer-key/pdf`, `answer-key-${testId}.pdf`)}
              className="py-3 px-4 rounded-xl border-2 border-brand-600 text-brand-600 font-bold text-xs hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={() => setPhase('RESULT')}
              className="py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 cursor-pointer"
            >
              Back to Result
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 2: LIVE TEST QUESTION RUNNER (SCR-STU-11)
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 max-w-7xl mx-auto relative select-none pb-24 sm:pb-6">
      {/* Dynamic Floating Anti-Leak Camera Watermark (doc 22.2 / SCR-STU-06) */}
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center opacity-[0.06] select-none">
        <div className="rotate-[-25deg] text-center space-y-4">
          <p className="text-3xl font-extrabold font-mono tracking-widest text-slate-900">
            EXAMLY PROTECTED EXAMINATION
          </p>
          <p className="text-xl font-bold font-mono text-slate-800">
            STUDENT SESSION • ROLL 12A-034 • {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* ── RESPONSIVE TOP HEADER BAR ── */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-lg space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        {/* Top Row: Title, Section & Mobile Palette Button */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-xs sm:text-sm truncate max-w-[180px] sm:max-w-xs">{test?.title || 'Live Mock Test'}</span>
            <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[9px] sm:text-[10px] font-bold shrink-0">
              {currentQ.sectionName || 'Section'}
            </span>
          </div>

          {/* Mobile Question Palette Trigger Button */}
          <button
            onClick={() => setIsMobilePaletteOpen(true)}
            className="lg:hidden px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-brand-300 text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 shrink-0"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Q ({answeredCount}/{questions.length})</span>
          </button>
        </div>

        {/* Bottom Row / Desktop Right: Timer, Strikes & Submit */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-1.5 sm:pt-0 border-t border-slate-800 sm:border-t-0">
          {antiCheatStrikes > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-1 rounded-lg animate-pulse">
              <AlertTriangle className="w-3 h-3" /> Strikes: {antiCheatStrikes}/3
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 sm:hidden">
              Q {currentIndex + 1}/{questions.length}
            </span>
          )}

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-mono font-bold text-xs sm:text-sm text-brand-300">{formatTimer(remainingSeconds)}</span>
          </div>

          <button
            disabled={isSubmitLocked}
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> {isSubmitLocked ? `Locked ${formatTimer(unlockRemainingSeconds)}` : 'Submit Test'}
          </button>
        </div>
      </div>

      {/* Cheating Attempt Warning Toast */}
      {showCheatWarning && (
        <div className="bg-rose-500 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg text-xs font-semibold animate-bounce">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Cheating attempt detected ({antiCheatStrikes}/3) — Please do not leave or minimize the test window!
            </span>
          </div>
          <button onClick={() => setShowCheatWarning(false)} className="p-1 hover:bg-rose-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split Layout: Question Card (Left 2 Cols) + Palette Sidebar (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Question Box & Options (SCR-STU-11) */}
        <div className="lg:col-span-2 space-y-5">
          {pageQuestions.map((q: any, pIdx: number) => {
            const qIndex = pageStart + pIdx;
            const ans = userAnswers[q.id] || { selectedOptionIds: [], isMarkedForReview: false };

            return (
              <div
                key={q.id || qIndex}
                id={`question-card-${qIndex}`}
                className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-sm space-y-5"
              >
                {/* Header: Q Number, Section & Marks */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-800">
                      Question {qIndex + 1} of {questions.length}
                    </span>
                    {q.sectionName && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                        {q.sectionName}
                      </span>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-[11px] sm:text-xs font-bold border border-emerald-200">
                    +{q.marksPositive || 4} / -{q.marksNegative || 1} Marks
                  </span>
                </div>

                {/* Question Statement (KaTeX LaTeX Rendered) */}
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {renderMath(q.contentHtml || '')}
                </div>

                {/* Options List */}
                <div className="space-y-2.5 pt-1">
                  {(q.options || []).map((opt: any) => {
                    const isSelected = ans.selectedOptionIds.includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id, q.questionType === 'MULTIPLE_CORRECT')}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-brand-50/70 border-brand-500 ring-2 ring-brand-500/20 text-brand-900 shadow-sm'
                            : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/90 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center transition-all shrink-0 ${
                            isSelected ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {opt.optionLabel}
                        </div>

                        <div className="text-xs font-medium leading-normal flex-1">
                          {renderMath(cleanOptionText(opt.contentHtml))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Action Bar: Mark for Review & Clear Response (Desktop) */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleReview(q.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      ans.isMarkedForReview
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : 'bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {ans.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </button>

                  <button
                    onClick={() => handleClearAnswer(q.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    Clear Response
                  </button>
                </div>
              </div>
            );
          })}

          {/* Navigation Controls: Previous / Save & Next (Desktop) */}
          <div className="hidden sm:flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <button
              disabled={pageStart === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - questionsPerScreen))}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <span className="text-[11px] text-slate-400 font-mono">
              🔒 Submit unlocks in {formatTimer(unlockRemainingSeconds)}
            </span>

            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + questionsPerScreen))}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all"
            >
              Save & Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Question Palette Grid (SCR-STU-12) - Visible on Desktop */}
        <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
            <span className="text-[10px] text-slate-400">Tap number to jump</span>
          </div>

          {/* Legend Chips (SCR-STU-12) */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span> {answeredCount} Answered
            </div>
            <div className="flex items-center gap-1.5 text-purple-700">
              <span className="w-3 h-3 rounded-md bg-purple-500"></span> {reviewCount} Review
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-md bg-slate-200"></span> {unansCount} Unvisited
            </div>
          </div>

          {/* Grid Numbers */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {questions.map((q, idx) => {
              const a = userAnswers[q.id];
              const isAnswered = a?.selectedOptionIds && a.selectedOptionIds.length > 0;
              const isReview = a?.isMarkedForReview;
              const isCurrent = idx === currentIndex;

              let color = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
              if (isAnswered) color = 'bg-emerald-500 text-white shadow-sm';
              if (isReview) color = 'bg-purple-600 text-white shadow-sm';

              return (
                <button
                  key={q.id}
                  onClick={() => handleJumpToQuestion(idx)}
                  className={`h-9 rounded-xl text-xs font-bold font-mono transition-all ${color} ${
                    isCurrent ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── STICKY MOBILE BOTTOM ACTION BAR (Pinned on Mobile screens) ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md px-3 py-2.5 border-t border-slate-200 shadow-2xl flex items-center justify-between gap-2">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-all shrink-0"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        <button
          onClick={() => handleToggleReview(currentQ.id)}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
            currentAns.isMarkedForReview
              ? 'bg-purple-100 text-purple-800 border border-purple-300'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>{currentAns.isMarkedForReview ? 'Marked' : 'Mark'}</span>
        </button>

        <button
          onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1 transition-all shrink-0"
        >
          <span>Save & Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── MOBILE QUESTION PALETTE SLIDE-UP DRAWER ── */}
      {isMobilePaletteOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="flex-1" onClick={() => setIsMobilePaletteOpen(false)} />
          <div className="bg-white rounded-t-3xl border-t border-slate-200 p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
                <p className="text-[11px] text-slate-500">Tap question number to jump directly</p>
              </div>
              <button
                onClick={() => setIsMobilePaletteOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Legend Chips */}
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold shrink-0 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {answeredCount} Answered
              </span>
              <span className="flex items-center gap-1 text-purple-700">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> {reviewCount} Review
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> {unansCount} Left
              </span>
            </div>

            {/* Question Numbers Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2 pt-1">
                {questions.map((q, idx) => {
                  const a = userAnswers[q.id];
                  const isAnswered = a?.selectedOptionIds && a.selectedOptionIds.length > 0;
                  const isReview = a?.isMarkedForReview;
                  const isCurrent = idx === currentIndex;

                  let color = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                  if (isAnswered) color = 'bg-emerald-500 text-white shadow-sm';
                  if (isReview) color = 'bg-purple-600 text-white shadow-sm';

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleJumpToQuestion(idx)}
                      className={`h-10 rounded-xl text-xs font-bold font-mono transition-all ${color} ${
                        isCurrent ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Submit inside Drawer */}
            <div className="pt-2 border-t border-slate-100 shrink-0">
              <button
                disabled={isSubmitLocked}
                onClick={() => {
                  setIsMobilePaletteOpen(false);
                  setIsSubmitModalOpen(true);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Submit Exam ({answeredCount}/{questions.length} Answered)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Submitting Loading Overlay */}
      {isSubmittingExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-4 text-white animate-in fade-in">
          <div className="w-14 h-14 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
          <div className="text-center space-y-1.5 max-w-sm">
            <h3 className="text-lg font-bold">Submitting Examination...</h3>
            <p className="text-xs text-slate-300">
              Recording your answers, computing accuracy metrics, and preparing step solutions. Please wait...
            </p>
          </div>
        </div>
      )}

      {/* Submit Confirmation Warning Modal (SCR-STU-12) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Are you sure you want to submit?</h3>
              <p className="text-xs text-slate-500 mt-1">Once submitted, you cannot edit or undo responses.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">• Answered Questions:</span>
                <span className="font-bold text-emerald-600 font-mono">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">• Unanswered Questions:</span>
                <span className="font-bold text-rose-600 font-mono">{unansCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">• Marked for Review:</span>
                <span className="font-bold text-purple-600 font-mono">{reviewCount}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Review Answers
              </button>
              <button
                disabled={isSubmittingExam}
                onClick={() => handleAutoSubmit('User Confirmed Submit')}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmittingExam ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  'Yes, Submit Test'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveTestRunnerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading live test engine...</p>
        </div>
      }
    >
      <LiveTestRunnerContent />
    </Suspense>
  );
}
