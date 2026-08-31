// apps/web/src/app/(dashboard)/tests/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { CardGridSkeleton } from '@/components/skeleton';
import {
  FileCheck2,
  Plus,
  Play,
  Clock,
  Award,
  Sparkles,
  Search,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  BarChart3,
  X,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { ReorderHandle } from '@/components/reorder-handle';

export default function TestsPortalPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' &&
      ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'DRAFT' | 'ENDED' | 'PRACTICE'>('ALL');

  // Edit Test Modal
  const [editingTest, setEditingTest] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState(120);
  const [editTotalMarks, setEditTotalMarks] = useState(200);
  const [editPassMarks, setEditPassMarks] = useState(80);
  const [editType, setEditType] = useState('MOCK');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation Modal
  const [deletingTest, setDeletingTest] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTests = async () => {
    try {
      const res = await api.get('/tests');
      setTests(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const isTestEnded = (t: any) => {
    if (t.testStatus === 'EXPIRED' || t.testStatus === 'ENDED' || t.testStatus === 'COMPLETED') {
      return true;
    }
    if (t.endDateTime && new Date(t.endDateTime).getTime() < Date.now()) {
      return true;
    }
    return false;
  };

  const isTestDraft = (t: any) => {
    return t.testStatus === 'DRAFT' || !t.isPublished;
  };

  const isTestLive = (t: any) => {
    return (
      (t.testStatus === 'LIVE' || t.isPublished) &&
      !isTestEnded(t) &&
      !isTestDraft(t)
    );
  };

  // Counts
  const countAll = tests.length;
  const countLive = tests.filter(isTestLive).length;
  const countDraft = tests.filter(isTestDraft).length;
  const countEnded = tests.filter(isTestEnded).length;
  const countPractice = tests.filter((t) => t.testType === 'PRACTICE').length;

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.batch?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.batch?.code || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'LIVE') return isTestLive(t);
    if (filter === 'DRAFT') return isTestDraft(t);
    if (filter === 'ENDED') return isTestEnded(t);
    if (filter === 'PRACTICE') return t.testType === 'PRACTICE';
    return true;
  });

  // Toggle Publish Status
  const handleTogglePublish = async (testId: string, currentPublished: boolean) => {
    const nextPublished = !currentPublished;
    setTests((prev) =>
      prev.map((t) =>
        t.id === testId
          ? {
              ...t,
              isPublished: nextPublished,
              testStatus: nextPublished ? 'LIVE' : 'DRAFT',
            }
          : t,
      ),
    );
    try {
      await api.post(`/tests/${testId}/publish`);
      api.invalidateCache('/tests');
      toast.success(
        nextPublished ? 'Test Published Live!' : 'Test Moved to Drafts',
        nextPublished ? 'Students can now take this examination.' : 'Hidden from students until republished.',
      );
    } catch (e) {
      toast.error('Failed to update publish status');
      fetchTests();
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (t: any) => {
    setEditingTest(t);
    setEditTitle(t.title);
    setEditDuration(t.durationMinutes || 120);
    setEditTotalMarks(t.totalMarks || 200);
    setEditPassMarks(t.passMarks || 80);
    setEditType(t.testType || 'MOCK');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;

    setIsSavingEdit(true);
    toast.loading('Updating test...', `Saving ${editTitle}`);
    try {
      await api.put(`/tests/${editingTest.id}`, {
        title: editTitle,
        durationMinutes: Number(editDuration),
        totalMarks: Number(editTotalMarks),
        passMarks: Number(editPassMarks),
        testType: editType,
      });

      setTests((prev) =>
        prev.map((t) =>
          t.id === editingTest.id
            ? {
                ...t,
                title: editTitle,
                durationMinutes: Number(editDuration),
                totalMarks: Number(editTotalMarks),
                passMarks: Number(editPassMarks),
                testType: editType,
              }
            : t,
        ),
      );

      setEditingTest(null);
      api.invalidateCache('/tests');
      toast.success('Test Updated!', `${editTitle} updated successfully.`);
    } catch (e) {
      toast.error('Failed to update test');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Test
  const handleConfirmDelete = async () => {
    if (!deletingTest) return;
    const testTitle = deletingTest.title;
    setIsDeleting(true);
    toast.loading('Deleting test...', `Removing ${testTitle}`);
    try {
      setTests((prev) => prev.filter((t) => t.id !== deletingTest.id));
      await api.delete(`/tests/${deletingTest.id}`);
      setDeletingTest(null);
      api.invalidateCache('/tests');
      toast.success('Test Deleted', `${testTitle} was removed.`);
    } catch (e) {
      toast.error('Failed to delete test');
      fetchTests();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {isStudent ? 'My Mock Examinations & Practice Tests' : 'Examination & Test Suite'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStudent
              ? 'Attempt scheduled batch mock papers, past-year drills, and timed evaluations.'
              : 'Author questions with KaTeX, manage schedules, review drafts, and track leaderboards.'}
          </p>
        </div>

        {!isStudent && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/tests/create"
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Test
            </Link>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {/* Horizontal scrollable tab filters */}
        <div className="overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 sm:gap-2 w-max">
            {[
              { key: 'ALL', label: 'All Tests', count: countAll },
              { key: 'LIVE', label: '🔴 Live Exams', count: countLive },
              ...(!isStudent ? [{ key: 'DRAFT', label: '📝 Drafts', count: countDraft }] : []),
              { key: 'ENDED', label: '⏱️ Ended / Closed', count: countEnded },
              { key: 'PRACTICE', label: '📚 Practice', count: countPractice },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  filter === f.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tests or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Tests Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((t) => {
          const ended = isTestEnded(t);
          const draft = isTestDraft(t);
          const live = isTestLive(t);

          return (
            <div
              key={t.id}
              className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                ended
                  ? 'border-slate-200 bg-slate-50/40 opacity-95'
                  : draft
                  ? 'border-amber-200 bg-amber-50/20'
                  : live
                  ? 'border-red-300 ring-2 ring-red-500/20 bg-gradient-to-b from-red-50/20 to-white shadow-md'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge Strip */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 font-mono text-[11px] font-bold border border-brand-200/60 truncate max-w-[150px]">
                      {t.batch?.name || 'General Batch'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {ended ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> EXAM ENDED
                      </span>
                    ) : draft ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        ○ DRAFT
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-600 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" /> 🔴 LIVE NOW
                      </span>
                    )}

                    {/* Admin / Faculty Quick Actions */}
                    {!isStudent && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <button
                          onClick={() => handleTogglePublish(t.id, t.isPublished)}
                          className={`p-1 rounded-md transition-colors ${
                            t.isPublished
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                          title={t.isPublished ? 'Unpublish to Draft' : 'Publish Live'}
                        >
                          {t.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                          title="Edit Test Settings"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTest(t)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Test"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Link href={`/tests/${t.id}`} className="block">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                    {t.title}
                  </h3>
                </Link>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {t.description || 'Full-length mock exam with real-time scoring and anti-cheat surveillance.'}
                </p>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">{t.durationMinutes}m</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Marks</span>
                    <span className="font-bold text-brand-700 font-mono text-[11px]">{t.totalMarks}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Pass Mark</span>
                    <span className="font-bold text-emerald-600 font-mono text-[11px]">{t.passMarks}</span>
                  </div>
                </div>

                {/* Start & End Schedule Timings Strip */}
                <div className="pt-2 text-[11px] font-mono text-slate-500 space-y-1 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">Start Date & Time:</span>
                    <span className="font-semibold text-slate-700">
                      {t.startDateTime
                        ? new Date(t.startDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Instant Live'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">End Date & Time:</span>
                    <span className="font-semibold text-slate-700">
                      {t.endDateTime
                        ? new Date(t.endDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'No Expiry'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/tests/${t.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  View Details
                </Link>

                {/* Exam Action Button Logic */}
                {ended ? (
                  isStudent ? (
                    t.attempts && t.attempts.length > 0 ? (
                      <Link
                        href={`/tests/${t.id}/runner?view=RESULT`}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-brand-600" /> View Result
                      </Link>
                    ) : (
                      <span
                        className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-not-allowed"
                        title="You did not attempt this examination while it was open."
                      >
                        <Lock className="w-3.5 h-3.5" /> Exam Ended
                      </span>
                    )
                  ) : (
                    <Link
                      href={`/tests/${t.id}`}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-purple-600" /> Leaderboard
                    </Link>
                  )
                ) : draft ? (
                  isStudent ? (
                    <span className="px-3.5 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl flex items-center gap-1 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5" /> Upcoming
                    </span>
                  ) : (
                    <button
                      onClick={() => handleTogglePublish(t.id, false)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Publish Live
                    </button>
                  )
                ) : (
                  <Link
                    href={`/tests/${t.id}/runner`}
                    className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
                      live
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/25 animate-pulse'
                        : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/20'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> {live ? 'Take Live Exam' : 'Start Test'}
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {filteredTests.length === 0 && !isLoading && (
          <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
            <FileCheck2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No tests in &quot;{filter}&quot; tab</h3>
            <p className="text-xs text-slate-500 mt-1">
              {filter === 'DRAFT'
                ? 'You do not have any draft tests currently. All tests are published.'
                : filter === 'ENDED'
                ? 'No expired or closed examinations.'
                : 'Examinations and chapter drills will appear here once assigned.'}
            </p>
          </div>
        )}
      </div>
      )}

      {/* ── MODAL 1: EDIT TEST SETTINGS ── */}
      {editingTest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Test Details</h3>
              <button
                onClick={() => setEditingTest(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Test Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Minutes) *</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Test Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="MOCK">Mock Examination</option>
                    <option value="PRACTICE">Practice Paper</option>
                    <option value="CHAPTER">Chapter Drill</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Marks *</label>
                  <input
                    type="number"
                    required
                    value={editTotalMarks}
                    onChange={(e) => setEditTotalMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passing Marks *</label>
                  <input
                    type="number"
                    required
                    value={editPassMarks}
                    onChange={(e) => setEditPassMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTest(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DELETE CONFIRMATION ── */}
      {deletingTest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Examination?</h3>
                <p className="text-xs text-slate-500">This action will permanently delete this test.</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {deletingTest.title}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTest(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
