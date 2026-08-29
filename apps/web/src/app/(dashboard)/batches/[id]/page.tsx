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
  const [activeTab, setActiveTab] = useState<'subjects' | 'students' | 'tests' | 'teachers' | 'settings'>('subjects');
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
  const [settingsPrice, setSettingsPrice] = useState('0');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsStartDate, setSettingsStartDate] = useState('');
  const [settingsEndDate, setSettingsEndDate] = useState('');
  const [settingsStatus, setSettingsStatus] = useState('ACTIVE');
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Students & Enrollment
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Teachers & Tests
  const [teachers, setTeachers] = useState<any[]>([]);
  const [batchTests, setBatchTests] = useState<any[]>([]);

  const fetchBatchDetail = async () => {
    try {
      const [batchRes, studentsRes, teachersRes, testsRes] = await Promise.all([
        api.get(`/batches/${batchId}`),
        api.get(`/batches/${batchId}/students`).catch(() => ({ data: [] })),
        api.get(`/batches/${batchId}/teachers`).catch(() => ({ data: [] })),
        api.get(`/batches/${batchId}/tests`).catch(() => ({ data: [] })),
      ]);

      setBatch(batchRes.data);
      setSettingsName(batchRes.data.name || '');
      setSettingsCode(batchRes.data.code || '');
      setSettingsPrice(batchRes.data.priceNpr?.toString() || '0');
      setSettingsDesc(batchRes.data.description || '');
      setSettingsStatus(batchRes.data.status || 'ACTIVE');
      if (batchRes.data.startDate) {
        setSettingsStartDate(new Date(batchRes.data.startDate).toISOString().slice(0, 10));
      }
      if (batchRes.data.endDate) {
        setSettingsEndDate(new Date(batchRes.data.endDate).toISOString().slice(0, 10));
      }

      setStudents(studentsRes.data || []);
      setTeachers(teachersRes.data || []);
      setBatchTests(testsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openEnrollModal = async () => {
    try {
      const res = await api.get('/users/students');
      // Filter students not already in this batch
      const available = (res.data || []).filter(
        (s: any) => s.studentProfile?.batchId !== batchId
      );
      setAllStudents(available);
      setSelectedStudentIds([]);
      setIsEnrollModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnrollStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsEnrolling(true);
    try {
      await api.post(`/batches/${batchId}/students`, {
        studentIds: selectedStudentIds,
      });
      setIsEnrollModalOpen(false);
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to enroll students');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRemoveStudent = async (studentUserId: string) => {
    if (!confirm('Remove this student from the batch?')) return;
    try {
      await api.delete(`/batches/${batchId}/students/${studentUserId}`);
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to remove student');
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
        startDate: settingsStartDate || null,
        endDate: settingsEndDate || null,
        status: settingsStatus,
      });
      setIsSaved(true);
      setIsEditBatchModalOpen(false);
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
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {batch.status || 'ACTIVE'}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{batch.name}</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {batch.description || 'Comprehensive curriculum batch for academic learning and live examination.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditBatchModalOpen(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Batch
              </button>
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
              <span className="text-base font-bold text-slate-900">{students.length} Students</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Batch Fee</span>
              <span className="text-base font-bold text-brand-700 font-mono">
                {batch.priceNpr > 0 ? `NPR ${batch.priceNpr.toLocaleString()}` : 'FREE'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Batch Tests</span>
              <span className="text-base font-bold text-slate-900">{batchTests.length} Tests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
        {[
          { key: 'subjects', label: 'Subjects & Lessons', icon: BookOpen, count: batch.subjects?.length || 0 },
          { key: 'students', label: 'Enrolled Students', icon: Users, count: students.length },
          { key: 'tests', label: 'Batch & Chapter Tests', icon: FileCheck2, count: batchTests.length },
          { key: 'teachers', label: 'Assigned Teachers', icon: GraduationCap, count: teachers.length },
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
              {t.count !== undefined && (
                <span className="px-1.5 py-0.2 bg-slate-100 text-[10px] rounded-full text-slate-600 font-mono">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Subjects & Lessons Grid */}
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

      {/* Tab 2: Enrolled Students */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Enrolled Student Roster ({students.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Students with active access to batch materials and exams.</p>
            </div>
            <button
              onClick={openEnrollModal}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Enroll Students
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Roll No</th>
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3">Email & Phone</th>
                  <th className="pb-3 text-center">Tests Taken</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-brand-700">
                      {st.studentProfile?.rollNumber || (st.identifier && !st.identifier.includes('@') ? st.identifier : null) || '-'}
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                        {st.fullName}
                    </td>
                    <td className="py-3 text-slate-500">
                      <div>{st.email || '-'}</div>
                      <div className="font-mono text-[10px] text-slate-400">{st.phone || '-'}</div>
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-slate-800">
                      {st._count?.testAttempts || 0}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleRemoveStudent(st.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove from batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {students.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No students enrolled in this batch yet. Click &quot;Enroll Students&quot; to assign students.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Batch Tests */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Batch Live Exams & Chapter Tests ({batchTests.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Examinations scheduled or active for students in this batch.</p>
            </div>
            <Link
              href={`/tests/create?batchId=${batchId}`}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create Batch Test
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchTests.map((t) => (
              <div key={t.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-brand-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                      {t.testType || 'BATCH_LEVEL'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      t.testStatus === 'LIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.testStatus}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{t.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                    <span>⏳ {t.durationMinutes}m</span>
                    <span>🎯 {t.totalMarks} Marks</span>
                    <span>📝 {t._count?.sections || 0} Sections</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <Link
                    href={`/tests/${t.id}`}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    View Details & Leaderboard <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {batchTests.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-400 text-xs">
                No mock tests created for this batch yet. Click &quot;Create Batch Test&quot; above to schedule one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Assigned Faculty Teachers */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Assigned Faculty Teachers ({teachers.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Faculty members teaching subjects and mentoring students.</p>
            </div>
            <Link
              href="/teachers"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Faculty Directory
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {teachers.map((tc) => (
              <div key={tc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-sm shadow-sm">
                  {tc.fullName ? tc.fullName[0] : 'T'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{tc.fullName}</h4>
                  <p className="text-[11px] text-purple-700 font-semibold">{tc.teacherProfile?.designation || 'Faculty Member'}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{tc.email}</p>
                </div>
              </div>
            ))}

            {teachers.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-400 text-xs">
                No faculty members assigned yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Batch Settings Form */}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={settingsStartDate}
                  onChange={(e) => setSettingsStartDate(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={settingsEndDate}
                  onChange={(e) => setSettingsEndDate(e.target.value)}
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

      {/* ── ENROLL STUDENTS MODAL ── */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" /> Enroll Students into {batch.name}
              </h3>
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select students from the institute directory to assign to this batch:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2">
              {allStudents.map((st) => {
                const isSelected = selectedStudentIds.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-50 border-brand-300 text-brand-900'
                        : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds((prev) => [...prev, st.id]);
                          } else {
                            setSelectedStudentIds((prev) => prev.filter((id) => id !== st.id));
                          }
                        }}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <div className="font-bold text-xs">{st.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {st.studentProfile?.rollNumber || st.identifier || '-'} • {st.email || st.phone}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}

              {allStudents.length === 0 && (
                <p className="text-center py-6 text-xs text-slate-400">All institute students are already enrolled!</p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollStudents}
                disabled={selectedStudentIds.length === 0 || isEnrolling}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md"
              >
                {isEnrolling ? 'Enrolling...' : `Enroll Selected (${selectedStudentIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT BATCH DETAILS MODAL ── */}
      {isEditBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Batch Details</h3>
              <button onClick={() => setIsEditBatchModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBatchSettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch Name</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Price (NPR)</label>
                  <input
                    type="number"
                    value={settingsPrice}
                    onChange={(e) => setSettingsPrice(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditBatchModalOpen(false)}
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

      {/* Delete Subject Confirmation */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Subject?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-800">{deletingSubject.name}</span>? All lessons and materials inside it will be removed.
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
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20"
              >
                Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lesson Confirmation */}
      {deletingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Lesson Chapter?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-800">{deletingLesson.name}</span>?
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
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20"
              >
                Delete Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
