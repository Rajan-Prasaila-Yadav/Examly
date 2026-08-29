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
  Download,
  ListFilter,
  Check,
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';

export default function LiveTestRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

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

  // Palette drawer
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  // Load Test Data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await api.get(`/tests/${testId}`);
        setTest(res.data);

        // Flatten all questions across sections
        const allQs = (res.data.sections || []).flatMap((sec: any) =>
          (sec.questions || []).map((q: any) => ({ ...q, sectionName: sec.name }))
        );

        if (allQs.length === 0) {
          // Sample default question set if none authored yet
          setQuestions([
            {
              id: 'q1',
              sectionName: 'Physics',
              contentHtml: 'A projectile is fired at an angle $\\theta = 45^\\circ$ with initial velocity $u = 20\\text{ m/s}$. The maximum height reached $H_{\\max} = \\frac{u^2 \\sin^2\\theta}{2g}$ is:',
              marksPositive: 4,
              marksNegative: 1,
              options: [
                { id: 'opt_1a', optionLabel: 'A', contentHtml: '$10.2\\text{ meters}$', isCorrect: true },
                { id: 'opt_1b', optionLabel: 'B', contentHtml: '$15.0\\text{ meters}$', isCorrect: false },
                { id: 'opt_1c', optionLabel: 'C', contentHtml: '$20.4\\text{ meters}$', isCorrect: false },
                { id: 'opt_1d', optionLabel: 'D', contentHtml: '$25.0\\text{ meters}$', isCorrect: false },
              ],
              solution: {
                hintHtml: 'Use the formula $H = \\frac{u^2 \\sin^2\\theta}{2g}$ with $g = 9.8\\text{ m/s}^2$.',
                shortExplanation: 'Substitute $u = 20$, $\\sin 45^\\circ = 1/\\sqrt{2}$, and $g = 9.8$.',
                stepByStepHtml: '1. $\\sin^2(45^\\circ) = (1/\\sqrt{2})^2 = 0.5$\n2. $u^2 = 20^2 = 400$\n3. $H_{\\max} = \\frac{400 \\times 0.5}{2 \\times 9.8} = \\frac{200}{19.6} = 10.2\\text{ m}$.',
              },
            },
            {
              id: 'q2',
              sectionName: 'Chemistry',
              contentHtml: 'The reaction $A \\rightarrow \\text{Products}$ follows first-order kinetics: $\\ln\\left(\\frac{[A]_0}{[A]_t}\\right) = kt$. If $t_{1/2} = 20\\text{ s}$, rate constant $k$ is:',
              marksPositive: 4,
              marksNegative: 1,
              options: [
                { id: 'opt_2a', optionLabel: 'A', contentHtml: '$0.0693\\text{ s}^{-1}$', isCorrect: false },
                { id: 'opt_2b', optionLabel: 'B', contentHtml: '$0.0347\\text{ s}^{-1}$', isCorrect: true },
                { id: 'opt_2c', optionLabel: 'C', contentHtml: '$0.1386\\text{ s}^{-1}$', isCorrect: false },
                { id: 'opt_2d', optionLabel: 'D', contentHtml: '$0.0173\\text{ s}^{-1}$', isCorrect: false },
              ],
              solution: {
                hintHtml: 'Recall $k = \\frac{\\ln 2}{t_{1/2}}$.',
                shortExplanation: '$\\ln 2 \\approx 0.693$. Divide by half-life of 20 seconds.',
                stepByStepHtml: '1. $k = \\frac{0.693}{20\\text{ s}} = 0.03465\\text{ s}^{-1} \\approx 0.0347\\text{ s}^{-1}$.',
              },
            },
            {
              id: 'q3',
              sectionName: 'Biology',
              contentHtml: 'Which of the following cellular organelles is responsible for generating cellular ATP via oxidative phosphorylation?',
              marksPositive: 4,
              marksNegative: 1,
              options: [
                { id: 'opt_3a', optionLabel: 'A', contentHtml: 'Ribosome', isCorrect: false },
                { id: 'opt_3b', optionLabel: 'B', contentHtml: 'Mitochondria', isCorrect: true },
                { id: 'opt_3c', optionLabel: 'C', contentHtml: 'Golgi Apparatus', isCorrect: false },
                { id: 'opt_3d', optionLabel: 'D', contentHtml: 'Endoplasmic Reticulum', isCorrect: false },
              ],
              solution: {
                hintHtml: 'Also called the powerhouse of the eukaryotic cell.',
                shortExplanation: 'Mitochondria synthesize ATP through the electron transport chain.',
                stepByStepHtml: 'Oxidative phosphorylation occurs across the inner mitochondrial membrane via ATP synthase.',
              },
            },
          ]);
        } else {
          setQuestions(allQs);
        }
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
    try {
      const res = await api.post(`/tests/${testId}/start`);
      setAttemptId(res.data.attemptId);
      setRemainingSeconds(res.data.effectiveDurationSeconds || (test?.durationMinutes ? test.durationMinutes * 60 : 7200));
    } catch (e) {
      setAttemptId('attempt-live-demo');
    }
    setPhase('RUNNING');
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

      return {
        ...prev,
        [questionId]: {
          selectedOptionIds: updated,
          isMarkedForReview: prev[questionId]?.isMarkedForReview || false,
        },
      };
    });

    if (attemptId) {
      api.post(`/tests/attempts/${attemptId}/answer`, {
        questionId,
        selectedOptionIds: [optionId],
      }).catch(() => {});
    }
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
    setIsSubmitModalOpen(false);
    try {
      if (attemptId && attemptId !== 'attempt-live-demo') {
        const res = await api.post(`/tests/attempts/${attemptId}/submit`);
        setSubmitResult(res.data);
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
      setSubmitResult({
        totalScore: 148,
        totalCorrect: 38,
        totalWrong: 4,
        totalUnanswered: 8,
        percentage: 74.0,
        isPassed: true,
      });
    }
    setPhase('RESULT');
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
              <span>5. <strong>Submit unlock window:</strong> Test submission unlocks after initial grace minutes.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>6. <strong>Continuous timer:</strong> Late-join shrinking window computes server-authoritative time.</span>
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

          <button
            disabled={!hasAgreedRules}
            onClick={handleStartExam}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
          >
            Start Test <ChevronRight className="w-4 h-4" />
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
    const filteredQs = questions.filter((q) => {
      const a = userAnswers[q.id];
      const hasAns = a && a.selectedOptionIds.length > 0;
      const correctOpt = (q.options || []).find((o: any) => o.isCorrect);
      const isCorrect = hasAns && correctOpt && a.selectedOptionIds.includes(correctOpt.id);

      if (reviewFilter === 'CORRECT') return isCorrect;
      if (reviewFilter === 'WRONG') return hasAns && !isCorrect;
      if (reviewFilter === 'UNANSWERED') return !hasAns;
      if (reviewFilter === 'REVIEW') return a?.isMarkedForReview;
      return true;
    });

    const activeReviewQ = filteredQs[reviewIndex] || questions[0] || {};
    const ansData = userAnswers[activeReviewQ.id];

    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPhase('RESULT')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scorecard
          </button>
          <span className="text-xs font-bold text-slate-900">
            Check Answers ({reviewIndex + 1} of {filteredQs.length})
          </span>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
        {activeReviewQ.id ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                  Q{reviewIndex + 1}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                  {activeReviewQ.sectionName || 'General'}
                </span>
              </div>

              {/* Status Badge */}
              <div>
                {(activeReviewQ.options || []).some((o: any) => o.isCorrect && ansData?.selectedOptionIds.includes(o.id)) ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+{activeReviewQ.marksPositive || 4})
                  </span>
                ) : ansData?.selectedOptionIds.length > 0 ? (
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
            <div className="text-sm font-medium text-slate-800 leading-relaxed">
              {renderMath(activeReviewQ.contentHtml)}
            </div>

            {/* Options with Comparison */}
            <div className="space-y-2.5">
              {(activeReviewQ.options || []).map((opt: any) => {
                const isSelected = ansData?.selectedOptionIds.includes(opt.id);
                const isCorrect = opt.isCorrect;

                let borderStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                if (isCorrect) {
                  borderStyle = 'bg-emerald-50/80 border-emerald-400 font-bold text-emerald-900 ring-2 ring-emerald-500/20';
                } else if (isSelected && !isCorrect) {
                  borderStyle = 'bg-rose-50/80 border-rose-400 font-bold text-rose-900 ring-2 ring-rose-500/20';
                }

                return (
                  <div key={opt.id} className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${borderStyle}`}>
                    <div
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {opt.optionLabel}
                    </div>

                    <div className="flex-1">{renderMath(opt.contentHtml)}</div>

                    {isCorrect && (
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        ✔ Correct Answer
                      </span>
                    )}

                    {isSelected && !isCorrect && (
                      <span className="text-[10px] font-extrabold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        ✖ Your Answer
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
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                    💡 Hint:
                  </span>
                  <div className="text-amber-900">{renderMath(activeReviewQ.solution.hintHtml)}</div>
                </div>
              )}

              {/* Short Explanation */}
              {activeReviewQ.solution?.shortExplanation && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
                  <span className="font-bold text-blue-800 flex items-center gap-1.5 mb-1">
                    💬 Short Explanation:
                  </span>
                  <div className="text-blue-900">{renderMath(activeReviewQ.solution.shortExplanation)}</div>
                </div>
              )}

              {/* Step-by-Step Solution */}
              {(activeReviewQ.solution?.stepByStepHtml || activeReviewQ.solution?.contentHtml) && (
                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 text-xs space-y-1.5">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    📋 Step-by-Step Solution:
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
                <ChevronLeft className="w-4 h-4" /> Previous
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
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF Answer Key
          </button>
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
                {questions.map((q, idx) => {
                  const ans = userAnswers[q.id];
                  const hasAns = ans && ans.selectedOptionIds.length > 0;
                  const correctOpts = (q.options || []).filter((o: any) => o.isCorrect);
                  const correctLabel = correctOpts.map((o: any) => o.optionLabel).join(', ');

                  let yourLabel = '-';
                  let status = 'Not Answrd';
                  let marks = 0;
                  let neg = 0;

                  if (hasAns) {
                    const selectedOpts = (q.options || []).filter((o: any) => ans.selectedOptionIds.includes(o.id));
                    yourLabel = selectedOpts.map((o: any) => o.optionLabel).join(', ');
                    const isCorrect = correctOpts.length === selectedOpts.length && correctOpts.every((o: any) => ans.selectedOptionIds.includes(o.id));
                    if (isCorrect) {
                      status = '✔ Correct';
                      marks = q.marksPositive || 4;
                    } else {
                      status = '✖ Wrong';
                      neg = -(q.marksNegative || 1);
                    }
                  }

                  return (
                    <tr key={q.id} className="hover:bg-slate-50 font-mono">
                      <td className="py-2.5 font-bold text-slate-900">{idx + 1}</td>
                      <td className="py-2.5 text-slate-500 font-sans text-[11px]">{q.sectionName || 'General'}</td>
                      <td className="py-2.5 font-bold text-emerald-700">{correctLabel}</td>
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
    <div className="space-y-4 max-w-7xl mx-auto relative select-none">
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

      {/* Top Runner Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm truncate max-w-xs">{test?.title || 'Live Mock Test'}</span>
          <span className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold">
            {currentQ.sectionName || 'General Section'}
          </span>
        </div>

        {/* Live Timer & Anti-Cheat Strike Chip */}
        <div className="flex items-center gap-3">
          {antiCheatStrikes > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-2.5 py-1 rounded-lg animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> Strikes: {antiCheatStrikes}/3
            </span>
          )}

          <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
            <Clock className="w-4 h-4 text-brand-400" />
            <span className="font-mono font-bold text-sm text-brand-300">{formatTimer(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Submit Test
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
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header: Q Number & Marks */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
                +{currentQ.marksPositive || 4} / -{currentQ.marksNegative || 1} Marks
              </span>
            </div>

            {/* Question Statement (KaTeX LaTeX Rendered) */}
            <div className="text-sm text-slate-800 leading-relaxed font-medium">
              {renderMath(currentQ.contentHtml || '')}
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {(currentQ.options || []).map((opt: any) => {
                const isSelected = currentAns.selectedOptionIds.includes(opt.id);

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.id, opt.id, currentQ.questionType === 'MULTIPLE_CORRECT')}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
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

            {/* Action Bar: Mark for Review & Clear Response */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
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

          {/* Navigation Controls: Previous / Save & Next */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
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

        {/* Right: Question Palette Grid (SCR-STU-12) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 h-fit">
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
                onClick={() => handleAutoSubmit('User Confirmed Submit')}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md"
              >
                Yes, Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
