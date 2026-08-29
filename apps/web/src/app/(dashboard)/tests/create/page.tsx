// apps/web/src/app/(dashboard)/tests/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
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
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';

export default function CreateTestWizardPage() {
  const router = useRouter();
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
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('07:00');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [endTime, setEndTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
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
  const [authoredQuestions, setAuthoredQuestions] = useState<any[]>([]);

  // Current question under edit in Step 3
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentQType, setCurrentQType] = useState('SINGLE_CORRECT');
  const [currentStatement, setCurrentStatement] = useState('');
  const [currentDiagramUrl, setCurrentDiagramUrl] = useState('');
  const [currentMarksPos, setCurrentMarksPos] = useState(4.0);
  const [currentMarksNeg, setCurrentMarksNeg] = useState(1.0);
  const [currentOptions, setCurrentOptions] = useState([
    { id: 'opt_1', optionLabel: 'A', contentHtml: '', isCorrect: true },
    { id: 'opt_2', optionLabel: 'B', contentHtml: '', isCorrect: false },
    { id: 'opt_3', optionLabel: 'C', contentHtml: '', isCorrect: false },
    { id: 'opt_4', optionLabel: 'D', contentHtml: '', isCorrect: false },
  ]);
  const [currentHint, setCurrentHint] = useState('');
  const [currentShortExp, setCurrentShortExp] = useState('');
  const [currentStepSol, setCurrentStepSol] = useState('');

  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isShortExpOpen, setIsShortExpOpen] = useState(false);
  const [isStepSolOpen, setIsStepSolOpen] = useState(false);

  // Bulk Upload Modal state (SCR-ADM-14)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Step 4: Publish mode selection
  const [publishAction, setPublishAction] = useState<'INSTANT' | 'SCHEDULED' | 'DRAFT'>('INSTANT');

  useEffect(() => {
    api.get('/batches').then((res) => {
      setBatches(res.data);
      if (res.data.length > 0) {
        setBatchId(res.data[0].id);
      }
    }).catch(console.error);
  }, []);

  const totalCalculatedMarks =
    authoredQuestions.length > 0
      ? authoredQuestions.reduce((sum, q) => sum + (q.marksPositive !== undefined ? Number(q.marksPositive) : 4), 0)
      : totalQuestions * positiveMarkRate;

  const calculatedPassMarks =
    passMarkType === 'PERCENTAGE' ? Math.round((passMarks / 100) * totalCalculatedMarks) : passMarks;

  const cleanOptionText = (text: string) => {
    if (!text) return '';
    return text.replace(/^[A-Za-z0-9][\)\.\:\-]\s*/, '').trim();
  };

  const insertMathSnippet = (snippet: string) => {
    setCurrentStatement((prev) => (prev ? prev + ` ${snippet} ` : `${snippet} `));
  };

  const handleAddSection = () => {
    if (!newSectionInput.trim()) return;
    const newSec = { id: `sec-${Date.now()}`, name: newSectionInput.trim() };
    setSections([...sections, newSec]);
    setActiveSectionId(newSec.id);
    setNewSectionInput('');
    setNewSectionModal(false);
  };

  const handleAddOption = () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const nextLetter = letters[currentOptions.length] || `Opt${currentOptions.length + 1}`;
    setCurrentOptions([
      ...currentOptions,
      { id: `opt_${Date.now()}_${currentOptions.length}`, optionLabel: nextLetter, contentHtml: '', isCorrect: false },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (currentOptions.length <= 2) return;
    const updated = currentOptions.filter((_, i) => i !== index);
    setCurrentOptions(updated);
  };

  const handleSaveCurrentQuestion = () => {
    if (!currentStatement.trim()) {
      alert('Please enter a question statement');
      return;
    }

    const qObj = {
      id: editingIndex !== null ? authoredQuestions[editingIndex].id : `q-${Date.now()}`,
      sectionId: activeSectionId,
      questionType: currentQType,
      contentHtml: currentStatement.trim(),
      diagramUrl: currentDiagramUrl.trim(),
      marksPositive: Number(currentMarksPos) || 4,
      marksNegative: Number(currentMarksNeg) || 1,
      options: currentOptions.map((o) => ({ ...o, contentHtml: cleanOptionText(o.contentHtml) })),
      hint: currentHint.trim(),
      shortExplanation: currentShortExp.trim(),
      stepByStepSolution: currentStepSol.trim(),
    };

    if (editingIndex !== null) {
      const updated = [...authoredQuestions];
      updated[editingIndex] = qObj;
      setAuthoredQuestions(updated);
      setEditingIndex(null);
    } else {
      setAuthoredQuestions((prev) => [...prev, qObj]);
    }

    // Reset editor for next question
    setCurrentStatement('');
    setCurrentDiagramUrl('');
    setCurrentOptions([
      { id: `opt_${Date.now()}_1`, optionLabel: 'A', contentHtml: '', isCorrect: true },
      { id: `opt_${Date.now()}_2`, optionLabel: 'B', contentHtml: '', isCorrect: false },
      { id: `opt_${Date.now()}_3`, optionLabel: 'C', contentHtml: '', isCorrect: false },
      { id: `opt_${Date.now()}_4`, optionLabel: 'D', contentHtml: '', isCorrect: false },
    ]);
    setCurrentHint('');
    setCurrentShortExp('');
    setCurrentStepSol('');
    setIsHintOpen(false);
    setIsShortExpOpen(false);
    setIsStepSolOpen(false);
  };

  const handleEditQuestion = (index: number) => {
    const q = authoredQuestions[index];
    setEditingIndex(index);
    setActiveSectionId(q.sectionId || sections[0].id);
    setCurrentQType(q.questionType || 'SINGLE_CORRECT');
    setCurrentStatement(q.contentHtml || '');
    setCurrentDiagramUrl(q.diagramUrl || '');
    setCurrentMarksPos(q.marksPositive || 4);
    setCurrentMarksNeg(q.marksNegative || 1);
    setCurrentOptions(q.options || []);
    setCurrentHint(q.hint || '');
    setCurrentShortExp(q.shortExplanation || '');
    setCurrentStepSol(q.stepByStepSolution || '');
    if (q.hint) setIsHintOpen(true);
    if (q.shortExplanation) setIsShortExpOpen(true);
    if (q.stepByStepSolution) setIsStepSolOpen(true);
  };

  const handleDeleteQuestion = (index: number) => {
    setAuthoredQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentStatement('');
    }
  };

  const handleBulkImportCSV = () => {
    if (!csvText.trim()) return;
    const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
    const parsed: any[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 6) {
        const [statement, optA, optB, optC, optD, correctKey, sol] = parts;
        parsed.push({
          id: `bulk-q-${Date.now()}-${idx}`,
          sectionId: activeSectionId,
          questionType: 'SINGLE_CORRECT',
          contentHtml: statement,
          marksPositive: positiveMarkRate,
          marksNegative: negativeMarkRate,
          options: [
            { id: `b-opt-1-${idx}`, optionLabel: 'A', contentHtml: optA, isCorrect: correctKey.toUpperCase() === 'A' },
            { id: `b-opt-2-${idx}`, optionLabel: 'B', contentHtml: optB, isCorrect: correctKey.toUpperCase() === 'B' },
            { id: `b-opt-3-${idx}`, optionLabel: 'C', contentHtml: optC, isCorrect: correctKey.toUpperCase() === 'C' },
            { id: `b-opt-4-${idx}`, optionLabel: 'D', contentHtml: optD, isCorrect: correctKey.toUpperCase() === 'D' },
          ],
          stepByStepSolution: sol || '',
        });
      }
    });

    setAuthoredQuestions((prev) => [...prev, ...parsed]);
    setIsBulkModalOpen(false);
    setCsvText('');
  };

  const handleFinalLaunch = async () => {
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);

      const payload = {
        title: title || 'Examination Mock Test',
        description,
        batchId,
        subjectId: testScope !== 'BATCH_LEVEL' ? subjectId : undefined,
        lessonId: testScope === 'LESSON_LEVEL' ? lessonId : undefined,
        testType: testScope,
        totalMarks: Number(totalCalculatedMarks),
        passMarks: Number(calculatedPassMarks),
        negativeMarkRate: isNegativeEnabled ? Number(negativeMarkRate) : 0,
        durationMinutes: Number(durationMinutes),
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        isPublished: publishAction === 'INSTANT',
        antiCheatLevel: Number(antiCheatLevel),
        shuffleQuestions,
        shuffleOptions,
        resultPublishMode,
        submitUnlockMinutes: Number(submitUnlockMinutes),
        questionsPerScreen: questionsPerScreen === '1 at a time' ? 1 : Number(questionsPerScreen) || 1,
      };

      const res = await api.post('/tests', payload);
      const newTestId = res.data.id;

      // Add all authored questions to the test
      if (authoredQuestions.length > 0) {
        for (const q of authoredQuestions) {
          await api.post(`/tests/${newTestId}/questions`, {
            questionType: q.questionType || 'SINGLE_CORRECT',
            contentHtml: q.contentHtml,
            diagramUrl: q.diagramUrl || undefined,
            marksPositive: q.marksPositive || 4,
            marksNegative: q.marksNegative || 1,
            options: q.options,
            hint: q.hint || undefined,
            shortExplanation: q.shortExplanation || undefined,
            stepByStepSolution: q.stepByStepSolution || undefined,
          }).catch(console.error);
        }
      }

      router.push(`/tests/${newTestId}`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create test');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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

          {/* Target Batch */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Target Batch *</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Window & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date & Time *</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-2/3 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-1/3 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date & Time *</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-2/3 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-1/3 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Mins) *</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>
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
      {/* STEP 3: QUESTION BUILDER (SCR-ADM-12: admin-08-question-builder - Copy.png) */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand-600" /> Step 3: Question Authoring & Section Management
            </h2>
            <span className="text-xs text-slate-400 font-mono font-medium">SCR-ADM-12</span>
          </div>

          {/* Top Action Bar: [☁ Bulk Upld], [📄 Q Template], [+ Add Section] */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-brand-600" /> Bulk Upload (CSV)
              </button>

              <button
                type="button"
                onClick={() => alert('Template format:\nQuestion, Option A, Option B, Option C, Option D, CorrectKey, Optional Solution')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Q Template
              </button>

              <button
                type="button"
                onClick={() => setNewSectionModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-purple-600" /> + Add Section
              </button>
            </div>

            <div className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
              {authoredQuestions.length} Questions in Exam
            </div>
          </div>

          {/* Section Selection Bar */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSectionId === sec.id
                    ? 'bg-purple-50 text-purple-800 border border-purple-300 ring-2 ring-purple-500/10'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>SECTION: {sec.name}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white text-purple-700 text-[10px]">
                  {authoredQuestions.filter((q) => q.sectionId === sec.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Active Question Editor Card */}
          <div className="bg-slate-50/80 rounded-3xl border border-slate-200 p-6 space-y-4">
            {/* Toolbar Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                  {editingIndex !== null ? `Editing Q${editingIndex + 1}` : `New Q${authoredQuestions.length + 1}`}
                </span>
                <select
                  value={currentQType}
                  onChange={(e) => setCurrentQType(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="SINGLE_CORRECT">1. Single Correct MCQ</option>
                  <option value="MULTIPLE_CORRECT">2. Multiple Correct MCQ</option>
                  <option value="NUMERICAL">3. Numerical Value</option>
                  <option value="ASSERTION_REASON">4. Assertion & Reason</option>
                  <option value="FILL_IN_BLANK">5. Fill in the Blank</option>
                  <option value="MATRIX_MATCH">6. Matrix Match</option>
                  <option value="TRUE_FALSE">7. True / False</option>
                  <option value="DESCRIPTIVE">8. Descriptive</option>
                </select>
              </div>

              {/* KaTeX Symbol Ribbon */}
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Fraction', snip: '$\\frac{a}{b}$' },
                  { label: 'Sqrt', snip: '$\\sqrt{x}$' },
                  { label: 'Pow', snip: '$x^2$' },
                  { label: 'Sub', snip: '$x_1$' },
                  { label: 'Omega', snip: '$\\Omega$' },
                  { label: 'Integral', snip: '$\\int f(x)dx$' },
                  { label: 'Delta', snip: '$\\Delta$' },
                  { label: 'Theta', snip: '$\\theta$' },
                  { label: 'Block Formula', snip: '$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$' },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => insertMathSnippet(s.snip)}
                    className="px-2 py-1 bg-white hover:bg-brand-50 hover:text-brand-700 border border-slate-200 rounded-lg text-[10px] font-mono transition-colors"
                  >
                    {s.snip}
                  </button>
                ))}
              </div>
            </div>

            {/* Per-Question Marks & Section Assignment */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                  + Marks per Correct
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={currentMarksPos}
                  onChange={(e) => setCurrentMarksPos(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-700 mb-1">
                  - Penalty Rate (Negative)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={currentMarksNeg}
                  onChange={(e) => setCurrentMarksNeg(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-rose-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assign Section
                </label>
                <select
                  value={activeSectionId}
                  onChange={(e) => setActiveSectionId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Accumulated Test Marks
                </label>
                <div className="text-xs font-mono font-bold p-2 bg-brand-50 text-brand-900 rounded-xl border border-brand-200 truncate">
                  Total: {authoredQuestions.reduce((acc, q) => acc + (q.marksPositive !== undefined ? Number(q.marksPositive) : 4), 0) + Number(currentMarksPos)} M
                </div>
              </div>
            </div>

            {/* Question Statement Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  Question Statement <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Supports $inline$ and $$block$$ LaTeX formulas</span>
              </div>
              <textarea
                rows={3}
                value={currentStatement}
                onChange={(e) => setCurrentStatement(e.target.value)}
                placeholder="Paste or type your question statement here with formulas like $E = mc^2$..."
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Diagram URL */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-brand-600" /> Optional Diagram / Image URL
              </label>
              <input
                type="text"
                value={currentDiagramUrl}
                onChange={(e) => setCurrentDiagramUrl(e.target.value)}
                placeholder="https://pub-mock.r2.dev/diagrams/kinematics.png"
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
              />
            </div>

            {/* ── LIVE PREVIEW BOX (Statement & Diagram) ── */}
            <div className="p-4 rounded-2xl bg-white border border-brand-200 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                ✨ Live Question Statement Preview:
              </span>
              <div className="text-xs text-slate-800 leading-relaxed font-sans min-h-[2rem]">
                {currentStatement.trim() ? (
                  renderMath(currentStatement)
                ) : (
                  <span className="text-slate-400 italic">Type or paste text above to see live formula rendering...</span>
                )}
              </div>
              {currentDiagramUrl && (
                <div className="pt-2">
                  <img
                    src={currentDiagramUrl}
                    alt="Question Diagram"
                    className="max-h-48 rounded-xl border border-slate-200 object-contain mx-auto"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Options List with Correct Key Selector */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Option Choices (Click letter to toggle correct answer key):
                </span>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-[11px] font-bold text-brand-700 hover:text-brand-600 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Option
                </button>
              </div>

              {currentOptions.map((opt, idx) => (
                <div key={opt.id || idx} className="space-y-1.5">
                  <div
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                      opt.isCorrect
                        ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (currentQType === 'SINGLE_CORRECT') {
                          setCurrentOptions(currentOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        } else {
                          setCurrentOptions(currentOptions.map((o, i) => (i === idx ? { ...o, isCorrect: !o.isCorrect } : o)));
                        }
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors shadow-sm ${
                        opt.isCorrect ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {opt.optionLabel}
                    </button>

                    <input
                      type="text"
                      value={opt.contentHtml}
                      onChange={(e) => {
                        const updated = [...currentOptions];
                        updated[idx].contentHtml = e.target.value;
                        setCurrentOptions(updated);
                      }}
                      placeholder={`Type Option ${opt.optionLabel} text or $KaTeX$...`}
                      className="flex-1 text-xs bg-transparent border-none focus:outline-none font-mono"
                    />

                    {opt.isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> Correct Key
                      </span>
                    )}

                    {currentOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Option Live Preview if contains formula */}
                  {opt.contentHtml.includes('$') && (
                    <div className="pl-12 text-[11px] text-slate-700 font-sans">
                      <span className="text-[10px] text-slate-400 font-mono mr-1">Preview:</span>
                      {renderMath(opt.contentHtml)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 3-Tier Optional Solutions: Hint, Short Exp, Step-by-Step */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-800 block">
                3-Tier Solution & Hints <span className="text-[11px] font-normal text-slate-400">(Optional — unlocks for students after test)</span>
              </span>

              {/* 💡 Hint (Optional) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsHintOpen(!isHintOpen)}
                  className="flex items-center justify-between w-full text-xs font-bold text-amber-900"
                >
                  <span className="flex items-center gap-1.5">
                    💡 Hint <span className="text-[10px] font-normal text-amber-600">(Optional)</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{isHintOpen ? '▲ Hide' : '▼ Add / Edit'}</span>
                </button>
                {isHintOpen && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={currentHint}
                      onChange={(e) => setCurrentHint(e.target.value)}
                      placeholder="Short conceptual hint..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-sans"
                    />
                    {currentHint && (
                      <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-950">
                        {renderMath(currentHint)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 💬 Short Explanation (Optional) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsShortExpOpen(!isShortExpOpen)}
                  className="flex items-center justify-between w-full text-xs font-bold text-blue-900"
                >
                  <span className="flex items-center gap-1.5">
                    💬 Short Explanation <span className="text-[10px] font-normal text-blue-600">(Optional)</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{isShortExpOpen ? '▲ Hide' : '▼ Add / Edit'}</span>
                </button>
                {isShortExpOpen && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={currentShortExp}
                      onChange={(e) => setCurrentShortExp(e.target.value)}
                      placeholder="1-line summary of key formula or concept..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-sans"
                    />
                    {currentShortExp && (
                      <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs text-blue-950">
                        {renderMath(currentShortExp)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 📋 Step-by-Step Solution (Optional) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsStepSolOpen(!isStepSolOpen)}
                  className="flex items-center justify-between w-full text-xs font-bold text-purple-900"
                >
                  <span className="flex items-center gap-1.5">
                    📋 Step-by-Step Solution <span className="text-[10px] font-normal text-purple-600">(Optional with $KaTeX$)</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{isStepSolOpen ? '▲ Hide' : '▼ Add / Edit'}</span>
                </button>
                {isStepSolOpen && (
                  <div className="space-y-1.5 pt-1">
                    <textarea
                      rows={3}
                      value={currentStepSol}
                      onChange={(e) => setCurrentStepSol(e.target.value)}
                      placeholder="Step-by-step mathematical derivation using $KaTeX$ formulas..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                    />
                    {currentStepSol && (
                      <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-200/60 text-xs text-purple-950">
                        {renderMath(currentStepSol)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Save Question Button */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveCurrentQuestion}
                disabled={!currentStatement.trim()}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> {editingIndex !== null ? 'Update Question' : 'Save & Add Next Question'}
              </button>
            </div>
          </div>

          {/* Authored Questions List Preview */}
          {authoredQuestions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 block">
                Authored Questions Roster ({authoredQuestions.length}):
              </span>

              <div className="space-y-2.5">
                {authoredQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold font-mono">
                          Q{idx + 1}
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                          {sections.find((s) => s.id === q.sectionId)?.name || 'General'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          +{q.marksPositive || 4} / -{q.marksNegative || 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditQuestion(idx)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-800 font-sans">
                      {renderMath(q.contentHtml)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                      {q.options?.map((opt: any) => (
                        <div
                          key={opt.optionLabel}
                          className={`p-2 rounded-xl text-[11px] border flex items-center gap-1.5 ${
                            opt.isCorrect ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="font-bold">{opt.optionLabel}.</span>
                          <span className="truncate">{renderMath(opt.contentHtml || '')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Show step solution if present */}
                    {q.stepByStepSolution && (
                      <div className="text-[10px] text-purple-800 bg-purple-50/60 p-2 rounded-lg mt-1 font-sans">
                        <span className="font-bold mr-1">Solution:</span> {renderMath(q.stepByStepSolution)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
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
                {authoredQuestions.length} Questions ({sections.length} Sections)
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
              className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Launch Examination & Save Test
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
    </div>
  );
}
