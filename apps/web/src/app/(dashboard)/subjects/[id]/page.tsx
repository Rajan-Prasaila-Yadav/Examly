// apps/web/src/app/(dashboard)/subjects/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { DetailPageSkeleton } from '@/components/skeleton';
import { ReorderHandle } from '@/components/reorder-handle';
import { getYouTubeThumbnailUrl } from '@/lib/video-utils';
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Video,
  FileText,
  FolderTree,
  FileCheck2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Download,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Layers,
  Clock,
} from 'lucide-react';

export default function SubjectDetailPage() {
  const { user } = useAuth();
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' &&
      ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const [subject, setSubject] = useState<any>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lesson Modals
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonName, setLessonName] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [deletingLesson, setDeletingLesson] = useState<any>(null);

  // Drag state
  const [draggedLessonIdx, setDraggedLessonIdx] = useState<number | null>(null);

  const fetchSubjectDetail = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/subjects/${subjectId}`);
      setSubject(res.data);
    } catch (err) {
      console.error('Failed to fetch subject details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (subjectId) {
      fetchSubjectDetail();
    }
  }, [subjectId]);

  // Create / Update Lesson
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonName.trim()) return;

    try {
      if (editingLesson) {
        await api.put(`/lessons/${editingLesson.id}`, {
          name: lessonName.trim(),
          description: lessonDescription.trim() || undefined,
        });
        toast.success('Lesson Updated', `Saved "${lessonName}"`);
      } else {
        await api.post(`/lessons/subject/${subjectId}`, {
          name: lessonName.trim(),
          description: lessonDescription.trim() || undefined,
          sortOrder: (subject?.lessons || []).length,
        });
        toast.success('Lesson Created', `Added "${lessonName}" to ${subject?.name}`);
      }

      setIsLessonModalOpen(false);
      setEditingLesson(null);
      setLessonName('');
      setLessonDescription('');
      fetchSubjectDetail();
    } catch (err) {
      toast.error('Failed to save lesson');
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async () => {
    if (!deletingLesson) return;
    try {
      await api.delete(`/lessons/${deletingLesson.id}`);
      toast.success('Lesson Removed', `Removed "${deletingLesson.name}"`);
      setDeletingLesson(null);
      fetchSubjectDetail();
    } catch (err) {
      toast.error('Failed to delete lesson');
    }
  };

  // Reorder Lessons (Touch/Click)
  const moveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentLessons = [...(subject?.lessons || [])];
    if (targetIndex < 0 || targetIndex >= currentLessons.length) return;

    const [moved] = currentLessons.splice(index, 1);
    currentLessons.splice(targetIndex, 0, moved);
    setSubject((prev: any) => ({ ...prev, lessons: currentLessons }));

    try {
      await api.put('/lessons/reorder', { ids: currentLessons.map((l) => l.id) });
      toast.success('Lessons Reordered', 'Lesson sequence updated.');
    } catch (err) {
      fetchSubjectDetail();
    }
  };

  // Native Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `lesson:${index}`);
    setDraggedLessonIdx(index);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedLessonIdx === null || draggedLessonIdx === targetIndex) {
      setDraggedLessonIdx(null);
      return;
    }

    const currentLessons = [...(subject?.lessons || [])];
    const [moved] = currentLessons.splice(draggedLessonIdx, 1);
    currentLessons.splice(targetIndex, 0, moved);
    setSubject((prev: any) => ({ ...prev, lessons: currentLessons }));
    setDraggedLessonIdx(null);

    try {
      await api.put('/lessons/reorder', { ids: currentLessons.map((l) => l.id) });
      toast.success('Lessons Reordered', 'Lesson sequence updated.');
    } catch (err) {
      fetchSubjectDetail();
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!subject) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
        <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Subject Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This subject might have been moved or removed.</p>
        <Link href="/subjects" className="text-brand-600 text-xs font-semibold mt-4 inline-block hover:underline">
          ← Back to All Subjects
        </Link>
      </div>
    );
  }

  const lessons = subject.lessons || [];
  const totalVideos = lessons.reduce((sum: number, l: any) => sum + (l.videos?.length ?? l._count?.videos ?? 0), 0);
  const totalNotes = lessons.reduce((sum: number, l: any) => sum + (l.notes?.length ?? l._count?.notes ?? 0), 0);
  const totalResources = lessons.reduce((sum: number, l: any) => sum + (l.resources?.length ?? l._count?.resources ?? 0), 0);
  const totalTests = lessons.reduce((sum: number, l: any) => sum + (l.tests?.length ?? l._count?.tests ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/subjects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Subjects
          </Link>
          {subject.batch && (
            <>
              <span className="text-slate-300 text-xs">/</span>
              <Link
                href={`/batches/${subject.batch.id}`}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                {subject.batch.name}
              </Link>
            </>
          )}
        </div>

        {/* Subject Banner Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-brand-600/20 shrink-0">
                {subject.iconUrl ? (
                  <img src={subject.iconUrl} alt={subject.name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  subject.name[0]?.toUpperCase() || 'S'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {subject.batch && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-200">
                      {subject.batch.name} ({subject.batch.code})
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                    {lessons.length} {lessons.length === 1 ? 'Chapter' : 'Chapters'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {subject.name}
                </h1>
              </div>
            </div>

            {/* Quick Actions */}
            {!isStudent && (
              <button
                onClick={() => {
                  setEditingLesson(null);
                  setLessonName('');
                  setLessonDescription('');
                  setIsLessonModalOpen(true);
                }}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Add Chapter / Lesson
              </button>
            )}
          </div>

          {/* Overview Pillar Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-purple-700 font-semibold">Video Lectures</div>
                <div className="text-base font-extrabold text-purple-950 font-mono">{totalVideos}</div>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-emerald-700 font-semibold">Notes & DPPs</div>
                <div className="text-base font-extrabold text-emerald-950 font-mono">{totalNotes}</div>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-amber-700 font-semibold">Study Files</div>
                <div className="text-base font-extrabold text-amber-950 font-mono">{totalResources}</div>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-blue-700 font-semibold">Chapter Tests</div>
                <div className="text-base font-extrabold text-blue-950 font-mono">{totalTests}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters / Lessons Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-extrabold text-slate-900">Chapters & Lessons Curriculum</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold">
              {lessons.length}
            </span>
          </div>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No lessons created yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your first chapter to organize video lectures, notes, handouts, and chapter-level DPP tests.
            </p>
            {!isStudent && (
              <button
                onClick={() => {
                  setEditingLesson(null);
                  setLessonName('');
                  setLessonDescription('');
                  setIsLessonModalOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create First Lesson
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((ls: any, idx: number) => {
              const isDragging = draggedLessonIdx === idx;
              const isExpanded = expandedLessonId === ls.id;
              const vCount = ls.videos?.length ?? ls._count?.videos ?? 0;
              const nCount = ls.notes?.length ?? ls._count?.notes ?? 0;
              const rCount = ls.resources?.length ?? ls._count?.resources ?? 0;
              const tCount = ls.tests?.length ?? ls._count?.tests ?? 0;

              return (
                <div
                  key={ls.id}
                  draggable={!isStudent}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={() => setDraggedLessonIdx(null)}
                  className={`bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden ${
                    isExpanded ? 'border-brand-300 ring-2 ring-brand-100' : 'hover:border-brand-200'
                  } ${isDragging ? 'opacity-40 border-dashed border-brand-500 ring-2 ring-brand-400 scale-[0.99]' : ''}`}
                >
                  {/* Main Lesson Summary Row */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-brand-200/60">
                        {idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/lessons/${ls.id}`}
                          draggable={false}
                          className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors block truncate"
                        >
                          {ls.name}
                        </Link>
                        {ls.description ? (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{ls.description}</p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">Chapter curriculum & materials</p>
                        )}

                        {/* Content Pillars Badges */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100">
                            <Video className="w-3 h-3 text-purple-600" /> {vCount} Videos
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                            <FileText className="w-3 h-3 text-emerald-600" /> {nCount} Notes
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-100">
                            <FolderTree className="w-3 h-3 text-amber-600" /> {rCount} Files
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                            <FileCheck2 className="w-3 h-3 text-blue-600" /> {tCount} Tests
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-start">
                      {/* Expand / Close Preview Button */}
                      <button
                        onClick={() => setExpandedLessonId(isExpanded ? null : ls.id)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border shadow-sm ${
                          isExpanded
                            ? 'bg-brand-50 text-brand-700 border-brand-200 ring-2 ring-brand-200/50'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" /> Close Preview
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 text-brand-600" /> Preview ({vCount} Vids)
                          </>
                        )}
                      </button>

                      <Link
                        href={`/lessons/${ls.id}`}
                        draggable={false}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                      >
                        Open Lesson <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      {!isStudent && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              setEditingLesson(ls);
                              setLessonName(ls.name);
                              setLessonDescription(ls.description || '');
                              setIsLessonModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Edit Lesson"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingLesson(ls)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Expandable Content Drawer */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 border-t border-slate-200/80 p-5 space-y-4">
                      {/* Videos Section in Accordion */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-purple-600" />
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Video Lectures ({ls.videos?.length || 0})
                            </h4>
                          </div>
                          <Link
                            href={`/lessons/${ls.id}`}
                            className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1"
                          >
                            Full Chapter Hub →
                          </Link>
                        </div>

                        {ls.videos && ls.videos.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {ls.videos.map((v: any) => {
                              const thumb = getYouTubeThumbnailUrl(v.videoUrl);
                              return (
                                <Link
                                  key={v.id}
                                  href={`/lessons/${ls.id}/videos/${v.id}`}
                                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition-all block group"
                                >
                                  <div className="h-28 bg-slate-950 relative overflow-hidden">
                                    <img
                                      src={thumb}
                                      alt={v.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                      <div className="w-8 h-8 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                                      </div>
                                    </div>
                                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-mono">
                                      {Math.floor((v.durationSeconds || 2700) / 60)} mins
                                    </span>
                                  </div>
                                  <div className="p-3">
                                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 leading-snug break-words">
                                      {v.title}
                                    </h5>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 bg-white rounded-xl p-4 border border-dashed border-slate-200 text-center">
                            No videos added to this lesson yet.
                          </p>
                        )}
                      </div>

                      {/* Notes & Tests Quick Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                        {/* Notes */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Notes & DPPs ({ls.notes?.length || 0})</span>
                          </div>
                          {ls.notes && ls.notes.length > 0 ? (
                            <div className="space-y-1.5">
                              {ls.notes.slice(0, 3).map((n: any) => (
                                <div key={n.id} className="flex items-center justify-between text-xs p-2 bg-emerald-50/50 rounded-xl">
                                  <span className="font-semibold text-slate-800 truncate pr-2">{n.title}</span>
                                  <a
                                    href={n.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 shrink-0"
                                  >
                                    <Download className="w-3 h-3" /> PDF
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">No notes uploaded yet.</p>
                          )}
                        </div>

                        {/* Tests */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
                            <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Chapter Tests ({ls.tests?.length || 0})</span>
                          </div>
                          {ls.tests && ls.tests.length > 0 ? (
                            <div className="space-y-1.5">
                              {ls.tests.slice(0, 3).map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between text-xs p-2 bg-blue-50/50 rounded-xl">
                                  <span className="font-semibold text-slate-800 truncate pr-2">{t.title}</span>
                                  <Link
                                    href={`/tests/${t.id}`}
                                    className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 shrink-0"
                                  >
                                    Start →
                                  </Link>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">No chapter quizzes attached yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
              </h3>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lesson Name</label>
                <input
                  type="text"
                  placeholder="e.g. Thermodynamics & Heat Transfer"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Brief overview of what this chapter covers..."
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all"
                >
                  {editingLesson ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Lesson?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong className="text-slate-800">"{deletingLesson.name}"</strong>?
                Attached videos, notes, and resources will be hidden.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingLesson(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLesson}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
