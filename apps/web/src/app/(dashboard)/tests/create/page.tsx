// apps/web/src/app/(dashboard)/tests/create/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  FileCheck2,
  ArrowLeft,
  Check,
  Sparkles,
  ShieldAlert,
  Clock,
  Shuffle,
  Users,
  Eye,
  Sliders,
  Settings,
  HelpCircle,
  Award,
  Layers,
  Lock,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Calculator,
  FileSpreadsheet,
  Upload,
  Calendar,
  Layers2,
  BookOpen,
  FolderTree,
  X,
  RotateCcw,
  RotateCw,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Wand2,
  Bot,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { QuestionSlotCard } from '@/components/question-slot-card';
import { AiQuestionImportModal } from '@/components/ai-question-import-modal';
import {
  padSlots,
  mergeParsedIntoSlots,
  isSlotFilled,
  lastJoinDate,
  makeEmptySlot,
  QuestionSlot,
} from '@/lib/question-templates';

function toLocalDateInput(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalTimeInput(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function parseSafeDateTime(dateStr: string, timeStr: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = (timeStr || '00:00').split(':').map(Number);
  const parsed = new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, 0);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDeterministicDate(d: Date): string {
  if (isNaN(d.getTime())) return '';
  const dayName = DAYS[d.getDay()];
  const monthName = MONTHS[d.getMonth()];
  const date = d.getDate();
  const year = d.getFullYear();
  return `${dayName}, ${monthName} ${date}, ${year}`;
}

function formatDeterministicTime(d: Date): string {
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatDeterministicDateTime(d: Date): string {
  return `${formatDeterministicDate(d)} • ${formatDeterministicTime(d)}`;
}

function formatPrettyDateTime(dateStr: string, timeStr: string): string {
  const dateObj = parseSafeDateTime(dateStr, timeStr);
  return formatDeterministicDateTime(dateObj);
}

function CreateTestWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramBatchId = searchParams.get('batchId') || '';
  const paramSubjectId = searchParams.get('subjectId') || '';
  const paramLessonId = searchParams.get('lessonId') || '';
  const paramScope = (searchParams.get('scope') as any) || '';

  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  useEffect(() => {
    if (isStudent) {
      router.replace('/tests');
    }
  }, [isStudent, router]);

  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ══════════════════════════════════════════════════════════════════════════
  // Step 1: Settings (SCR-ADM-10)
  // ══════════════════════════════════════════════════════════════════════════
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testScope, setTestScope] = useState<'BATCH_LEVEL' | 'SUBJECT_LEVEL' | 'LESSON_LEVEL'>('BATCH_LEVEL');
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [lessonId, setLessonId] = useState('');

  // Dynamic Date/Time initialized to current user time
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startDate, setStartDate] = useState(() => toLocalDateInput(new Date()));
  const [startTime, setStartTime] = useState(() => toLocalTimeInput(new Date()));
  const [endDate, setEndDate] = useState(() => toLocalDateInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [endTime, setEndTime] = useState(() => toLocalTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));

  const [totalQuestions, setTotalQuestions] = useState(50);
  const [positiveMarkRate, setPositiveMarkRate] = useState(4.0);
  const [isNegativeEnabled, setIsNegativeEnabled] = useState(true);
  const [negativeMarkRate, setNegativeMarkRate] = useState(1.0);
  const [passMarkType, setPassMarkType] = useState<'NUMBER' | 'PERCENTAGE'>('PERCENTAGE');
  const [passMarks, setPassMarks] = useState(40);

  // ══════════════════════════════════════════════════════════════════════════
  // Step 2: Engine & Anti-Cheat Settings (SCR-ADM-11)
  // ══════════════════════════════════════════════════════════════════════════
  const [lockAnswerKey, setLockAnswerKey] = useState(false);
  const [autoPublishResults, setAutoPublishResults] = useState(true);
  const [showHintsSolutionsAfterSubmit, setShowHintsSolutionsAfterSubmit] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [blockScreenshot, setBlockScreenshot] = useState(true);
  const [detectAppSwitch, setDetectAppSwitch] = useState(true);
  const [disableCopyPaste, setDisableCopyPaste] = useState(true);
  const [optionsPerQuestion, setOptionsPerQuestion] = useState('4');
  const [correctAnswerType, setCorrectAnswerType] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
  const [questionsPerScreen, setQuestionsPerScreen] = useState('1 at a time');
  const [submitUnlockMinutes, setSubmitUnlockMinutes] = useState(5);
  const [antiCheatLevel, setAntiCheatLevel] = useState(3);
  const [resultPublishMode, setResultPublishMode] = useState<'IMMEDIATE' | 'AFTER_TEST_END' | 'MANUAL_BY_ADMIN' | 'SCHEDULED'>('AFTER_TEST_END');

  // ══════════════════════════════════════════════════════════════════════════
  // Step 3: Question Authoring & Sections (SCR-ADM-12)
  // ══════════════════════════════════════════════════════════════════════════
  const [sections, setSections] = useState<{ id: string; name: string }[]>([
    { id: 'sec-1', name: 'General Section' },
  ]);
  const [activeSectionId, setActiveSectionId] = useState('sec-1');
  const [newSectionModal, setNewSectionModal] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState('');

  // Authored questions list starts completely clean & empty!
  const [authoredQuestions, setAuthoredQuestions] = useState<QuestionSlot[]>(() =>
    padSlots([], 50, 'sec-1', 4, 'SINGLE_CORRECT'),
  );
  const [expandedSlot, setExpandedSlot] = useState<number | null>(0);
  const [aiToast, setAiToast] = useState('');

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Step 4: Publish mode selection
  const [publishAction, setPublishAction] = useState<'INSTANT' | 'SCHEDULED' | 'DRAFT'>('INSTANT');

  // ── Context Auto-Detection from URL params ──
  useEffect(() => {
    const initContext = async () => {
      try {
        const batchesRes = await api.get('/batches');
        const bList = batchesRes.data || [];
        setBatches(bList);

        if (paramLessonId) {
          setLessonId(paramLessonId);
          setTestScope('LESSON_LEVEL');
          const lessonRes = await api.get(`/lessons/${paramLessonId}`);
          if (lessonRes.data) {
            const sId = lessonRes.data.subjectId;
            const bId = lessonRes.data.subject?.batchId;
            if (bId) setBatchId(bId);
            if (sId) setSubjectId(sId);

            if (bId) {
              const subRes = await api.get(`/subjects/batch/${bId}`);
              setSubjects(subRes.data || []);
            }
            if (sId) {
              const subDetail = await api.get(`/subjects/${sId}`);
              setLessons(subDetail.data?.lessons || []);
            }
          }
        } else if (paramSubjectId) {
          setSubjectId(paramSubjectId);
          setTestScope('SUBJECT_LEVEL');
          const subRes = await api.get(`/subjects/${paramSubjectId}`);
          if (subRes.data) {
            const bId = subRes.data.batchId;
            if (bId) setBatchId(bId);
            setLessons(subRes.data.lessons || []);
            if (bId) {
              const subsRes = await api.get(`/subjects/batch/${bId}`);
              setSubjects(subsRes.data || []);
            }
          }
        } else if (paramBatchId) {
          setBatchId(paramBatchId);
          setTestScope(paramScope === 'SUBJECT_LEVEL' || paramScope === 'LESSON_LEVEL' ? paramScope : 'BATCH_LEVEL');
          const subsRes = await api.get(`/subjects/batch/${paramBatchId}`);
          setSubjects(subsRes.data || []);
          if (subsRes.data?.length > 0) {
            setSubjectId(subsRes.data[0].id);
            const subDetail = await api.get(`/subjects/${subsRes.data[0].id}`);
            setLessons(subDetail.data?.lessons || []);
            if (subDetail.data?.lessons?.length > 0) {
              setLessonId(subDetail.data.lessons[0].id);
            }
          }
        } else if (bList.length > 0) {
          const firstBId = bList[0].id;
          setBatchId(firstBId);
          const subsRes = await api.get(`/subjects/batch/${firstBId}`);
          setSubjects(subsRes.data || []);
          if (subsRes.data?.length > 0) {
            setSubjectId(subsRes.data[0].id);
            const subDetail = await api.get(`/subjects/${subsRes.data[0].id}`);
            setLessons(subDetail.data?.lessons || []);
            if (subDetail.data?.lessons?.length > 0) {
              setLessonId(subDetail.data.lessons[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error auto-detecting test context', err);
      }
    };

    initContext();
  }, [paramBatchId, paramSubjectId, paramLessonId, paramScope]);

  const handleBatchChange = async (newBatchId: string) => {
    setBatchId(newBatchId);
    setSubjectId('');
    setLessonId('');
    setLessons([]);
    try {
      const res = await api.get(`/subjects/batch/${newBatchId}`);
      setSubjects(res.data || []);
      if (res.data?.length > 0) {
        const firstSubId = res.data[0].id;
        setSubjectId(firstSubId);
        const subRes = await api.get(`/subjects/${firstSubId}`);
        setLessons(subRes.data?.lessons || []);
        if (subRes.data?.lessons?.length > 0) {
          setLessonId(subRes.data.lessons[0].id);
        }
      }
    } catch (e) {
      setSubjects([]);
    }
  };

  const handleSubjectChange = async (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    setLessonId('');
    try {
      const res = await api.get(`/subjects/${newSubjectId}`);
      setLessons(res.data?.lessons || []);
      if (res.data?.lessons?.length > 0) {
        setLessonId(res.data.lessons[0].id);
      }
    } catch (e) {
      setLessons([]);
    }
  };

  const optionCountNum = optionsPerQuestion === 'Custom' ? 4 : Number(optionsPerQuestion) || 4;
  const defaultQType = correctAnswerType === 'MULTIPLE' ? 'MULTIPLE_CORRECT' : 'SINGLE_CORRECT';
  const negDefault = isNegativeEnabled ? Number(negativeMarkRate) : 0;

  // Real-time Dynamic Date & Late Join Calculations
  const startDateTime = new Date(`${startDate}T${startTime}:00`);
  const endDateTime = new Date(`${endDate}T${endTime}:00`);
  const validDurationMins = Math.max(1, Number(durationMinutes) || 1);
  const windowDurationMs = endDateTime.getTime() - startDateTime.getTime();
  const windowDurationMins = Math.max(0, Math.round(windowDurationMs / 60000));
  const isWindowValid = windowDurationMs >= validDurationMins * 60 * 1000;
  const lastJoin = new Date(endDateTime.getTime() - validDurationMins * 60 * 1000);

  // Auto-Draft Recovery
  const [draftBannerVisible, setDraftBannerVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('examly_test_creation_wizard_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.authoredQuestions?.some(isSlotFilled)) {
          if (parsed.title) setTitle(parsed.title);
          if (parsed.description) setDescription(parsed.description);
          if (parsed.batchId) setBatchId(parsed.batchId);
          if (parsed.subjectId) setSubjectId(parsed.subjectId);
          if (parsed.lessonId) setLessonId(parsed.lessonId);
          if (parsed.durationMinutes) setDurationMinutes(parsed.durationMinutes);
          if (parsed.totalQuestions) setTotalQuestions(parsed.totalQuestions);
          if (parsed.positiveMarkRate) setPositiveMarkRate(parsed.positiveMarkRate);
          if (parsed.negativeMarkRate) setNegativeMarkRate(parsed.negativeMarkRate);
          if (parsed.sections) setSections(parsed.sections);
          if (parsed.authoredQuestions?.length) setAuthoredQuestions(parsed.authoredQuestions);
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
          setDraftBannerVisible(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (title || authoredQuestions.some(isSlotFilled)) {
      const stateToSave = {
        title,
        description,
        batchId,
        subjectId,
        lessonId,
        durationMinutes,
        startDate,
        startTime,
        endDate,
        endTime,
        totalQuestions,
        positiveMarkRate,
        negativeMarkRate,
        passMarkType,
        passMarks,
        lockAnswerKey,
        autoPublishResults,
        showHintsSolutionsAfterSubmit,
        shuffleQuestions,
        shuffleOptions,
        showLeaderboard,
        blockScreenshot,
        detectAppSwitch,
        disableCopyPaste,
        optionsPerQuestion,
        correctAnswerType,
        questionsPerScreen,
        submitUnlockMinutes,
        antiCheatLevel,
        resultPublishMode,
        sections,
        authoredQuestions,
        currentStep,
      };
      localStorage.setItem('examly_test_creation_wizard_draft', JSON.stringify(stateToSave));
    }
  }, [
    title,
    description,
    batchId,
    subjectId,
    lessonId,
    durationMinutes,
    startDate,
    startTime,
    endDate,
    endTime,
    totalQuestions,
    positiveMarkRate,
    negativeMarkRate,
    passMarkType,
    passMarks,
    lockAnswerKey,
    autoPublishResults,
    showHintsSolutionsAfterSubmit,
    shuffleQuestions,
    shuffleOptions,
    showLeaderboard,
    blockScreenshot,
    detectAppSwitch,
    disableCopyPaste,
    optionsPerQuestion,
    correctAnswerType,
    questionsPerScreen,
    submitUnlockMinutes,
    antiCheatLevel,
    resultPublishMode,
    sections,
    authoredQuestions,
    currentStep,
  ]);

  const handleClearDraft = () => {
    localStorage.removeItem('examly_test_creation_wizard_draft');
    setDraftBannerVisible(false);
    window.location.reload();
  };

  const handleSetStartToNow = () => {
    const now = new Date();
    setStartDate(toLocalDateInput(now));
    setStartTime(toLocalTimeInput(now));
    const autoEnd = new Date(now.getTime() + validDurationMins * 60 * 1000);
    setEndDate(toLocalDateInput(autoEnd));
    setEndTime(toLocalTimeInput(autoEnd));
  };

  const handleAutoExtendEnd = (extraMinutes: number) => {
    const base = new Date(`${startDate}T${startTime}:00`);
    const newEnd = new Date(base.getTime() + (validDurationMins + extraMinutes) * 60 * 1000);
    setEndDate(toLocalDateInput(newEnd));
    setEndTime(toLocalTimeInput(newEnd));
  };

  useEffect(() => {
    setAuthoredQuestions((prev) =>
      padSlots(prev, Number(totalQuestions) || 1, activeSectionId, optionCountNum, defaultQType),
    );
  }, [totalQuestions, optionCountNum, defaultQType]);

  const filledCount = authoredQuestions.filter(isSlotFilled).length;

  const totalCalculatedMarks = authoredQuestions.reduce((sum, q) => {
    const marks = q.marksPositive != null ? Number(q.marksPositive) : Number(positiveMarkRate);
    return sum + (isSlotFilled(q) ? marks : Number(positiveMarkRate));
  }, 0);

  const calculatedPassMarks =
    passMarkType === 'PERCENTAGE' ? Math.round((passMarks / 100) * totalCalculatedMarks) : passMarks;

  const handleAddSection = () => {
    if (!newSectionInput.trim()) return;
    const newSec = { id: `sec-${Date.now()}`, name: newSectionInput.trim() };
    setSections([...sections, newSec]);
    setActiveSectionId(newSec.id);
    setNewSectionInput('');
    setNewSectionModal(false);
  };

  const handleAddQuestionSlot = () => {
    setTotalQuestions((n) => Number(n) + 1);
    setExpandedSlot(authoredQuestions.length);
  };

  const handleDeleteQuestion = (index: number) => {
    setAuthoredQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const fallback = next.length
        ? next
        : [makeEmptySlot({ sectionId: activeSectionId, optionCount: optionCountNum, questionType: defaultQType })];
      setTotalQuestions(fallback.length);
      return fallback;
    });
  };

  const handleBulkImportCSV = () => {
    if (!csvText.trim()) return;
    const parsed: any[] = [];
    csvText.split('\n').filter((l) => l.trim().length > 0).forEach((line) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 6) {
        const [statement, optA, optB, optC, optD, correctKey, sol] = parts;
        parsed.push({
          questionType: 'SINGLE_CORRECT',
          contentHtml: statement,
          options: [
            { optionLabel: 'A', contentHtml: optA, isCorrect: correctKey.toUpperCase() === 'A' },
            { optionLabel: 'B', contentHtml: optB, isCorrect: correctKey.toUpperCase() === 'B' },
            { optionLabel: 'C', contentHtml: optC, isCorrect: correctKey.toUpperCase() === 'C' },
            { optionLabel: 'D', contentHtml: optD, isCorrect: correctKey.toUpperCase() === 'D' },
          ],
          stepByStepSolution: sol || '',
        });
      }
    });
    applyParsedQuestions(parsed);
    setIsBulkModalOpen(false);
    setCsvText('');
  };

  const applyParsedQuestions = (parsed: any[]) => {
    if (!parsed.length) return;
    let newTotal = 0;
    setAuthoredQuestions((prev) => {
      const merged = mergeParsedIntoSlots(
        prev,
        parsed,
        activeSectionId,
        optionCountNum,
        { marksPositive: Number(positiveMarkRate), marksNegative: negDefault },
      );
      newTotal = merged.length;
      setTotalQuestions(merged.length);
      return merged;
    });
    setAiToast(`✅ Added ${parsed.length} questions! Total test questions: ${newTotal || authoredQuestions.length + parsed.length}`);
    setTimeout(() => setAiToast(''), 5000);
  };

  const handleFinalLaunch = async () => {
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);
      const filled = authoredQuestions.filter(isSlotFilled);

      const payload = {
        title: title || 'Examination Mock Test',
        description,
        batchId,
        subjectId: testScope !== 'BATCH_LEVEL' ? subjectId : undefined,
        lessonId: testScope === 'LESSON_LEVEL' ? lessonId : undefined,
        testType: testScope,
        totalMarks: Number(totalCalculatedMarks),
        passMarks: Number(calculatedPassMarks),
        negativeMarkRate: negDefault,
        durationMinutes: Number(durationMinutes),
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        publishAction,
        isPublished: publishAction === 'INSTANT',
        publishAt: publishAction === 'SCHEDULED' ? startDateTime.toISOString() : undefined,
        antiCheatLevel: Number(antiCheatLevel),
        shuffleQuestions,
        shuffleOptions,
        resultPublishMode,
        submitUnlockMinutes: Number(submitUnlockMinutes),
        questionsPerScreen: questionsPerScreen === '1 at a time' ? 1 : Number(questionsPerScreen) || 1,
        oneQuestionAtATime: questionsPerScreen === '1 at a time',
        totalQuestions: authoredQuestions.length,
        optionsCount: optionCountNum,
        correctAnswerType,
        defaultPositiveMarks: Number(positiveMarkRate),
        defaultNegativeMarks: negDefault,
        sections: sections.map((s, idx) => ({ id: s.id, name: s.name, sortOrder: idx + 1 })),
        questions: filled.map((q) => ({
          sectionId: q.sectionId,
          questionType: q.questionType || defaultQType,
          contentHtml: q.contentHtml,
          diagramUrl: q.diagramUrl || undefined,
          marksPositive: q.marksPositive != null ? q.marksPositive : Number(positiveMarkRate),
          marksNegative: q.marksNegative != null ? q.marksNegative : negDefault,
          options: q.options,
          hint: q.hint || undefined,
          shortExplanation: q.shortExplanation || undefined,
          stepByStepSolution: q.stepByStepSolution || undefined,
        })),
      };

      const res = await api.post('/tests', payload, { timeout: 60000 });
      try {
        localStorage.removeItem('examly_test_creation_wizard_draft');
      } catch {}
      router.push(`/tests/${res.data.id}`);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join('; ') : (msg || e.message || 'Failed to create test');
      alert(`Test creation notice: ${errorText}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Draft Recovery Banner */}
      {draftBannerVisible && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">📝</span>
            <span>Auto-recovered unsaved draft from your previous session: <strong>{title || 'Untitled Test'}</strong></span>
          </div>
          <button
            onClick={handleClearDraft}
            className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-amber-200 hover:border-rose-200 rounded-xl font-bold transition-all text-xs"
          >
            Discard Draft
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <Link
          href="/tests/builder"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Test Suite
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-200/60 inline-flex items-center gap-1">
                🎓 Context Auto-Detection Active
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">Create Examination Wizard</h1>
              <p className="text-xs text-slate-500">
                Configure test settings, anti-cheat proctoring rules, and author questions with live LaTeX math formula preview.
              </p>
            </div>
          </div>

          {/* 4-Step Wizard Progress Bar (SCR-ADM-10 to SCR-ADM-13) */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100">
            {[
              { num: 1, label: 'Settings', sub: 'Identity & Scheme' },
              { num: 2, label: 'Engine Settings', sub: 'Proctoring & Timing' },
              { num: 3, label: 'Questions', sub: 'LaTeX KaTeX Builder' },
              { num: 4, label: 'Publish', sub: 'Schedule & Launch' },
            ].map((step) => {
              const isCompleted = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`text-left p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-500/10'
                      : isCompleted
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono">
                      {isCompleted ? '✔ Done' : `Step ${step.num}`}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">{step.label}</span>
                  <span className="text-[10px] text-slate-500 truncate block">{step.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: SETTINGS (SCR-ADM-10: admin-06-test-settings.png) */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-600" /> Step 1: Test Identity & Scope Settings
            </h2>
            <span className="text-xs text-slate-400 font-mono font-medium">SCR-ADM-10</span>
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Test Name *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mechanics Unit Test 01"
              required
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            />
          </div>

          {/* Test Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Test Description & Instructions</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="This test evaluates students' understanding of key concepts in Mechanics including kinematics & Newton's laws of motion."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Scope Selection: 3 Cards (Batch-wise, Subject-wise, Lesson-wise) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Test Type & Hierarchy Scope *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'BATCH_LEVEL', label: 'Batch-wise', icon: Users, desc: 'Full syllabus mock across entire batch' },
                { key: 'SUBJECT_LEVEL', label: 'Subject-wise', icon: Layers2, desc: 'Targeted single subject examination' },
                { key: 'LESSON_LEVEL', label: 'Lesson-wise', icon: BookOpen, desc: 'Chapter / Unit quiz assessment' },
              ].map((scope) => {
                const Icon = scope.icon;
                const isSelected = testScope === scope.key;

                return (
                  <button
                    key={scope.key}
                    type="button"
                    onClick={() => setTestScope(scope.key as any)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-brand-50/80 border-brand-400 ring-2 ring-brand-500/20 shadow-sm'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{scope.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">{scope.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Academic Hierarchy Selectors (Cascading Context) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Academic Curriculum Hierarchy Binding *
              </label>
              <span className="text-[11px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                {testScope === 'BATCH_LEVEL' ? 'Batch Scope' : testScope === 'SUBJECT_LEVEL' ? 'Subject Scope' : 'Chapter / Lesson Scope'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Batch Selector */}
              <div className={testScope === 'BATCH_LEVEL' ? 'sm:col-span-3' : testScope === 'SUBJECT_LEVEL' ? 'sm:col-span-1' : 'sm:col-span-1'}>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Academic Batch *</label>
                <select
                  value={batchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              {testScope !== 'BATCH_LEVEL' && (
                <div className={testScope === 'SUBJECT_LEVEL' ? 'sm:col-span-2' : 'sm:col-span-1'}>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Subject *</label>
                  <select
                    value={subjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lesson Selector */}
              {testScope === 'LESSON_LEVEL' && (
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Chapter / Lesson *</label>
                  <select
                    value={lessonId}
                    onChange={(e) => setLessonId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">-- Select Chapter --</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Window & Timing */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">Test Schedule & Timing Window</span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleSetStartToNow}
                  className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg border border-brand-200/60 transition-colors"
                >
                  ⚡ Start Now
                </button>
                <button
                  type="button"
                  onClick={() => handleAutoExtendEnd(0)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  ⏱️ Match Duration
                </button>
                <button
                  type="button"
                  onClick={() => handleAutoExtendEnd(60)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  +1 hr Window
                </button>
                <button
                  type="button"
                  onClick={() => handleAutoExtendEnd(1440)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  24 hrs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Start Date & Time */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Start Date & Time *</label>
                  <span className="text-[10px] font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">Start</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Time (HH:MM)</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 pt-1 flex items-center gap-1">
                  <span>🗓️</span>
                  <span className="truncate">{formatPrettyDateTime(startDate, startTime)}</span>
                </div>
              </div>

              {/* End Date & Time */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">End Date & Time *</label>
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">End</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Time (HH:MM)</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 pt-1 flex items-center gap-1">
                  <span>🏁</span>
                  <span className="truncate">{formatPrettyDateTime(endDate, endTime)}</span>
                </div>
              </div>

              {/* Duration & Presets */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Test Duration *</label>
                  <span className="text-[10px] font-mono text-slate-500">{validDurationMins} minutes</span>
                </div>
                <input
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {[30, 45, 60, 90, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all ${
                        durationMinutes === mins
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Real-Time Timing & Cutoff Banner */}
            {!isWindowValid ? (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">End time is too early for this duration!</strong>
                  <span>
                    The total window is currently {windowDurationMins} minutes, but the test requires {validDurationMins} minutes. Please increase the end date/time or reduce the duration.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Live Window Analysis ({windowDurationMins} mins total window)</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-amber-300 text-amber-800">
                    Required: {validDurationMins} mins
                  </span>
                </div>

                <div className="text-[11px] text-amber-900 leading-relaxed" suppressHydrationWarning>
                  Students require the full <strong>{validDurationMins} minutes</strong> to complete the exam.
                  The strict last start allowed is: <strong className="text-rose-700 underline font-mono">{formatDeterministicDateTime(lastJoin)}</strong>.
                </div>

                <div className="text-[10px] text-amber-800/80 pt-1 border-t border-amber-200/50">
                  ⚡ <em>Publish policy:</em> Choosing <strong>Instant Live</strong> in Step 4 starts the test immediately at the current time and runs for {validDurationMins} minutes. Choosing <strong>Schedule</strong> enforces this window.
                </div>
              </div>
            )}
          </div>

          {/* Questions Count & Marking Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Expected Questions *</label>
              <input
                type="number"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marks per Question *</label>
              <input
                type="number"
                step="0.5"
                value={positiveMarkRate}
                onChange={(e) => setPositiveMarkRate(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-600"
              />
            </div>
          </div>

          {/* Negative Marking & Pass Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            {/* Negative Marking Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Negative Marking</span>
                <input
                  type="checkbox"
                  checked={isNegativeEnabled}
                  onChange={(e) => setIsNegativeEnabled(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded"
                />
              </div>
              {isNegativeEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Penalty Rate:</span>
                  <input
                    type="number"
                    step="0.25"
                    value={negativeMarkRate}
                    onChange={(e) => setNegativeMarkRate(Number(e.target.value))}
                    className="w-24 text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-rose-600"
                  />
                  <span className="text-xs text-slate-400">marks per wrong answer</span>
                </div>
              )}
            </div>

            {/* Pass Marks Toggle: Number vs Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Pass Mark Threshold</span>
                <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPassMarkType('PERCENTAGE')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      passMarkType === 'PERCENTAGE' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassMarkType('NUMBER')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      passMarkType === 'NUMBER' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    Number
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={passMarks}
                  onChange={(e) => setPassMarks(Number(e.target.value))}
                  className="w-24 text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-xs text-slate-500">
                  {passMarkType === 'PERCENTAGE' ? `% (${calculatedPassMarks} Marks)` : `Marks`}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!title}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              Next: Engine Settings →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: ENGINE SETTINGS (SCR-ADM-11: admin-07-test-engine-settings.png) */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand-600" /> Step 2: Test Engine & Proctoring Settings
            </h2>
            <span className="text-xs text-slate-400 font-mono font-medium">SCR-ADM-11</span>
          </div>

          {/* 9 Core Toggle Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { label: 'Lock answer key after making', state: lockAnswerKey, setter: setLockAnswerKey, desc: 'Prevents edits once test goes live' },
              { label: 'Auto publish results', state: autoPublishResults, setter: setAutoPublishResults, desc: 'Compute and publish scorecard on submission' },
              { label: 'Show hints & solutions after submit', state: showHintsSolutionsAfterSubmit, setter: setShowHintsSolutionsAfterSubmit, desc: 'Unlocks 3-tier step derivations' },
              { label: 'Randomize / shuffle questions', state: shuffleQuestions, setter: setShuffleQuestions, desc: 'Unique question order per student' },
              { label: 'Shuffle options', state: shuffleOptions, setter: setShuffleOptions, desc: 'Randomize order of A, B, C, D choices' },
              { label: 'Show public leaderboard', state: showLeaderboard, setter: setShowLeaderboard, desc: 'Displays ranked percentile leaderboard' },
              { label: 'Anti-cheat: block screenshot & screen record', state: blockScreenshot, setter: setBlockScreenshot, desc: 'FLAG_SECURE hardware protection' },
              { label: 'Detect app switch / exit fullscreen', state: detectAppSwitch, setter: setDetectAppSwitch, desc: 'Records strikes on window blur' },
              { label: 'Disable copy-paste', state: disableCopyPaste, setter: setDisableCopyPaste, desc: 'Locks clipboard and selection' },
            ].map((toggle) => (
              <label
                key={toggle.label}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-all"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{toggle.label}</span>
                  <span className="text-[10px] text-slate-500">{toggle.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={toggle.state}
                  onChange={(e) => toggle.setter(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded"
                />
              </label>
            ))}
          </div>

          {/* Number of Options per Question: [2] [3] [4] [5] [6] [7] [Custom] */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Number of options per question</label>
            <div className="flex flex-wrap gap-2">
              {['2', '3', '4', '5', '6', '7', 'Custom'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setOptionsPerQuestion(val)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    optionsPerQuestion === val
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {val === '4' ? '[4]' : val}
                </button>
              ))}
            </div>
          </div>

          {/* Correct Answer Type: [ Single ] | [ Multiple ] */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Correct answer type</label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setCorrectAnswerType('SINGLE')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  correctAnswerType === 'SINGLE'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Single Correct Choice
              </button>
              <button
                type="button"
                onClick={() => setCorrectAnswerType('MULTIPLE')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  correctAnswerType === 'MULTIPLE'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Multiple Correct (Partial Marking)
              </button>
            </div>
          </div>

          {/* Questions per Screen: [ 1 at a time ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 10 ] [ Custom ] */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Questions per screen</label>
            <div className="flex flex-wrap gap-2">
              {['1 at a time', '2', '3', '4', '5', '10', 'Custom'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQuestionsPerScreen(val)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    questionsPerScreen === val
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button Unlocks After Slider */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Submit button unlocks after</span>
              <span className="text-xs font-mono font-bold text-brand-700">{submitUnlockMinutes} minutes</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={submitUnlockMinutes}
              onChange={(e) => setSubmitUnlockMinutes(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>1 min</span>
              <span>30 min</span>
              <span>60 min</span>
            </div>
          </div>

          {/* Anti-Cheat Max Allowed Strikes */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Anti-Cheat Max Allowed Strikes</span>
              <span className="text-xs font-mono font-bold text-rose-600">{antiCheatLevel} Strikes (Auto-Submits)</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={antiCheatLevel}
              onChange={(e) => setAntiCheatLevel(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>1 strike (Strict)</span>
              <span>3 strikes (Standard)</span>
              <span>5 strikes (Lenient)</span>
            </div>
          </div>

          <div className="pt-3 flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Next: Question Builder →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: QUESTION BUILDER (SCR-ADM-12) */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand-600" /> Step 3: Question templates
            </h2>
            <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
              {filledCount} filled / {authoredQuestions.length} templates
            </span>
          </div>

          {aiToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              {aiToast}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setIsBulkModalOpen(true)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-brand-600" /> Bulk Upload (CSV)
              </button>
              <button type="button" onClick={() => setIsAiModalOpen(true)} className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-300 text-violet-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Fill with Gemini
              </button>
              <button type="button" onClick={() => setNewSectionModal(true)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-purple-600" /> Add Section
              </button>
              <button type="button" onClick={handleAddQuestionSlot} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add question template
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                  activeSectionId === sec.id
                    ? 'bg-purple-50 text-purple-800 border border-purple-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {sec.name} ({authoredQuestions.filter((q) => q.sectionId === sec.id && q.contentHtml.trim()).length})
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500">
            Templates match Total Questions from settings. Empty marks use +{positiveMarkRate} / -{negDefault}. Extra templates increase the total.
          </p>

          <div className="space-y-2">
            {authoredQuestions.map((q, idx) => (
              <QuestionSlotCard
                key={q.id}
                index={idx}
                question={q}
                expanded={expandedSlot === idx}
                sections={sections}
                defaultPos={Number(positiveMarkRate)}
                defaultNeg={negDefault}
                onToggle={() => setExpandedSlot(expandedSlot === idx ? null : idx)}
                onChange={(next) => {
                  const copy = [...authoredQuestions];
                  copy[idx] = next;
                  setAuthoredQuestions(copy);
                }}
                onDelete={() => handleDeleteQuestion(idx)}
              />
            ))}
          </div>

          <div className="pt-3 flex justify-between">
            <button onClick={() => setCurrentStep(2)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
              ← Back
            </button>
            <button onClick={() => setCurrentStep(4)} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md">
              Next: Review & Launch →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: REVIEW & LAUNCH (SCR-ADM-13: admin-09-test-schedule-publish.png) */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Step 4: Final Summary & Launch Policy
            </h2>
            <span className="text-xs text-slate-400 font-mono font-medium">SCR-ADM-13</span>
          </div>

          {/* Review Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Test Title</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">{title || 'Mock Examination'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Duration & Window</span>
              <span className="font-bold text-slate-900 font-mono text-sm block mt-0.5">{durationMinutes} Mins</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Total Calculated Marks</span>
              <span className="font-bold text-brand-700 font-mono text-sm block mt-0.5">
                {totalCalculatedMarks} (+{positiveMarkRate} / -{isNegativeEnabled ? negativeMarkRate : 0})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Questions Authored</span>
              <span className="font-bold text-purple-700 font-mono text-sm block mt-0.5">
                {filledCount} filled of {authoredQuestions.length} templates ({sections.length} sections)
              </span>
            </div>
          </div>

          {/* Launch Action Selection */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-800 block">Choose Publishing Option:</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'INSTANT', label: 'Publish Live Immediately', desc: 'Active immediately for all enrolled batch students' },
                { key: 'SCHEDULED', label: 'Schedule for Window', desc: 'Auto-unlocks when start date & time arrives' },
                { key: 'DRAFT', label: 'Save as Draft', desc: 'Keep hidden in teacher dashboard' },
              ].map((act) => (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => setPublishAction(act.key as any)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    publishAction === act.key
                      ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">{act.label}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block leading-tight">{act.desc}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Launch Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1" suppressHydrationWarning>
              <span className="font-bold text-slate-900 block">
                {publishAction === 'INSTANT' && '🚀 Instant Live Mode Details'}
                {publishAction === 'SCHEDULED' && '📅 Scheduled Window Details'}
                {publishAction === 'DRAFT' && '📝 Draft Mode Details'}
              </span>
              {publishAction === 'INSTANT' && (
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  The test will start immediately upon submission. Students can join from right now. Test will run for a full <strong>{validDurationMins} minutes</strong> until <strong>{formatDeterministicTime(new Date(Date.now() + validDurationMins * 60 * 1000))}</strong>.
                </p>
              )}
              {publishAction === 'SCHEDULED' && (
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Test starts on <strong>{formatDeterministicDateTime(startDateTime)}</strong> and closes on <strong>{formatDeterministicDateTime(endDateTime)}</strong>.
                  <br />
                  Students must join by <strong className="text-rose-700 underline font-mono">{formatDeterministicDateTime(lastJoin)}</strong> to receive their full {validDurationMins} minutes.
                </p>
              )}
              {publishAction === 'DRAFT' && (
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Saved privately in your test catalog. No students can see or take this exam until you open it or schedule it.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              ← Back to Questions
            </button>

            <button
              type="button"
              onClick={handleFinalLaunch}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating & Launching Test... Please wait...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Launch Examination & Save Test
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Add New Section ── */}
      {newSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Section</h3>
              <button onClick={() => setNewSectionModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section Name</label>
              <input
                type="text"
                value={newSectionInput}
                onChange={(e) => setNewSectionInput(e.target.value)}
                placeholder="e.g. Physics, Chemistry, Biology"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setNewSectionModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                className="flex-1 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md"
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Bulk Upload Questions (SCR-ADM-14) ── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Bulk Import Questions (SCR-ADM-14)
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste CSV rows in the format: <br />
              <code className="font-mono text-[11px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                Question, Option A, Option B, Option C, Option D, CorrectKey (A/B/C/D), Solution
              </code>
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="What is the unit of Force?, Newton, Joule, Watt, Pascal, A, Force is measured in Newtons (N)"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImportCSV}
                disabled={!csvText.trim()}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md disabled:opacity-50"
              >
                Import Questions
              </button>
            </div>
          </div>
        </div>
      )}

      <AiQuestionImportModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApply={applyParsedQuestions}
      />
    </div>
  );
}

export default function CreateTestWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading test builder...</p>
        </div>
      }
    >
      <CreateTestWizardContent />
    </Suspense>
  );
}
