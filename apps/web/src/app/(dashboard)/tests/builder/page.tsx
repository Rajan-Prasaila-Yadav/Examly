'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Plus,
  Trash2,
  FileText,
  Play,
  Award,
  Clock,
  ArrowRight,
  AlertTriangle,
  Edit2,
  Loader2,
  X,
} from 'lucide-react';

export default function SplitPaneQuestionBuilderPage() {
  const router = useRouter();
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

  const [tests, setTests] = useState<any[]>([]);

  // Edit Test State & Modal
  const [editingTest, setEditingTest] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState(120);
  const [editTotalMarks, setEditTotalMarks] = useState(200);
  const [editPassMarks, setEditPassMarks] = useState(80);
  const [editNegativeRate, setEditNegativeRate] = useState(1.0);
  const [editStartDateTime, setEditStartDateTime] = useState('');
  const [editEndDateTime, setEditEndDateTime] = useState('');
  const [editPublishAction, setEditPublishAction] = useState<'INSTANT' | 'SCHEDULED' | 'DRAFT'>('INSTANT');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Test Modal
  const [deletingTest, setDeletingTest] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatForDateTimeLocal = (dateString?: string | Date | null) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${mins}`;
    } catch {
      return '';
    }
  };

  const [isLoadingTests, setIsLoadingTests] = useState(true);

  const fetchTests = async () => {
    setIsLoadingTests(true);
    try {
      const res = await api.get('/tests');
      setTests(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTests(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleOpenEdit = (t: any) => {
    setEditingTest(t);
    setEditTitle(t.title || '');
    setEditDescription(t.description || '');
    setEditDuration(t.durationMinutes || 120);
    setEditTotalMarks(t.totalMarks || 200);
    setEditPassMarks(t.passMarks || 80);
    setEditNegativeRate(t.negativeMarkRate !== undefined ? t.negativeMarkRate : 1.0);
    setEditStartDateTime(formatForDateTimeLocal(t.startDateTime));
    setEditEndDateTime(formatForDateTimeLocal(t.endDateTime));
    setEditPublishAction(t.isPublished ? 'INSTANT' : t.testStatus === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    setIsSavingEdit(true);
    try {
      await api.put(`/tests/${editingTest.id}`, {
        title: editTitle,
        description: editDescription,
        durationMinutes: Number(editDuration),
        totalMarks: Number(editTotalMarks),
        passMarks: Number(editPassMarks),
        negativeMarkRate: Number(editNegativeRate),
        startDateTime: editStartDateTime ? new Date(editStartDateTime).toISOString() : undefined,
        endDateTime: editEndDateTime ? new Date(editEndDateTime).toISOString() : undefined,
        publishAction: editPublishAction,
      });
      setEditingTest(null);
      await fetchTests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update test details');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTest) return;
    setIsDeleting(true);
    try {
      await api.delete(`/tests/${deletingTest.id}`);
      setTests((prev) => prev.filter((item) => item.id !== deletingTest.id));
      setDeletingTest(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete test');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (testId: string) => {
    try {
      await api.post(`/tests/${testId}/publish`);
      fetchTests();
    } catch (e) {
      alert('Failed to toggle publish');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Test & Examination Engine</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            4-Step Wizard, Live Anti-Cheat Student Runner, Schedule Management, and Ranked Leaderboards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tests/create"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Test (4-Step Wizard)
          </Link>
        </div>
      </div>

      {/* Tests Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingTests ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="w-16 h-5 bg-slate-200 dark:bg-white/10 rounded-lg" />
                  <div className="w-20 h-5 bg-slate-200 dark:bg-white/10 rounded-lg" />
                </div>
                <div className="w-3/4 h-6 bg-slate-200 dark:bg-white/10 rounded-lg" />
                <div className="w-full h-4 bg-slate-100 dark:bg-white/5 rounded-lg" />
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                  <div className="h-4 bg-slate-100 dark:bg-white/5 rounded" />
                  <div className="h-4 bg-slate-100 dark:bg-white/5 rounded" />
                  <div className="h-4 bg-slate-100 dark:bg-white/5 rounded" />
                </div>
              </div>
            ))
          ) : tests.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#0c0e17] rounded-3xl border border-dashed border-slate-300 dark:border-white/15 p-8 text-center max-w-xl mx-auto my-4 w-full">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No mock tests created yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">Click "+ Create New Test (4-Step Wizard)" above to start.</p>
            </div>
          ) : (
            tests.map((t) => {
              const questionCount =
                t.sections?.reduce((sum: number, s: any) => sum + (s._count?.questions || s.questions?.length || 0), 0) || 0;
              const isLive = t.isPublished;

              return (
                <div
                  key={t.id}
                  className={`bg-white dark:bg-[#0c0e17] rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                    isLive
                      ? 'border-red-300 dark:border-red-500/40 ring-2 ring-red-500/20 bg-gradient-to-b from-red-50/20 dark:from-red-950/20 to-white dark:to-[#0c0e17] shadow-md'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-mono text-[11px] font-bold border border-brand-200/60 dark:border-brand-500/30">
                        {t.batch?.code || t.batch?.name || 'CEE-2083'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePublish(t.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all ${
                            isLive
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border-red-600 flex items-center gap-1.5 animate-pulse'
                              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                          }`}
                        >
                          {isLive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" /> 🔴 LIVE NOW
                            </>
                          ) : (
                            '○ Draft'
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(t)}
                          title="Edit Schedule & Settings"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.15] text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingTest({ id: t.id, title: t.title })}
                          title="Delete Test"
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <Link href={`/tests/${t.id}`}>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {t.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {t.description || 'Full timed mock exam with anti-cheat monitoring.'}
                    </p>

                    {/* Meta Chips */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span>{t.durationMinutes} Mins</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-accent-indigo shrink-0" />
                        <span>{t.totalMarks} Marks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className={questionCount === 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                          {questionCount} Qs
                        </span>
                      </div>
                    </div>

                    {/* Start & End Schedule Timings Strip */}
                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-[#141824] border border-slate-100 dark:border-white/10 rounded-2xl text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans text-[10px]">Start Date & Time:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {t.startDateTime
                            ? new Date(t.startDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Instant Live'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans text-[10px]">End Date & Time:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {t.endDateTime
                            ? new Date(t.endDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'No Expiry'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                    <Link
                      href={`/tests/${t.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all"
                    >
                      Details / Leaderboard
                    </Link>

                    <Link
                      href={`/tests/${t.id}/runner`}
                      className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all ${
                        isLive
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/25 animate-pulse'
                          : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/20'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> {isLive ? 'Take Live Exam' : 'Take Exam'}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

      {/* ── MODAL: EDIT TEST SETTINGS & SCHEDULE ── */}
      {editingTest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Test & Schedule</h3>
                <p className="text-xs text-slate-400">Update timing, marks, and publishing mode</p>
              </div>
              <button
                onClick={() => setEditingTest(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Test Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={editTotalMarks}
                    onChange={(e) => setEditTotalMarks(Number(e.target.value))}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pass Marks</label>
                  <input
                    type="number"
                    value={editPassMarks}
                    onChange={(e) => setEditPassMarks(Number(e.target.value))}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-emerald-600 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editStartDateTime}
                    onChange={(e) => setEditStartDateTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editEndDateTime}
                    onChange={(e) => setEditEndDateTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Publishing Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'INSTANT', label: 'Live Immediate' },
                    { id: 'SCHEDULED', label: 'Scheduled' },
                    { id: 'DRAFT', label: 'Draft Mode' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setEditPublishAction(mode.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        editPublishAction === mode.id
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTest(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE TEST CONFIRMATION ── */}
      {deletingTest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Test?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-800">"{deletingTest.title}"</strong>?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingTest(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
