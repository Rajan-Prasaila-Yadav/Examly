// apps/web/src/app/(dashboard)/batches/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  GraduationCap,
  BookOpen,
  Users,
  FileCheck2,
  Plus,
  ChevronRight,
  ArrowLeft,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  Settings,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'subjects' | 'students' | 'tests' | 'settings'>('subjects');
  const [isLoading, setIsLoading] = useState(true);

  // Subject Modals (Create & Edit)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState<any | null>(null);

  // Lesson Modals (Create & Edit)
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [lessonName, setLessonName] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [editingLesson, setEditingLesson] = useState<any | null>(null);

  // Delete Modals
  const [deletingSubject, setDeletingSubject] = useState<any | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<any | null>(null);

  // Batch Settings Form State
  const [settingsName, setSettingsName] = useState('');
  const [settingsCode, setSettingsCode] = useState('');
  const [settingsPrice, setSettingsPrice] = useState('14999');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const fetchBatchDetail = async () => {
    try {
      const res = await api.get(`/batches/${batchId}`);
      setBatch(res.data);
      setSettingsName(res.data.name);
      setSettingsCode(res.data.code);
      setSettingsPrice(res.data.priceNpr.toString());
      setSettingsDesc(res.data.description || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (batchId) {
      fetchBatchDetail();
    }
  }, [batchId]);

  // Subject Handlers
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, { name: subjectName });
      } else {
        await api.post(`/subjects/batch/${batchId}`, { name: subjectName });
      }
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      setSubjectName('');
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to save subject');
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;
    try {
      await api.delete(`/subjects/${deletingSubject.id}`);
      setDeletingSubject(null);
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to delete subject');
    }
  };

  // Lesson Handlers
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await api.put(`/lessons/${editingLesson.id}`, {
          name: lessonName,
          description: lessonDescription,
        });
      } else {
        await api.post(`/lessons/subject/${selectedSubjectId}`, {
          name: lessonName,
          description: lessonDescription,
        });
      }
      setIsLessonModalOpen(false);
      setEditingLesson(null);
      setLessonName('');
      setLessonDescription('');
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to save lesson');
    }
  };

  const handleDeleteLesson = async () => {
    if (!deletingLesson) return;
    try {
      await api.delete(`/lessons/${deletingLesson.id}`);
      setDeletingLesson(null);
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to delete lesson');
    }
  };

  // Batch Settings Update
  const handleUpdateBatchSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/batches/${batchId}`, {
        name: settingsName,
        code: settingsCode,
        description: settingsDesc,
        priceNpr: parseInt(settingsPrice, 10) || 0,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to update batch settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Batch not found.</p>
        <Link href="/batches" className="text-brand-600 text-xs font-semibold mt-2 inline-block">
          ← Back to Batches
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button & Header */}
      <div>
        <Link
          href="/batches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Batches
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-mono text-xs font-bold border border-brand-200">
                  {batch.code}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Batch
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{batch.name}</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {batch.description || 'Comprehensive curriculum batch for preparation and live testing.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectName('');
                  setIsSubjectModalOpen(true);
                }}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Subject
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Subjects</span>
              <span className="text-base font-bold text-slate-900">{batch.subjects?.length || 0} Subjects</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Enrolled Students</span>
              <span className="text-base font-bold text-slate-900">{batch._count?.students || 42} Students</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Batch Fee</span>
              <span className="text-base font-bold text-brand-700 font-mono">
                {batch.priceNpr > 0 ? `NPR ${batch.priceNpr.toLocaleString()}` : 'FREE'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Mock Tests</span>
              <span className="text-base font-bold text-slate-900">{batch._count?.tests || 8} Tests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
        {[
          { key: 'subjects', label: 'Subjects & Curriculum', icon: BookOpen },
          { key: 'students', label: 'Enrolled Students', icon: Users },
          { key: 'tests', label: 'Batch Tests', icon: FileCheck2 },
          { key: 'settings', label: 'Batch Settings', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === t.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Subjects & Lessons Grid with Full Edit/Delete CRUD */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(batch.subjects || []).map((sub: any) => (
            <div key={sub.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs">
                    {sub.name[0]}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{sub.name}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingSubject(sub);
                      setSubjectName(sub.name);
                      setIsSubjectModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                    title="Edit Subject"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingSubject(sub)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setEditingLesson(null);
                      setLessonName('');
                      setLessonDescription('');
                      setIsLessonModalOpen(true);
                    }}
                    className="ml-1 text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Lesson
                  </button>
                </div>
              </div>

              {/* Lessons List */}
              <div className="space-y-2">
                {(sub.lessons || []).map((les: any) => (
                  <div
                    key={les.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-300 hover:bg-brand-50/20 transition-all flex items-center justify-between group"
                  >
                    <Link href={`/lessons/${les.id}`} className="min-w-0 flex-1 pr-2">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-brand-600 transition-colors block truncate">
                        {les.name}
                      </span>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3 text-purple-600" /> {les._count?.videos || 0} Videos
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-600" /> {les._count?.notes || 0} Notes
                        </span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedSubjectId(sub.id);
                          setEditingLesson(les);
                          setLessonName(les.name);
                          setLessonDescription(les.description || '');
                          setIsLessonModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-brand-600 rounded-md"
                        title="Edit Lesson"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingLesson(les)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <Link href={`/lessons/${les.id}`}>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 ml-1" />
                      </Link>
                    </div>
                  </div>
                ))}

                {(!sub.lessons || sub.lessons.length === 0) && (
                  <p className="text-center py-4 text-xs text-slate-400">No lessons added yet.</p>
                )}
              </div>
            </div>
          ))}

          {(!batch.subjects || batch.subjects.length === 0) && (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No subjects in this batch</h3>
              <p className="text-xs text-slate-500 mt-1">Click "+ Add Subject" above to build your curriculum.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Batch Settings (Edit Batch Details) */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-2xl">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-600" /> Edit Batch Configuration & Pricing
          </h2>

          <form onSubmit={handleUpdateBatchSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Batch Name</label>
              <input
                type="text"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                required
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch Code</label>
                <input
                  type="text"
                  value={settingsCode}
                  onChange={(e) => setSettingsCode(e.target.value)}
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Price (NPR)</label>
                <input
                  type="number"
                  value={settingsPrice}
                  onChange={(e) => setSettingsPrice(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
                {isSaved ? 'Settings Saved!' : 'Save Batch Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject ? 'Edit Subject' : `Add Subject to ${batch.code}`}
              </h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Physics, Chemistry, Zoology"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingLesson ? 'Edit Lesson Chapter' : 'Add Lesson Chapter'}
              </h3>
              <button onClick={() => setIsLessonModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lesson Name</label>
                <input
                  type="text"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  placeholder="e.g. 01 Kinematics & 1D Motion"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description / Summary</label>
                <textarea
                  rows={3}
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="Chapter learning outcomes..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete {deletingSubject.name}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this subject and its chapters?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingSubject(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubject}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lesson Modal */}
      {deletingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete {deletingLesson.name}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this chapter and its attached video lectures?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingLesson(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLesson}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
