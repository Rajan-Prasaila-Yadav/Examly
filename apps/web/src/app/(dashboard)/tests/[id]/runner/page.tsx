// apps/web/src/app/(dashboard)/tests/[id]/runner/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';

export default function LiveTestRunnerPage() {
  const params = useParams();
  const router = useRouter();
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
  const [hasAgreedRules, setHasAgreedRules] = useState(false);

  // Test & Attempt State
  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
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
  const [expandedSolutions, setExpandedSolutions] = useState<Record<number, boolean>>({});
  const [answerKeyData, setAnswerKeyData] = useState<any[]>([]);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  // Palette drawer
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState<'ALL' | 'ANSWERED' | 'REVIEW' | 'UNVISITED'>('ALL');

  const [startError, setStartError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const flattenQuestions = (testPayload: any) =>
    (testPayload?.sections || []).flatMap((sec: any) =>
      (sec.questions || []).map((q: any) => ({ ...q, sectionName: sec.name })),
    );

  // Load Test metadata (rules screen). Live paper comes from POST /start so keys stay hidden.
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await api.get(`/tests/${testId}`);
        setTest(res.data);
        setQuestions(flattenQuestions(res.data));
      } catch (e) {
        console.error(e);
      }
    };

    if (testId) {
      fetchTest();
    }
  }, [testId]);

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

  const handleAutoSubmit = async (reason?: string) => {
    if (isSubmittingExam) return;
    setIsSubmittingExam(true);
    setIsSubmitModalOpen(false);
    try {
      if (attemptId && attemptId !== 'attempt-live-demo') {
        const res = await api.post(`/tests/attempts/${attemptId}/submit`);
        setSubmitResult(res.data);

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
        // Mock calculation for offline / demo mode
        let correctCount = 0;
        let wrongCount = 0;
        let unans = 0;
        let score = 0;

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
              score -= q.marksNegative || 1;
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
  // PHASE 1: RULES & REGULATIONS (SCR-STU-10)
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'RULES') {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        <Link
          href="/tests/builder"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Test Suite
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{test?.title || 'Live Mock Examination'}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Please read all rules, anti-cheat policies, and scoring instructions carefully before starting.
            </p>
          </div>

          {/* Key Metrics Chips (SCR-STU-10) */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Duration</span>
              <span className="font-bold text-slate-900 font-mono">{test?.durationMinutes || 120} Min</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Questions</span>
              <span className="font-bold text-slate-900 font-mono">{questions.length} Qs</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Total Marks</span>
              <span className="font-bold text-brand-700 font-mono">{test?.totalMarks || 200}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Pass Mark</span>
              <span className="font-bold text-emerald-600 font-mono">{test?.passMarks || 80}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-950">
            You get the full <strong>{test?.durationMinutes || 0} minutes</strong>. Last allowed start:{' '}
            <strong>
              {test?.lastJoinAt
                ? new Date(test.lastJoinAt).toLocaleString()
                : test?.endDateTime
                ? new Date(
                    new Date(test.endDateTime).getTime() - (test.durationMinutes || 0) * 60 * 1000,
                  ).toLocaleString()
                : '—'}
            </strong>
            . After that, joining is blocked so every student gets a full sitting.
          </div>

          {/* Rules List (SCR-STU-10 pixel accurate) */}
          <div className="text-left space-y-2.5 text-xs text-slate-700 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. <strong>Do not leave the test screen:</strong> Tab switches increment anti-cheat strikes.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. <strong>Screenshot & screen recording disabled:</strong> Protected secure stream active.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>3. <strong>Copy-paste blocked:</strong> Text selection and clipboard shortcuts are locked.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>4. <strong>3 Strikes Rule:</strong> Accumulating 3 cheating strikes triggers automatic auto-submission.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>5. <strong>Submit unlock:</strong> Submit is locked for the first {test?.config?.submitUnlockDelayMins || 5} minute(s).</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>6. <strong>Full duration only:</strong> You cannot start if less than the full duration remains before the end time.</span>
            </div>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-center justify-center gap-2.5 cursor-pointer text-xs pt-2">
            <input
              type="checkbox"
              checked={hasAgreedRules}
              onChange={(e) => setHasAgreedRules(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="font-semibold text-slate-800">
              I have read the rules & regulations and agree to follow.
            </span>
          </label>

          {startError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left">{startError}</div>
          )}

          <button
            disabled={!hasAgreedRules || isStarting || questions.length === 0}
            onClick={handleStartExam}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
          >
            {isStarting ? 'Starting…' : questions.length === 0 ? 'No questions authored yet' : 'Start Test'}{' '}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 3: SUBMITTED RESULT SUMMARY (SCR-STU-14)
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'RESULT') {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              {submitResult?.isPassed ? '✔ PASSED' : '✖ ATTEMPT RECORDED'}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{test?.title || 'Mock Examination'}</h1>
            <p className="text-xs text-slate-500 mt-1">Your answers have been recorded securely.</p>
          </div>

          {/* Scorecard Hero */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-brand-600 to-accent-indigo text-white shadow-xl space-y-2">
            <span className="text-xs font-medium text-brand-200">Final Score</span>
            <div className="text-4xl font-extrabold font-mono">
              {submitResult?.totalScore || 148} <span className="text-lg font-normal text-brand-200">/ {test?.totalMarks || 200}</span>
            </div>
            <p className="text-xs text-brand-100 font-medium pt-2">
              Time Taken: <strong>{formatTimer(elapsedSeconds)}</strong> • Percentage: <strong>{submitResult?.percentage || 74.0}%</strong>
            </p>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block font-medium">Correct</span>
              <span className="text-lg font-bold text-emerald-800 font-mono">
                {submitResult?.totalCorrect || 38} Questions
              </span>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] text-rose-700 block font-medium">Wrong (-ve)</span>
              <span className="text-lg font-bold text-rose-800 font-mono">
                {submitResult?.totalWrong || 4} Questions
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-600 block font-medium">Unanswered</span>
              <span className="text-lg font-bold text-slate-700 font-mono">
                {submitResult?.totalUnanswered || 8}
              </span>
            </div>
          </div>

          {/* Action Buttons (SCR-STU-14) */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setPhase('REVIEW')}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4" /> Check Answers & Step Solutions
            </button>

            <button
              onClick={() => setPhase('ANSWER_KEY')}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> View Answer Key & Calculation Table
            </button>

            <button
              onClick={() => router.push('/tests/builder')}
              className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              Back to Test Suite
            </button>
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

    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPhase('RESULT')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scorecard
          </button>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-900 block">
              Check Answers ({filteredQs.length > 0 ? reviewIndex + 1 : 0} of {filteredQs.length})
            </span>
            <span className="text-[10px] text-slate-400">Reviewing answers with step solutions</span>
          </div>
        </div>

        {/* Interactive Question Palette Quick-Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Question Palette Navigator</h3>
            <span className="text-[11px] text-slate-500">Tap any question number to view answers & solution</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {questions.map((q, idx) => {
              const { hasAns, isCorrect } = getQuestionStatus(q);
              const isCurrent = (activeReviewQ.id || activeReviewQ.questionId) === (q.id || q.questionId);

              let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
              if (hasAns && isCorrect) {
                badgeStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
              } else if (hasAns && !isCorrect) {
                badgeStyle = 'bg-rose-500 text-white border-rose-600 shadow-sm';
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
                  }}
                  className={`w-9 h-9 rounded-xl font-bold font-mono text-xs border flex items-center justify-center transition-all ${badgeStyle} ${
                    isCurrent ? 'ring-2 ring-slate-900 ring-offset-2 scale-110 font-extrabold shadow-md' : ''
                  }`}
                  title={`Question ${idx + 1}: ${hasAns ? (isCorrect ? 'Correct' : 'Wrong') : 'Unanswered'}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Chips Bar (SCR-STU-15) */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'ALL', label: `All (${questions.length})` },
            { key: 'CORRECT', label: `Correct (${submitResult?.totalCorrect || 0})` },
            { key: 'WRONG', label: `Wrong (${submitResult?.totalWrong || 0})` },
            { key: 'UNANSWERED', label: `Unanswered (${submitResult?.totalUnanswered || 0})` },
            { key: 'REVIEW', label: `Marked (${reviewCount})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setReviewFilter(f.key as any);
                setReviewIndex(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                reviewFilter === f.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Review Question Card */}
        {activeReviewQ && (activeReviewQ.id || activeReviewQ.questionId || activeReviewQ.contentHtml) ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                  Q{activeReviewQ.questionNumber || reviewIndex + 1}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                  {activeReviewQ.sectionName || 'General Section'}
                </span>
              </div>

              {/* Status Badge */}
              <div>
                {activeStatus.hasAns && activeStatus.isCorrect ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+{activeReviewQ.marksPositive || 4})
                  </span>
                ) : activeStatus.hasAns ? (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-mono text-xs font-bold border border-rose-200 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect (-{activeReviewQ.marksNegative || 1})
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs font-bold">
                    Not Attempted (0)
                  </span>
                )}
              </div>
            </div>

            {/* Question Statement */}
            <div className="text-sm font-medium text-slate-900 leading-relaxed space-y-3">
              <div>{renderMath(activeReviewQ.contentHtml)}</div>
              {activeReviewQ.diagramUrl && (
                <div className="mt-3 p-2 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
                  <img src={activeReviewQ.diagramUrl} alt="Question Diagram" className="max-h-72 rounded-xl object-contain" />
                </div>
              )}
            </div>

            {/* Options with Visual Comparison */}
            <div className="space-y-2.5">
              {(activeReviewQ.options || []).map((opt: any) => {
                const isSelected = activeStatus.selectedIds.includes(opt.id);
                const isCorrect = opt.isCorrect;

                let borderStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                if (isCorrect) {
                  borderStyle = 'bg-emerald-50/90 border-emerald-400 font-semibold text-emerald-950 ring-2 ring-emerald-500/20';
                } else if (isSelected && !isCorrect) {
                  borderStyle = 'bg-rose-50/90 border-rose-400 font-semibold text-rose-950 ring-2 ring-rose-500/20';
                }

                return (
                  <div key={opt.id} className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${borderStyle}`}>
                    <div
                      className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {opt.optionLabel}
                    </div>

                    <div className="flex-1 text-[13px]">{renderMath(opt.contentHtml)}</div>

                    {isCorrect && (
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        ✔ Correct Answer
                      </span>
                    )}

                    {isSelected && !isCorrect && (
                      <span className="text-[10px] font-extrabold uppercase text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                        ✖ Your Choice
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3-Tier Expandable Solutions (SCR-STU-15) */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {/* Hint */}
              {activeReviewQ.solution?.hintHtml && (
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1 text-[11px]">
                    💡 Hint:
                  </span>
                  <div className="text-amber-950 leading-relaxed">{renderMath(activeReviewQ.solution.hintHtml)}</div>
                </div>
              )}

              {/* Short Explanation */}
              {activeReviewQ.solution?.shortExplanation && (
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5 mb-1 text-[11px]">
                    💬 Short Explanation:
                  </span>
                  <div className="text-blue-950 leading-relaxed">{renderMath(activeReviewQ.solution.shortExplanation)}</div>
                </div>
              )}

              {/* Step-by-Step Solution */}
              {(activeReviewQ.solution?.stepByStepHtml || activeReviewQ.solution?.contentHtml) && (
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 text-xs space-y-1.5">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5 text-[11px]">
                    📋 Step-by-Step KaTeX Solution:
                  </span>
                  <div className="text-slate-800 whitespace-pre-line leading-relaxed font-sans pt-1">
                    {renderMath(activeReviewQ.solution.stepByStepHtml || activeReviewQ.solution.contentHtml)}
                  </div>
                </div>
              )}
            </div>

            {/* Previous / Next Review Question Buttons */}
            <div className="flex justify-between items-center pt-2">
              <button
                disabled={reviewIndex === 0}
                onClick={() => setReviewIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Question
              </button>

              <button
                disabled={reviewIndex >= filteredQs.length - 1}
                onClick={() => setReviewIndex((prev) => Math.min(filteredQs.length - 1, prev + 1))}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
              >
                Next Question <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No questions match this filter.
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 5: ANSWER KEY & CALCULATION BREAKDOWN TABLE (SCR-STU-16)
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'ANSWER_KEY') {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPhase('RESULT')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Result Summary
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadFile(`/tests/${testId}/export/answer-key/pdf`, `answer-key-${testId}.pdf`)}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-rose-200"
            >
              <FileText className="w-3.5 h-3.5" /> Answer Key (PDF)
            </button>
            <button
              onClick={() => downloadFile(`/tests/${testId}/export/answer-key/excel`, `answer-key-${testId}.xlsx`)}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-emerald-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Answer Key (Excel)
            </button>
          </div>
        </div>

        {/* Answer Key Grid (SCR-STU-16 Table) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Answer Key & Question Evaluation
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Q.No</th>
                  <th className="pb-3">Section</th>
                  <th className="pb-3">Correct Ans</th>
                  <th className="pb-3">Your Ans</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Marks</th>
                  <th className="pb-3 text-right">Neg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(answerKeyData.length > 0 ? answerKeyData : questions).map((item, idx) => {
                  if (answerKeyData.length > 0) {
                    const isCorrect = item.status === 'CORRECT' || item.status === '✔ Correct';
                    const isWrong = item.status === 'WRONG' || item.status === '✖ Wrong';
                    return (
                      <tr key={item.questionId || idx} className="hover:bg-slate-50 font-mono">
                        <td className="py-2.5 font-bold text-slate-900">{item.questionNumber || idx + 1}</td>
                        <td className="py-2.5 text-slate-500 font-sans text-[11px]">{item.sectionName || 'General'}</td>
                        <td className="py-2.5 font-bold text-emerald-700">{item.correctAnswer || '-'}</td>
                        <td className="py-2.5 font-bold text-slate-900">{item.yourAnswer || '-'}</td>
                        <td className="py-2.5 font-sans text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              isCorrect
                                ? 'bg-emerald-50 text-emerald-700'
                                : isWrong
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isCorrect ? '✔ Correct' : isWrong ? '✖ Wrong' : 'Not Answered'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600">
                          {Number(item.marks) > 0 ? `+${item.marks}` : '0'}
                        </td>
                        <td className="py-2.5 text-right font-bold text-rose-600">
                          {Number(item.negative) > 0 ? `-${item.negative}` : '0'}
                        </td>
                      </tr>
                    );
                  }

                  const q = item;
                  const ans = userAnswers[q.id];
                  const hasAns = ans && ans.selectedOptionIds?.length > 0;
                  const correctOpts = (q.options || []).filter((o: any) => o.isCorrect);
                  const correctLabel = correctOpts.map((o: any) => o.optionLabel).join(', ');

                  let yourLabel = '-';
                  let status = 'Not Answered';
                  let marks = 0;
                  let neg = 0;

                  if (hasAns) {
                    const selectedOpts = (q.options || []).filter((o: any) => ans.selectedOptionIds.includes(o.id));
                    yourLabel = selectedOpts.map((o: any) => o.optionLabel).join(', ');
                    const isCorrect =
                      correctOpts.length > 0 &&
                      correctOpts.length === selectedOpts.length &&
                      correctOpts.every((o: any) => ans.selectedOptionIds.includes(o.id));
                    if (isCorrect) {
                      status = '✔ Correct';
                      marks = q.marksPositive || 4;
                    } else {
                      status = '✖ Wrong';
                      neg = -(q.marksNegative || 1);
                    }
                  }

                  return (
                    <tr key={q.id || idx} className="hover:bg-slate-50 font-mono">
                      <td className="py-2.5 font-bold text-slate-900">{idx + 1}</td>
                      <td className="py-2.5 text-slate-500 font-sans text-[11px]">{q.sectionName || 'General'}</td>
                      <td className="py-2.5 font-bold text-emerald-700">{correctLabel || '-'}</td>
                      <td className="py-2.5 font-bold text-slate-900">{yourLabel}</td>
                      <td className="py-2.5 font-sans text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            status.includes('Correct')
                              ? 'bg-emerald-50 text-emerald-700'
                              : status.includes('Wrong')
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">{marks > 0 ? `+${marks}` : '0'}</td>
                      <td className="py-2.5 text-right font-bold text-rose-600">{neg < 0 ? `${neg}` : '0'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mathematical Calculation Breakdown Box (doc 19 & SCR-STU-16) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
            <span className="font-bold text-slate-900 font-sans block text-sm">Score Calculation Breakdown</span>
            <div className="space-y-1.5 divide-y divide-slate-200/70 text-slate-700">
              <div className="flex justify-between pt-1">
                <span>Total Questions × Marks per Q</span>
                <span className="font-bold">
                  = {questions.length} × 4 = {questions.length * 4}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-emerald-700">
                <span>Correct Answers</span>
                <span className="font-bold">
                  = {submitResult?.totalCorrect || 0} × 4 = +{(submitResult?.totalCorrect || 0) * 4}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-rose-700">
                <span>Wrong Answers (Negative Marking)</span>
                <span className="font-bold">
                  = {submitResult?.totalWrong || 0} × (-1) = -{submitResult?.totalWrong || 0}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-slate-500">
                <span>Unanswered</span>
                <span className="font-bold">= {submitResult?.totalUnanswered || 0} × 0 = 0</span>
              </div>
              {/* Anti-Cheating Penalties (Only rendered if penalty per strike is set and strikes > 0) */}
              {Number(test?.config?.antiCheatPenaltyPerStrike) > 0 && antiCheatStrikes > 0 && (
                <div className="flex justify-between pt-1.5 pb-1 text-rose-700 font-bold border-t border-rose-200">
                  <span>⚠️ Anti-Cheat Integrity Deduction ({antiCheatStrikes} violation strike{antiCheatStrikes > 1 ? 's' : ''} × {test.config.antiCheatPenaltyPerStrike} marks)</span>
                  <span className="font-mono font-extrabold">
                    = -{antiCheatStrikes * Number(test.config.antiCheatPenaltyPerStrike)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-slate-300 font-bold text-sm text-brand-900 font-mono">
                <span>Final Awarded Score</span>
                <span>= {submitResult?.totalScore || 0} / {test?.totalMarks || questions.length * 4 || 200}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-slate-900">
                <span>Percentage</span>
                <span>= {submitResult?.percentage || 0}%</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span>Evaluation Result</span>
                <span className={submitResult?.isPassed ? 'text-emerald-700' : 'text-rose-700'}>
                  {submitResult?.isPassed ? '✔ PASSED' : '✖ FAILED (Pass Mark: 40%)'}
                </span>
              </div>
            </div>
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
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-sm space-y-5">
            {/* Header: Q Number & Marks */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-[11px] sm:text-xs font-bold border border-emerald-200">
                +{currentQ.marksPositive || 4} / -{currentQ.marksNegative || 1} Marks
              </span>
            </div>

            {/* Question Statement (KaTeX LaTeX Rendered) */}
            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {renderMath(currentQ.contentHtml || '')}
            </div>

            {/* Options List */}
            <div className="space-y-2.5 pt-1">
              {(currentQ.options || []).map((opt: any) => {
                const isSelected = currentAns.selectedOptionIds.includes(opt.id);

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.id, opt.id, currentQ.questionType === 'MULTIPLE_CORRECT')}
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
                onClick={() => handleToggleReview(currentQ.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentAns.isMarkedForReview
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {currentAns.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
              </button>

              <button
                onClick={() => handleClearAnswer(currentQ.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                Clear Response
              </button>
            </div>
          </div>

          {/* Navigation Controls: Previous / Save & Next (Desktop) */}
          <div className="hidden sm:flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <span className="text-[11px] text-slate-400 font-mono">
              🔒 Submit unlocks in {formatTimer(unlockRemainingSeconds)}
            </span>

            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
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
                  onClick={() => setCurrentIndex(idx)}
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
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsMobilePaletteOpen(false);
                      }}
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
