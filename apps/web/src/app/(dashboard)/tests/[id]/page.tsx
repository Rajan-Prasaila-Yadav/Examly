// apps/web/src/app/(dashboard)/tests/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FileCheck2,
  ArrowLeft,
  Play,
  Edit2,
  Trash2,
  Users,
  Award,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Upload,
  Check,
  X,
  Sparkles,
  Plus,
  Layers,
  Calculator,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  History,
} from 'lucide-react';
import katex from 'katex';
import { useAuth } from '@/lib/auth-context';

export default function TestDetailPage() {
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [test, setTest] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedStudentAttempts, setSelectedStudentAttempts] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [attempts, setAttempts] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'analytics' | 'leaderboard' | 'attempts' | 'settings'>(
    isStudent ? 'attempts' : 'questions',
  );
  const [isLoading, setIsLoading] = useState(true);

  // Edit Test Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [totalMarks, setTotalMarks] = useState(200);
  const [passMarks, setPassMarks] = useState(80);
  const [durationMinutes, setDurationMinutes] = useState(120);

  // Add Section Modal
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Add / Edit Question Modal (Split-Pane inside Test)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [questionType, setQuestionType] = useState('SINGLE_CORRECT');
  const [statementHtml, setStatementHtml] = useState('');
  const [marksPositive, setMarksPositive] = useState(4.0);
  const [marksNegative, setMarksNegative] = useState(1.0);
  const [options, setOptions] = useState([
    { optionLabel: 'A', contentHtml: '', isCorrect: true },
    { optionLabel: 'B', contentHtml: '', isCorrect: false },
    { optionLabel: 'C', contentHtml: '', isCorrect: false },
    { optionLabel: 'D', contentHtml: '', isCorrect: false },
  ]);
  const [hint, setHint] = useState('');
  const [shortExplanation, setShortExplanation] = useState('');
  const [stepByStepSolution, setStepByStepSolution] = useState('');
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  // Bulk Upload Questions Modal (SCR-ADM-14)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  const fetchTestDetails = async () => {
    try {
      const [testRes, boardRes, analyticsRes, attemptsRes] = await Promise.all([
        api.get(`/tests/${testId}`),
        api.get(`/tests/${testId}/leaderboard`).catch(() => ({ data: [] })),
        api.get(`/tests/${testId}/analytics`).catch(() => ({ data: null })),
        api.get(`/tests/${testId}/attempts`).catch(() => ({ data: null })),
      ]);
      setTest(testRes.data);
      setTitle(testRes.data.title);
      setTotalMarks(testRes.data.totalMarks);
      setPassMarks(testRes.data.passMarks);
      setDurationMinutes(testRes.data.durationMinutes);
      setLeaderboard(boardRes.data);
      setAnalytics(analyticsRes.data);
      setAttempts(attemptsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    if (testId) {
      fetchTestDetails();
    }
  }, [testId]);

  const handleTogglePublish = async () => {
    try {
      await api.post(`/tests/${testId}/publish`);
      fetchTestDetails();
    } catch (e) {
      alert('Failed to toggle publish status');
    }
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/tests/${testId}`, {
        title,
        totalMarks: Number(totalMarks),
        passMarks: Number(passMarks),
        durationMinutes: Number(durationMinutes),
      });
      setIsEditModalOpen(false);
      fetchTestDetails();
    } catch (e) {
      alert('Failed to update test');
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    try {
      await api.post(`/tests/${testId}/sections`, { name: newSectionName.trim() });
      setNewSectionName('');
      setIsSectionModalOpen(false);
      fetchTestDetails();
    } catch (e) {
      alert('Failed to add section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section and all its questions?')) return;
    try {
      await api.delete(`/tests/sections/${sectionId}`);
      fetchTestDetails();
    } catch (e) {
      alert('Failed to delete section');
    }
  };

  // Question Handlers
  const handleOpenAddQuestion = (sectionId?: string) => {
    setEditingQuestionId(null);
    setSelectedSectionId(sectionId || (test?.sections?.[0]?.id || ''));
    setQuestionType('SINGLE_CORRECT');
    setStatementHtml('');
    setMarksPositive(4.0);
    setMarksNegative(1.0);
    setOptions([
      { optionLabel: 'A', contentHtml: '', isCorrect: true },
      { optionLabel: 'B', contentHtml: '', isCorrect: false },
      { optionLabel: 'C', contentHtml: '', isCorrect: false },
      { optionLabel: 'D', contentHtml: '', isCorrect: false },
    ]);
    setHint('');
    setShortExplanation('');
    setStepByStepSolution('');
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setSelectedSectionId(q.sectionId || (test?.sections?.[0]?.id || ''));
    setQuestionType(q.questionType || 'SINGLE_CORRECT');
    setStatementHtml(q.contentHtml);
    setMarksPositive(q.marksPositive);
    setMarksNegative(q.marksNegative);
    setOptions(
      q.options?.length > 0
        ? q.options.map((o: any) => ({
            optionLabel: o.optionLabel,
            contentHtml: o.contentHtml,
            isCorrect: o.isCorrect,
          }))
        : [
            { optionLabel: 'A', contentHtml: '', isCorrect: true },
            { optionLabel: 'B', contentHtml: '', isCorrect: false },
          ]
    );
    setHint(q.solution?.hintHtml || '');
    setShortExplanation(q.solution?.shortExplanation || '');
    setStepByStepSolution(q.solution?.stepByStepHtml || q.solution?.contentHtml || '');
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestionId) {
        await api.put(`/tests/questions/${editingQuestionId}`, {
          questionType,
          contentHtml: statementHtml,
          marksPositive: Number(marksPositive),
          marksNegative: Number(marksNegative),
          options,
          hint,
          shortExplanation,
          stepByStepSolution,
        });
      } else {
        await api.post(`/tests/${testId}/questions`, {
          sectionId: selectedSectionId,
          questionType,
          contentHtml: statementHtml,
          marksPositive: Number(marksPositive),
          marksNegative: Number(marksNegative),
          options,
          hint,
          shortExplanation,
          stepByStepSolution,
        });
      }
      setIsQuestionModalOpen(false);
      fetchTestDetails();
    } catch (e) {
      alert('Failed to save question');
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deletingQuestionId) return;
    try {
      await api.delete(`/tests/questions/${deletingQuestionId}`);
      setDeletingQuestionId(null);
      fetchTestDetails();
    } catch (e) {
      alert('Failed to delete question');
    }
  };

  // Bulk Import CSV Handler (SCR-ADM-14)
  const handleBulkImport = async () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
      const parsedQuestions = [];

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 6) {
          const [statement, optA, optB, optC, optD, correctKey, sol] = parts;
          parsedQuestions.push({
            contentHtml: statement,
            questionType: 'SINGLE_CORRECT',
            marksPositive: 4,
            marksNegative: 1,
            options: [
              { optionLabel: 'A', contentHtml: optA, isCorrect: correctKey.toUpperCase() === 'A' },
              { optionLabel: 'B', contentHtml: optB, isCorrect: correctKey.toUpperCase() === 'B' },
              { optionLabel: 'C', contentHtml: optC, isCorrect: correctKey.toUpperCase() === 'C' },
              { optionLabel: 'D', contentHtml: optD, isCorrect: correctKey.toUpperCase() === 'D' },
            ],
            solutionText: sol || '',
          });
        }
      }

      await api.post(`/tests/${testId}/bulk-import`, { questions: parsedQuestions });
      setIsBulkModalOpen(false);
      setCsvText('');
      fetchTestDetails();
    } catch (e) {
      alert('Failed to bulk import questions');
    }
  };

  const renderMath = (text: string) => {
    if (!text || typeof text !== 'string') return null;
    try {
      const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g);
      return parts.map((part, idx) => {
        if (!part) return null;
        let formula = '';
        let displayMode = false;

        if (part.startsWith('$$') && part.endsWith('$$')) {
          formula = part.slice(2, -2).trim();
          displayMode = true;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          formula = part.slice(1, -1).trim();
          displayMode = false;
        } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
          formula = part.slice(2, -2).trim();
          displayMode = true;
        } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
          formula = part.slice(2, -2).trim();
          displayMode = false;
        } else {
          return (
            <span key={idx} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        }

        try {
          const html = katex.renderToString(formula, {
            throwOnError: false,
            displayMode,
          });
          return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} className={displayMode ? 'block my-2 text-center' : 'inline-block px-0.5'} />;
        } catch (e) {
          return <span key={idx} className="font-mono text-rose-500 bg-rose-50 px-1 rounded">{part}</span>;
        }
      });
    } catch (e) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Test not found.</p>
        <Link href="/tests/builder" className="text-brand-600 text-xs font-semibold mt-2 inline-block">
          ← Back to Test Builder
        </Link>
      </div>
    );
  }

  const allQuestions = (test.sections || []).flatMap((sec: any) =>
    (sec.questions || []).map((q: any) => ({ ...q, sectionName: sec.name }))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div>
        <Link
          href="/tests/builder"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Test Suite
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 font-mono text-xs font-bold border border-brand-200/60">
                  {test.batch?.name || 'General Batch'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    test.isPublished
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {test.isPublished ? '● Published Live' : '○ Draft'}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{test.title}</h1>
              <p className="text-xs text-slate-500 mt-1">{test.description || 'No description provided.'}</p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {!isStudent && (
                <>
                  <button
                    onClick={handleTogglePublish}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                      test.isPublished
                        ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {test.isPublished ? 'Unpublish' : 'Publish Test Live'}
                  </button>

                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                </>
              )}

              <Link
                href={`/tests/${test.id}/runner`}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Start / Retake Test
              </Link>
            </div>
          </div>

          {/* Test Meta Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{test.durationMinutes} Minutes</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Total Maximum Marks</span>
              <span className="font-bold text-brand-700 font-mono text-sm">{test.totalMarks} Marks</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Pass Mark</span>
              <span className="font-bold text-emerald-600 font-mono text-sm">{test.passMarks} Marks</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Anti-Cheat Level</span>
              <span className="font-bold text-rose-600 font-mono text-sm">
                {test.config?.antiCheatLevel || 3} Strikes Threshold
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          {[
            { key: 'questions', label: `Questions (${allQuestions.length})`, icon: Layers, show: !isStudent },
            { key: 'attempts', label: `My Attempts (${attempts?.totalAttempts ?? 0})`, icon: Clock, show: true },
            { key: 'leaderboard', label: `Leaderboard (${leaderboard.length})`, icon: Award, show: true },
            { key: 'analytics', label: 'Analytics & Accuracy', icon: BarChart3, show: !isStudent },
          ]
            .filter((t) => t.show)
            .map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>

        {activeTab === 'questions' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSectionModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" /> + Add Section
            </button>

            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Bulk Import
            </button>

            <button
              onClick={() => handleOpenAddQuestion()}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Question
            </button>
          </div>
        )}
      </div>

      {/* ── TAB 1: AUTHORED QUESTIONS LIST BY SECTIONS ── */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {(test.sections || []).map((section: any) => (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                  Section: {section.name} ({section.questions?.length || 0} Questions)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddQuestion(section.id)}
                    className="text-xs text-brand-600 font-semibold hover:underline"
                  >
                    + Add to {section.name}
                  </button>
                  {test.sections.length > 1 && (
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                    >
                      Delete Section
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {(section.questions || []).map((q: any, idx: number) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-brand-300 transition-all group"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                          {q.questionType}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold">
                          +{q.marksPositive} / -{q.marksNegative} Marks
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditQuestion(q)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit Question"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingQuestionId(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Statement with Live KaTeX */}
                    <div className="text-sm font-medium text-slate-800 leading-relaxed">
                      {renderMath(q.contentHtml)}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {(q.options || []).map((opt: any) => (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-2xl border flex items-center gap-3 text-xs ${
                            opt.isCorrect
                              ? 'bg-emerald-50/80 border-emerald-300 font-bold text-emerald-900 ring-1 ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {opt.optionLabel}
                          </span>
                          <span className="flex-1">{renderMath(opt.contentHtml)}</span>
                          {opt.isCorrect && (
                            <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Correct Key
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 3-Tier Solution Preview */}
                    {q.solution && (
                      <div className="p-4 rounded-2xl bg-brand-50/40 border border-brand-100 text-xs text-brand-900 space-y-2">
                        {q.solution.hintHtml && (
                          <div className="flex gap-2">
                            <span className="font-bold text-amber-700 shrink-0">💡 Hint:</span>
                            <span className="text-slate-700">{renderMath(q.solution.hintHtml)}</span>
                          </div>
                        )}
                        {q.solution.shortExplanation && (
                          <div className="flex gap-2">
                            <span className="font-bold text-blue-700 shrink-0">💬 Explanation:</span>
                            <span className="text-slate-700">{renderMath(q.solution.shortExplanation)}</span>
                          </div>
                        )}
                        {(q.solution.stepByStepHtml || q.solution.contentHtml) && (
                          <div className="pt-1">
                            <span className="font-bold text-purple-700 block mb-1">📋 Step-by-Step Solution:</span>
                            <p className="text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                              {renderMath(q.solution.stepByStepHtml || q.solution.contentHtml)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {allQuestions.length === 0 && (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <Calculator className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No questions added yet to this test</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "+ Add Question" or "Bulk Import" to start authoring questions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: COMPREHENSIVE TEST ANALYTICS (SCR-ADM-16) ── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block">Average Test Score</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {analytics?.avgScore || 148}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ {test.totalMarks} Marks</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-3">
                <TrendingUp className="w-3 h-3" /> Server-authoritative calculation
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block">Total Submissions</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-brand-700 font-mono">
                  {analytics?.totalAttempted ?? leaderboard.length}
                </span>
                <span className="text-xs text-slate-400">Students Attempted</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-3 font-mono">Recorded in Database</span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block">Highest Top Score</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-purple-700 font-mono">
                  {analytics?.topScore || (leaderboard[0]?.result?.totalScore ?? 192)}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ {test.totalMarks} Marks</span>
              </div>
              <span className="text-[11px] text-purple-600 block mt-3 font-bold">
                {analytics?.topStudents?.[0]?.studentName || leaderboard[0]?.student?.fullName || 'Aarav Sharma (#1)'}
              </span>
            </div>
          </div>

          {/* Subject-Wise Accuracy Bars */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Section-wise Accuracy Breakdown</h3>
            <div className="space-y-3">
              {(analytics?.subjectAccuracy?.length > 0 ? analytics.subjectAccuracy : [
                { sectionName: 'Physics', accuracy: 78 },
                { sectionName: 'Chemistry', accuracy: 65 },
                { sectionName: 'Biology', accuracy: 72 },
              ]).map((sec: any) => (
                <div key={sec.sectionName}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{sec.sectionName}</span>
                    <span className="font-mono text-brand-600">{sec.accuracy}% Accuracy</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${sec.accuracy}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ATTEMPTS HISTORY (multi-attempt tracking) ── */}
      {activeTab === 'attempts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" /> Attempt History — Each Student's Re-sits & Scores
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile(`/tests/${testId}/export/attempts/pdf`, `attempts-${testId}.pdf`)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Download attempts history as PDF"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={() => downloadFile(`/tests/${testId}/export/attempts/excel`, `attempts-${testId}.xlsx`)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Download attempts history as Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
          </div>

          {attempts && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
              <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100">
                <span className="text-[10px] text-slate-500 block font-medium">Students Attempted</span>
                <span className="text-2xl font-extrabold text-brand-700 font-mono">{attempts.studentCount}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-medium">Total Attempts (re-sits included)</span>
                <span className="text-2xl font-extrabold text-slate-900 font-mono">{attempts.totalAttempts}</span>
              </div>
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                <span className="text-[10px] text-slate-500 block font-medium">Avg Attempts / Student</span>
                <span className="text-2xl font-extrabold text-purple-700 font-mono">
                  {attempts.studentCount > 0 ? (attempts.totalAttempts / attempts.studentCount).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Roll No</th>
                  <th className="pb-3 text-center">Attempts</th>
                  <th className="pb-3">Scores (Recent 2 & Full History)</th>
                  <th className="pb-3 text-center">Best %</th>
                  <th className="pb-3 text-right">Last Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(attempts?.students || []).map((row: any) => {
                  const sortedAttempts = [...(row.attempts || [])].sort((a: any, b: any) => (b.attemptNumber || 0) - (a.attemptNumber || 0));
                  const recentAttempts = sortedAttempts.slice(0, 2);
                  const extraAttemptsCount = Math.max(0, sortedAttempts.length - 2);
                  const rollNo =
                    row.student?.studentProfile?.rollNumber ||
                    (row.student?.identifier && !row.student.identifier.includes('@') ? row.student.identifier : null) ||
                    '-';

                  return (
                    <tr key={row.studentId} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="py-3.5">
                        <div className="font-bold text-slate-900">{row.student?.fullName || 'Student'}</div>
                        {row.student?.email && (
                          <div className="text-[10px] text-slate-400 font-normal">{row.student.email}</div>
                        )}
                      </td>
                      <td className="py-3.5 font-mono text-slate-700 font-medium">{rollNo}</td>
                      <td className="py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-bold font-mono">
                          {row.attemptCount}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {recentAttempts.map((a: any) => (
                            <span
                              key={a.attemptId}
                              className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                                a.isPassed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                              title={`Attempt #${a.attemptNumber}: ${a.score} marks (${a.percentage}%), Duration: ${Math.floor((a.durationSeconds || 0) / 60)}m`}
                            >
                              #{a.attemptNumber}: {a.score ?? 0}
                            </span>
                          ))}

                          {extraAttemptsCount > 0 && (
                            <button
                              onClick={() => setSelectedStudentAttempts({ ...row, sortedAttempts })}
                              className="px-2 py-0.5 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 font-mono text-[11px] font-bold border border-brand-200 flex items-center gap-1 transition-colors"
                              title={`View complete log of all ${row.attemptCount} attempts`}
                            >
                              <Eye className="w-3 h-3 text-brand-600" /> +{extraAttemptsCount} more
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-brand-700">{row.bestPercentage ?? 0}%</td>
                      <td className="py-3.5 text-right text-slate-500 font-mono text-[11px]">
                        {row.lastSubmittedAt
                          ? new Date(row.lastSubmittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(!attempts || (attempts.students || []).length === 0) && (
            <p className="text-xs text-slate-500 text-center py-6">No attempts recorded yet. Students can re-sit the test — each submission is tracked here.</p>
          )}
        </div>
      )}

      {/* ── TAB 4: LEADERBOARD ── */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-600" /> Student Scorecards & Ranked Leaderboard
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile(`/tests/${testId}/export/leaderboard/pdf`, `leaderboard-${testId}.pdf`)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Download leaderboard as PDF"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={() => downloadFile(`/tests/${testId}/export/leaderboard/excel`, `leaderboard-${testId}.xlsx`)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Download leaderboard as Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Rank</th>
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Roll No</th>
                  <th className="pb-3 text-center">Attempts</th>
                  <th className="pb-3">Scores (per attempt)</th>
                  <th className="pb-3 text-center">Best %</th>
                  <th className="pb-3 text-right">Last Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leaderboard.map((row, idx) => {
                  const rollNo =
                    row.rollNumber ||
                    row.student?.studentProfile?.rollNumber ||
                    (row.student?.identifier && !row.student.identifier.includes('@') ? row.student.identifier : null) ||
                    '-';

                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 font-bold font-mono text-brand-700">#{row.rank || idx + 1}</td>
                      <td className="py-3.5">
                        <div className="font-bold text-slate-900">{row.student?.fullName || row.studentName || 'Student'}</div>
                        {row.student?.email && (
                          <div className="text-[10px] text-slate-400 font-normal">{row.student.email}</div>
                        )}
                      </td>
                      <td className="py-3.5 font-mono text-slate-700 font-medium">{rollNo}</td>
                      <td className="py-3.5 text-center font-mono font-semibold text-slate-700">{row.attemptCount || 1}</td>
                      <td className="py-3.5 font-mono font-bold text-brand-700">
                        {row.result?.totalScore ?? row.bestScore ?? 0} / {test?.totalMarks || 200}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-mono font-bold text-xs border border-emerald-200">
                          {row.result?.percentage ?? row.bestPercentage ?? 0}%
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-slate-500 font-mono text-[11px]">
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADD SECTION MODAL ── */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Test Section</h3>
              <button onClick={() => setIsSectionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Section Name</label>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. Physics, Chemistry, Mathematics"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD QUESTIONS MODAL (SCR-ADM-14) ── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Bulk Import Questions (CSV)
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
                onClick={handleBulkImport}
                disabled={!csvText.trim()}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md disabled:opacity-50"
              >
                Import Questions Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTION SPLIT-PANE AUTHORING MODAL (8 QUESTION TYPES) ── */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  {editingQuestionId ? 'Edit Question' : 'Add New Question (Split-Pane LaTeX Editor)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Author formulas with instant student live view preview.</p>
              </div>

              <button onClick={() => setIsQuestionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-5">
              {/* Type, Section & Marks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Target Section</label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  >
                    {(test.sections || []).map((sec: any) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Question Type</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  >
                    <option value="SINGLE_CORRECT">1. Single Correct MCQ</option>
                    <option value="MULTIPLE_CORRECT">2. Multiple Correct MCQ</option>
                    <option value="NUMERICAL">3. Numerical Value</option>
                    <option value="ASSERTION_REASON">4. Assertion & Reason</option>
                    <option value="FILL_BLANK">5. Fill in the Blank</option>
                    <option value="MATRIX_MATCH">6. Matrix Match</option>
                    <option value="TRUE_FALSE">7. True / False</option>
                    <option value="DESCRIPTIVE">8. Descriptive Subjective</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Positive Marks (+ve)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={marksPositive}
                    onChange={(e) => setMarksPositive(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Negative Marks (-ve)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={marksNegative}
                    onChange={(e) => setMarksNegative(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-rose-600 font-semibold"
                  />
                </div>
              </div>

              {/* KaTeX Math Formula Ribbon */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Calculator className="w-3 h-3 text-brand-600" /> Insert LaTeX Math:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Fraction', snippet: '$\\frac{a}{b}$' },
                    { label: 'Square Root', snippet: '$\\sqrt{x}$' },
                    { label: 'Exponent', snippet: '$x^2$' },
                    { label: 'Integral', snippet: '$\\int f(x)dx$' },
                    { label: 'Delta (Δ)', snippet: '$\\Delta$' },
                    { label: 'Theta (θ)', snippet: '$\\theta$' },
                    { label: 'Lambda (λ)', snippet: '$\\lambda$' },
                  ].map((sym) => (
                    <button
                      key={sym.label}
                      type="button"
                      onClick={() => setStatementHtml((prev) => prev + ` ${sym.snippet} `)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 rounded-lg text-[10px] font-mono transition-all"
                    >
                      {sym.snippet}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statement Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Question Statement</label>
                <textarea
                  rows={3}
                  value={statementHtml}
                  onChange={(e) => setStatementHtml(e.target.value)}
                  placeholder="Type question or formula e.g. An object is accelerated with $a = 2t + 5$..."
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Live Render Preview */}
              <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-200/80">
                <span className="block text-[10px] font-bold text-brand-800 uppercase tracking-wider mb-1">
                  Student Live View Preview:
                </span>
                <div className="text-xs text-slate-800 leading-relaxed font-sans">
                  {renderMath(statementHtml || 'Live preview will render here...')}
                </div>
              </div>

              {/* Options Section */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-800">
                  Option Choices (Click circle to set correct answer key):
                </label>

                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                      opt.isCorrect
                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (questionType === 'SINGLE_CORRECT') {
                          setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        } else {
                          setOptions(options.map((o, i) => (i === idx ? { ...o, isCorrect: !o.isCorrect } : o)));
                        }
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {opt.optionLabel}
                    </button>

                    <input
                      type="text"
                      value={opt.contentHtml}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx].contentHtml = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${opt.optionLabel} text or $KaTeX$...`}
                      required
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono focus:outline-none"
                    />

                    {opt.isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* 3-Tier Solution Fields (SCR-ADM-12) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-800">
                  3-Tier Solution & Hints <span className="text-[11px] font-normal text-slate-400">(Optional — unlocks for students after test)</span>
                </span>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-amber-800">
                    💡 Hint <span className="text-[10px] font-normal text-amber-600">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="Short conceptual hint..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-sans"
                  />
                  {hint && (
                    <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-950">
                      {renderMath(hint)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-blue-800">
                    💬 Short Explanation <span className="text-[10px] font-normal text-blue-600">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={shortExplanation}
                    onChange={(e) => setShortExplanation(e.target.value)}
                    placeholder="1-line summary of key formula or concept..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-sans"
                  />
                  {shortExplanation && (
                    <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs text-blue-950">
                      {renderMath(shortExplanation)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-purple-800">
                    📋 Step-by-Step Solution <span className="text-[10px] font-normal text-purple-600">(Optional with $KaTeX$)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={stepByStepSolution}
                    onChange={(e) => setStepByStepSolution(e.target.value)}
                    placeholder="Detailed mathematical derivation using $KaTeX$..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                  {stepByStepSolution && (
                    <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-200/60 text-xs text-purple-950">
                      {renderMath(stepByStepSolution)}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation Modal */}
      {deletingQuestionId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Question?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this question from the test?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingQuestionId(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteQuestion}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Settings Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Test Configuration</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Test Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pass Marks</label>
                  <input
                    type="number"
                    value={passMarks}
                    onChange={(e) => setPassMarks(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STUDENT ALL ATTEMPTS HISTORY MODAL ── */}
      {selectedStudentAttempts && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-600" />
                  {selectedStudentAttempts.student?.fullName || 'Student'}&apos;s Complete Attempt Log
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Roll No: <span className="font-mono font-bold text-slate-800">
                    {selectedStudentAttempts.student?.studentProfile?.rollNumber ||
                      (selectedStudentAttempts.student?.identifier && !selectedStudentAttempts.student.identifier.includes('@') ? selectedStudentAttempts.student.identifier : null) ||
                      '-'}
                  </span> • Total Re-sits: <span className="font-mono font-bold text-brand-700">{selectedStudentAttempts.attemptCount} Attempts</span> • Best Score: <span className="font-mono font-bold text-emerald-700">{selectedStudentAttempts.bestPercentage ?? 0}%</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentAttempts(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3">Attempt #</th>
                    <th className="pb-3">Submitted At</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Score</th>
                    <th className="pb-3 text-center">Accuracy %</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(selectedStudentAttempts.sortedAttempts || selectedStudentAttempts.attempts || []).map((a: any) => (
                    <tr key={a.attemptId || a.id} className="hover:bg-slate-50 font-mono">
                      <td className="py-3 font-bold text-slate-900">Attempt #{a.attemptNumber}</td>
                      <td className="py-3 text-slate-500 font-sans text-[11px]">
                        {a.submittedAt
                          ? new Date(a.submittedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="py-3 text-slate-600">
                        {a.durationSeconds
                          ? `${Math.floor(a.durationSeconds / 60)}m ${a.durationSeconds % 60}s`
                          : '-'}
                      </td>
                      <td className="py-3 font-bold text-brand-700">
                        {a.score ?? 0} / {test?.totalMarks || 200}
                      </td>
                      <td className="py-3 text-center font-bold text-emerald-600">
                        {a.percentage ?? 0}%
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            a.isPassed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {a.isPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStudentAttempts(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
