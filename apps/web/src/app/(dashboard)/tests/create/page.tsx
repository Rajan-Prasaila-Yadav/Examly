// apps/web/src/app/(dashboard)/tests/create/page.tsx
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, invalidateApiCache } from '@/lib/api';
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
  const paramTestId = searchParams.get('testId') || '';
  const paramBatchId = searchParams.get('batchId') || '';
  const paramSubjectId = searchParams.get('subjectId') || '';
  const paramLessonId = searchParams.get('lessonId') || '';
  const paramScope = (searchParams.get('scope') as any) || '';
  const isEditing = Boolean(paramTestId);
  const [isLoadingExisting, setIsLoadingExisting] = useState(Boolean(paramTestId));

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
  // Step 3: Question Authoring & Continuous Sections (SCR-ADM-12)
  // ══════════════════════════════════════════════════════════════════════════
  const [sections, setSections] = useState<{ id: string; name: string; questionCount?: number }[]>([
    { id: 'sec-1', name: 'Section A', questionCount: 50 },
  ]);
  const [activeSectionFilter, setActiveSectionFilter] = useState<'ALL' | string>('ALL');
  const [activeSectionId, setActiveSectionId] = useState('sec-1');
  const [newSectionModal, setNewSectionModal] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState('');

  // Continuous Section Range Partitioning: ZERO GAPS and ZERO OVERLAPS guaranteed!
  const sectionPartitions = useMemo(() => {
    let currStart = 1;
    const count = sections.length;
    if (count === 0) {
      return [{ id: 'sec-1', name: 'General Section', count: totalQuestions, startQ: 1, endQ: Math.max(1, totalQuestions) }];
    }

    return sections.map((sec, idx) => {
      let qCount = sec.questionCount;
      if (qCount === undefined || qCount === null || qCount <= 0) {
        const remainingTotal = Math.max(1, totalQuestions - (currStart - 1));
        const remainingSections = Math.max(1, count - idx);
        qCount = idx === count - 1 ? remainingTotal : Math.max(1, Math.floor(remainingTotal / remainingSections));
      }
      const startQ = currStart;
      const endQ = startQ + qCount - 1;
      currStart = endQ + 1;
      return {
        id: sec.id,
        name: sec.name,
        count: qCount,
        startQ,
        endQ,
      };
    });
  }, [sections, totalQuestions]);

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

        if (paramTestId) {
          try {
            const testRes = await api.get(`/tests/${paramTestId}`);
            const t = testRes.data;
            if (t) {
              setTitle(t.title || '');
              setDescription(t.description || '');
              setDurationMinutes(t.durationMinutes || 60);
              setPositiveMarkRate(t.positiveMarkRate || 4.0);
              setNegativeMarkRate(t.negativeMarkRate !== undefined ? t.negativeMarkRate : 1.0);
              setIsNegativeEnabled((t.negativeMarkRate || 0) > 0);
              setPassMarks(t.passMarks || 40);
              if (t.startDateTime) {
                const sDate = new Date(t.startDateTime);
                setStartDate(toLocalDateInput(sDate));
                setStartTime(toLocalTimeInput(sDate));
              }
              if (t.endDateTime) {
                const eDate = new Date(t.endDateTime);
                setEndDate(toLocalDateInput(eDate));
                setEndTime(toLocalTimeInput(eDate));
              }
              if (t.batchId) setBatchId(t.batchId);
              if (t.subjectId) setSubjectId(t.subjectId);
              if (t.lessonId) setLessonId(t.lessonId);
              if (t.testType) setTestScope(t.testType);

              if (t.config) {
                setShuffleQuestions(t.config.shuffleQuestions ?? true);
                setShuffleOptions(t.config.shuffleOptions ?? true);
                setAntiCheatLevel(t.config.antiCheatLevel ?? 3);
                setSubmitUnlockMinutes(t.config.submitUnlockDelayMins ?? 0);
                setQuestionsPerScreen(t.config.oneQuestionAtATime ? '1 at a time' : String(t.config.questionsPerScreen || 1));
                setResultPublishMode(t.config.publishMode || 'AFTER_TEST_END');
              }

              if (t.sections && t.sections.length > 0) {
                const loadedSections = t.sections.map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  targetCount: s.questions?.length || 0,
                }));
                setSections(loadedSections);

                const loadedSlots: QuestionSlot[] = [];
                t.sections.forEach((sec: any) => {
                  (sec.questions || []).forEach((q: any) => {
                    loadedSlots.push({
                      id: q.id,
                      sectionId: sec.id,
                      questionType: q.questionType || 'SINGLE_CORRECT',
                      contentHtml: q.contentHtml || '',
                      diagramUrl: q.diagramUrl || '',
                      marksPositive: q.marksPositive ?? 4,
                      marksNegative: q.marksNegative ?? 1,
                      options: (q.options || []).map((o: any, idx: number) => ({
                        id: o.id,
                        optionLabel: o.optionLabel || String.fromCharCode(65 + idx),
                        contentHtml: o.contentHtml || '',
                        isCorrect: Boolean(o.isCorrect),
                      })),
                      hint: q.solution?.hintHtml || '',
                      shortExplanation: q.solution?.shortExplanation || '',
                      stepByStepSolution: q.solution?.stepByStepHtml || '',
                    });
                  });
                });
                if (loadedSlots.length > 0) {
                  setAuthoredQuestions(loadedSlots);
                  setTotalQuestions(loadedSlots.length);
                }
              }

              if (t.isPublished) setPublishAction('INSTANT');
              else if (t.testStatus === 'SCHEDULED') setPublishAction('SCHEDULED');
              else setPublishAction('DRAFT');
            }
          } catch (e) {
            console.error('Failed to load test for editing', e);
          } finally {
            setIsLoadingExisting(false);
          }
        } else if (paramLessonId) {
          setLessonId(paramLessonId);
          setTestScope('LESSON_LEVEL');
          const lessonRes = await api.get(`/lessons/${paramLessonId}`).catch(() => api.get(`/content/lessons/${paramLessonId}`));
          if (lessonRes.data) {
            const sId = lessonRes.data.subjectId;
            const bId = lessonRes.data.subject?.batchId;
            if (bId) setBatchId(bId);
            if (sId) setSubjectId(sId);

            if (bId) {
              const subRes = await api.get(`/subjects/batch/${bId}`);
              setSubjects(subRes.data || []);
            } else {
              const subRes = await api.get(`/content/subjects`).catch(() => api.get('/subjects'));
              setSubjects(subRes.data || []);
            }
            if (sId) {
              const subDetail = await api.get(`/subjects/${sId}`).catch(() => api.get(`/content/subjects/${sId}`));
              setLessons(subDetail.data?.lessons || []);
            }
          }
        } else if (paramSubjectId) {
          setSubjectId(paramSubjectId);
          setTestScope('SUBJECT_LEVEL');
          const subRes = await api.get(`/subjects/${paramSubjectId}`).catch(() => api.get(`/content/subjects/${paramSubjectId}`));
          if (subRes.data) {
            const bId = subRes.data.batchId;
            if (bId) setBatchId(bId);
            setLessons(subRes.data.lessons || []);
            if (bId) {
              const subsRes = await api.get(`/subjects/batch/${bId}`);
              setSubjects(subsRes.data || []);
            } else {
              const allSubs = await api.get(`/content/subjects`).catch(() => api.get('/subjects'));
              setSubjects(allSubs.data || []);
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
      if (newBatchId) {
        const res = await api.get(`/subjects/batch/${newBatchId}`);
        setSubjects(res.data || []);
        if (res.data?.length > 0) {
          const firstSubId = res.data[0].id;
          setSubjectId(firstSubId);
          const subRes = await api.get(`/subjects/${firstSubId}`).catch(() => api.get(`/content/subjects/${firstSubId}`));
          setLessons(subRes.data?.lessons || []);
          if (subRes.data?.lessons?.length > 0) {
            setLessonId(subRes.data.lessons[0].id);
          }
        }
      } else {
        const res = await api.get(`/content/subjects`).catch(() => api.get('/subjects'));
        setSubjects(res.data || []);
        if (res.data?.length > 0) {
          const firstSubId = res.data[0].id;
          setSubjectId(firstSubId);
          const subRes = await api.get(`/content/subjects/${firstSubId}`).catch(() => api.get(`/subjects/${firstSubId}`));
          setLessons(subRes.data?.lessons || []);
          if (subRes.data?.lessons?.length > 0) {
            setLessonId(subRes.data.lessons[0].id);
          }
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
      const res = await api.get(`/subjects/${newSubjectId}`).catch(() => api.get(`/content/subjects/${newSubjectId}`));
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
        batchId: batchId || undefined,
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

  // Continuous Section Range Partitioning & Question slot synchronization
  useEffect(() => {
    setAuthoredQuestions((prev) => {
      const padded = padSlots(
        prev,
        Number(totalQuestions) || 1,
        sections[0]?.id || 'sec-1',
        optionCountNum,
        defaultQType,
      );
      return padded.map((q, idx) => {
        const qNum = idx + 1;
        const part =
          sectionPartitions.find((p) => qNum >= p.startQ && qNum <= p.endQ) ||
          sectionPartitions[sectionPartitions.length - 1];
        const targetSecId = part?.id || q.sectionId;
        return q.sectionId !== targetSecId ? { ...q, sectionId: targetSecId } : q;
      });
    });
  }, [totalQuestions, sectionPartitions, optionCountNum, defaultQType]);

  const filledCount = authoredQuestions.filter(isSlotFilled).length;

  const totalCalculatedMarks = authoredQuestions.reduce((sum, q) => {
    const marks = q.marksPositive != null ? Number(q.marksPositive) : Number(positiveMarkRate);
    return sum + (isSlotFilled(q) ? marks : Number(positiveMarkRate));
  }, 0);

  const calculatedPassMarks =
    passMarkType === 'PERCENTAGE' ? Math.round((passMarks / 100) * totalCalculatedMarks) : passMarks;

  // ── Section Range Management Handlers (Guarantees zero gaps and zero overlaps!) ──
  const handleAddSection = () => {
    const nextLetter = String.fromCharCode(65 + sections.length);
    const newSec = {
      id: `sec-${Date.now()}`,
      name: `Section ${nextLetter}`,
      questionCount: Math.max(5, Math.floor((Number(totalQuestions) || 50) / (sections.length + 1))),
    };
    setSections((prev) => [...prev, newSec]);
  };

  const handleRenameSection = (id: string, name: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleSetSectionCount = (index: number, newCount: number) => {
    const validCount = Math.max(1, newCount || 1);
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], questionCount: validCount };
      return next;
    });
  };

  const handleSetSectionEndQ = (index: number, newEndQ: number) => {
    const partition = sectionPartitions[index];
    if (!partition) return;
    const newCount = Math.max(1, newEndQ - partition.startQ + 1);
    handleSetSectionCount(index, newCount);
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (activeSectionFilter === id) {
      setActiveSectionFilter('ALL');
    }
  };

  const handleAutoDistributeSections = () => {
    const K = sections.length;
    if (K === 0) return;
    const tot = Number(totalQuestions) || 50;
    const base = Math.floor(tot / K);
    const rem = tot % K;
    setSections((prev) =>
      prev.map((s, idx) => ({
        ...s,
        questionCount: idx < rem ? base + 1 : base,
      }))
    );
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
        : [makeEmptySlot({ sectionId: sections[0]?.id || 'sec-1', optionCount: optionCountNum, questionType: defaultQType })];
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
      const finalBatchId = batchId || (batches.length > 0 ? batches[0].id : undefined);
      if (testScope === 'BATCH_LEVEL' && !finalBatchId) {
        alert('Please select an Academic Batch to assign this batch-level test to.');
        setIsSubmitting(false);
        return;
      }
      if (testScope === 'SUBJECT_LEVEL' && !subjectId) {
        alert('Please select a Target Subject.');
        setIsSubmitting(false);
        return;
      }
      if (testScope === 'LESSON_LEVEL' && !lessonId) {
        alert('Please select a Target Chapter / Lesson.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        title: title || 'Examination Mock Test',
        description,
        batchId: testScope === 'BATCH_LEVEL' ? finalBatchId : (batchId || undefined),
        subjectId: testScope !== 'BATCH_LEVEL' ? (subjectId || undefined) : undefined,
        lessonId: testScope === 'LESSON_LEVEL' ? (lessonId || undefined) : undefined,
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
        sections: sectionPartitions.map((s, idx) => ({ id: s.id, name: s.name, sortOrder: idx + 1 })),
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

      if (isEditing && paramTestId) {
        await api.put(`/tests/${paramTestId}/full`, payload, { timeout: 60000 });
        try {
          localStorage.removeItem('examly_test_creation_wizard_draft');
        } catch {}
        invalidateApiCache('/batches');
        invalidateApiCache('/tests');
        invalidateApiCache('/content');
        router.push(`/tests/${paramTestId}`);
      } else {
        const res = await api.post('/tests', payload, { timeout: 60000 });
        try {
          localStorage.removeItem('examly_test_creation_wizard_draft');
        } catch {}
        invalidateApiCache('/batches');
        invalidateApiCache('/tests');
        invalidateApiCache('/content');
        router.push(`/tests/${res.data.id}`);
      }
    } catch (e: any) {
      const msg = e.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join('; ') : (msg || e.message || 'Failed to save test');
      alert(`Test notice: ${errorText}`);
      setIsSubmitting(false);
    }
  };

  if (isLoadingExisting) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Loading Examination Settings…</h2>
        <p className="text-xs text-slate-500">Preparing all sections, questions, and proctoring rules for editing.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Draft Recovery Banner */}
      {!isEditing && draftBannerVisible && (
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
          href={isEditing ? `/tests/${paramTestId}` : '/tests/builder'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {isEditing ? 'Back to Test Details' : 'Back to Test Suite'}
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-200/60 inline-flex items-center gap-1">
                {isEditing ? `✏️ Editing Test: ${title || 'Examination'}` : '🎓 Context Auto-Detection Active'}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                {isEditing ? 'Edit Examination Wizard' : 'Create Examination Wizard'}
              </h1>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update test settings, anti-cheat proctoring rules, and author/edit questions across each tab until finalized.'
                  : 'Configure test settings, anti-cheat proctoring rules, and author questions with live LaTeX math formula preview.'}
              </p>
            </div>
          </div>

          {/* 4-Step Wizard Progress Bar (SCR-ADM-10 to SCR-ADM-13) */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100">
            {[
              { num: 1, label: 'Settings', sub: 'Identity & Scheme' },
              { num: 2, label: 'Engine Settings', sub: 'Proctoring & Timing' },
              { num: 3, label: 'Questions', sub: 'Questions Builder' },
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
                  {testScope !== 'BATCH_LEVEL' && (
                    <option value="">-- Main Curriculum (No Batch Required) --</option>
                  )}
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
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-brand-600" /> Bulk Upload (CSV)
              </button>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-300 text-violet-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" /> Fill with Gemini
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-purple-600" /> Add Section
              </button>
              <button
                type="button"
                onClick={handleAutoDistributeSections}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Distribute questions evenly across sections"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto-Distribute ({totalQuestions} Qs)
              </button>
              <button
                type="button"
                onClick={handleAddQuestionSlot}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add template (+1)
              </button>
            </div>
          </div>

          {/* Continuous Section Question Partitioning (Guaranteed zero gaps & zero overlaps!) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" /> Continuous Section Partitioning & Question Ranges
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Every question from 1 to {totalQuestions} is strictly mapped to exactly one section with zero gaps and zero overlaps.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                {sectionPartitions.length} Sections Active
              </span>
            </div>

            {/* Visual Proportional Allocation Bar */}
            <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
              {sectionPartitions.map((p, pIdx) => {
                const pct = totalQuestions > 0 ? (p.count / Number(totalQuestions)) * 100 : 0;
                const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                return (
                  <div
                    key={p.id}
                    style={{ width: `${Math.max(2, pct)}%` }}
                    className={`${colors[pIdx % colors.length]} transition-all duration-300 relative group`}
                    title={`${p.name}: Q${p.startQ}–Q${p.endQ} (${p.count} Qs)`}
                  />
                );
              })}
            </div>

            {/* Section Rows */}
            <div className="space-y-2">
              {sectionPartitions.map((part, pIdx) => (
                <div
                  key={part.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-[180px] flex-1">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 text-xs font-mono font-bold flex items-center justify-center">
                      {String.fromCharCode(65 + pIdx)}
                    </span>
                    <input
                      type="text"
                      value={part.name}
                      onChange={(e) => handleRenameSection(part.id, e.target.value)}
                      placeholder={`Section ${String.fromCharCode(65 + pIdx)}`}
                      className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none px-1 py-0.5 flex-1"
                    />
                  </div>

                  {/* Range inputs: From Q (locked), To Q (editable), Count Qs (editable) */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-mono text-slate-700">
                      <span className="text-slate-400 text-[10px]">From</span>
                      <span className="font-bold text-purple-700">Q{part.startQ}</span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-mono text-slate-700">
                      <span className="text-slate-400 text-[10px]">To</span>
                      <input
                        type="number"
                        min={part.startQ}
                        value={part.endQ}
                        onChange={(e) => handleSetSectionEndQ(pIdx, Number(e.target.value))}
                        className="w-14 bg-white border border-slate-200 rounded text-center font-bold text-purple-700 py-0.5 text-xs focus:ring-1 focus:ring-purple-500"
                        title="Set ending question number for this section"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg font-mono text-purple-800">
                      <input
                        type="number"
                        min="1"
                        value={part.count}
                        onChange={(e) => handleSetSectionCount(pIdx, Number(e.target.value))}
                        className="w-12 bg-white border border-purple-300 rounded text-center font-bold text-purple-900 py-0.5 text-xs focus:ring-1 focus:ring-purple-500"
                        title="Number of questions in this section"
                      />
                      <span className="text-[10px] font-sans">Questions</span>
                    </div>

                    {sectionPartitions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(part.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveSectionFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSectionFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Questions ({authoredQuestions.length})
            </button>
            {sectionPartitions.map((p) => {
              const isSelected = activeSectionFilter === p.id;
              const filledInSec = authoredQuestions.filter(
                (q, qIdx) => qIdx + 1 >= p.startQ && qIdx + 1 <= p.endQ && isSlotFilled(q),
              ).length;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveSectionFilter(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-100 text-purple-900 border border-purple-400 shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="font-mono text-[10px] opacity-80">(Q{p.startQ}–Q{p.endQ})</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      filledInSec === p.count ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {filledInSec}/{p.count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500">
            Questions match your total expected examination count. Negative marking penalty: -{negDefault} per wrong answer.
          </p>

          {/* Question Templates List with Section Badges */}
          <div className="space-y-2">
            {authoredQuestions
              .map((q, idx) => ({ q, idx, qNum: idx + 1 }))
              .filter(({ qNum }) => {
                if (activeSectionFilter === 'ALL') return true;
                const partition = sectionPartitions.find((p) => p.id === activeSectionFilter);
                return partition ? qNum >= partition.startQ && qNum <= partition.endQ : true;
              })
              .map(({ q, idx, qNum }) => {
                const currentPart =
                  sectionPartitions.find((p) => qNum >= p.startQ && qNum <= p.endQ) || sectionPartitions[0];
                const isFirstInSection = currentPart && qNum === currentPart.startQ;

                return (
                  <React.Fragment key={q.id}>
                    {activeSectionFilter === 'ALL' && isFirstInSection && (
                      <div className="pt-3 pb-1 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold font-mono">
                          📍 {currentPart.name} • Questions {currentPart.startQ} to {currentPart.endQ} ({currentPart.count} Questions)
                        </span>
                        <div className="flex-1 h-[1px] bg-slate-200" />
                      </div>
                    )}
                    <QuestionSlotCard
                      index={idx}
                      question={{ ...q, sectionId: currentPart?.id || q.sectionId }}
                      sectionName={`${currentPart?.name || 'Section'} (Q${currentPart?.startQ || 1}–Q${currentPart?.endQ || totalQuestions})`}
                      expanded={expandedSlot === idx}
                      sections={sections}
                      defaultPos={Number(positiveMarkRate)}
                      defaultNeg={negDefault}
                      onToggle={() => setExpandedSlot(expandedSlot === idx ? null : idx)}
                      onChange={(next) => {
                        const copy = [...authoredQuestions];
                        copy[idx] = { ...next, sectionId: currentPart?.id || next.sectionId };
                        setAuthoredQuestions(copy);
                      }}
                      onDelete={() => handleDeleteQuestion(idx)}
                    />
                  </React.Fragment>
                );
              })}
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
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Test Title</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">{title || 'Mock Examination'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Duration & Window</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm block mt-0.5">{durationMinutes} Mins</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Total Calculated Marks</span>
              <span className="font-bold text-brand-700 dark:text-brand-300 font-mono text-sm block mt-0.5">
                {totalCalculatedMarks} (+{positiveMarkRate} / -{isNegativeEnabled ? negativeMarkRate : 0})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Questions Authored</span>
              <span className="font-bold text-purple-700 dark:text-purple-300 font-mono text-sm block mt-0.5">
                {filledCount} filled of {authoredQuestions.length} templates ({sectionPartitions.length} sections)
              </span>
            </div>
          </div>

          {/* Launch Action Selection */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Choose Publishing Option:</span>

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
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{act.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block leading-tight">{act.desc}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Launch Info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 space-y-1" suppressHydrationWarning>
              <span className="font-bold text-slate-900 dark:text-white block">
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
                  <span>{isEditing ? 'Updating Test Changes… Please wait…' : 'Creating & Launching Test... Please wait...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> {isEditing ? 'Update Examination & Save Changes' : 'Launch Examination & Save Test'}
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
