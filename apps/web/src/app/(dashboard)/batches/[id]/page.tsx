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
  Search,
  LayoutGrid,
  List,
  Phone,
  Mail,
  MapPin,
  Camera,
  UserX,
  ArrowRight,
  ShieldCheck,
  Lock,
import { useAuth } from '@/lib/auth-context';
import { DetailPageSkeleton } from '@/components/skeleton';

const batchDetailCache = new Map<string, any>();

export default function BatchDetailPage() {
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const cachedData = batchId ? batchDetailCache.get(batchId) : null;

  const [batch, setBatch] = useState<any>(cachedData?.batch || null);
  const [allBatches, setAllBatches] = useState<any[]>(cachedData?.allBatches || []);
  const [activeTab, setActiveTab] = useState<'subjects' | 'students' | 'tests' | 'teachers' | 'settings'>('subjects');
  const [isLoading, setIsLoading] = useState(!cachedData);

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

  // Students Tab State (SCR-ADM-18 / Rich Students Roster)
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentViewMode, setStudentViewMode] = useState<'grid' | 'list'>('grid');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Student Edit / Assign / Delete Modals in Batch Detail
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editStudentFullName, setEditStudentFullName] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentRollNumber, setEditStudentRollNumber] = useState('');
  const [editStudentBatchId, setEditStudentBatchId] = useState('');
  const [editStudentProvince, setEditStudentProvince] = useState('Bagmati');
  const [editStudentDistrict, setEditStudentDistrict] = useState('Kathmandu');
  const [editStudentMunicipality, setEditStudentMunicipality] = useState('Kathmandu Metropolitan City');
  const [editStudentWardNumber, setEditStudentWardNumber] = useState('04');
  const [editStudentParentPhone, setEditStudentParentPhone] = useState('');
  const [editStudentAvatarUrl, setEditStudentAvatarUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [assigningStudent, setAssigningStudent] = useState<any | null>(null);
  const [targetBatchId, setTargetBatchId] = useState('');

  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);

  // Faculty Teachers Tab State (Rich Parity with /teachers)
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherViewMode, setTeacherViewMode] = useState<'list' | 'grid'>('list'); // Default to list view as requested
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [editTeacherFullName, setEditTeacherFullName] = useState('');
  const [editTeacherEmail, setEditTeacherEmail] = useState('');
  const [editTeacherPhone, setEditTeacherPhone] = useState('');
  const [editTeacherFacultyCode, setEditTeacherFacultyCode] = useState('');
  const [editTeacherDesignation, setEditTeacherDesignation] = useState('Senior Faculty');
  const [editTeacherSpecialization, setEditTeacherSpecialization] = useState('Physics');
  const [editTeacherAvatarUrl, setEditTeacherAvatarUrl] = useState('');
  const [deletingTeacher, setDeletingTeacher] = useState<any | null>(null);

  // Tests
  const [batchTests, setBatchTests] = useState<any[]>([]);

  const fetchBatchDetail = async () => {
    try {
      const [batchRes, studentsRes, teachersRes, testsRes, allBatchesRes, allTeachersRes] = await Promise.all([
        api.get(`/batches/${batchId}`),
        api.get(`/batches/${batchId}/students`).catch(() => ({ data: [] })),
        api.get(`/batches/${batchId}/teachers`).catch(() => ({ data: [] })),
        api.get(`/batches/${batchId}/tests`).catch(() => ({ data: [] })),
        api.get('/batches').catch(() => ({ data: [] })),
        api.get('/users/teachers').catch(() => ({ data: [] })),
      ]);

      const fetchedStudents = (studentsRes.data && studentsRes.data.length > 0)
        ? studentsRes.data
        : (batchRes.data?.students || []).map((s: any) => s.user ? { ...s.user, studentProfile: s } : s);

      const fetchedTeachers = (teachersRes.data && teachersRes.data.length > 0)
        ? teachersRes.data
        : (allTeachersRes.data || []);

      const fetchedTests = (testsRes.data && testsRes.data.length > 0)
        ? testsRes.data
        : (batchRes.data?.tests || []);

      batchDetailCache.set(batchId, {
        batch: batchRes.data,
        students: fetchedStudents,
        teachers: fetchedTeachers,
        tests: fetchedTests,
        allBatches: allBatchesRes.data || [],
      });

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

      setStudents(fetchedStudents);
      setTeachers(fetchedTeachers);
      setBatchTests(fetchedTests);
      setAllBatches(allBatchesRes.data || []);
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

  const generateFacultyCode = () => `TCH-${Math.floor(100 + Math.random() * 900)}`;

  const openEnrollModal = async () => {
    try {
      const res = await api.get('/users/students');
      // Filter students not already in this batch
      const available = (res.data || []).filter(
        (s: any) => s.studentProfile?.batchId !== batchId,
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

  // Instant optimistic unassign from batch
  const handleUnassignStudent = async (studentUserId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentUserId));
    try {
      await api.delete(`/batches/${batchId}/students/${studentUserId}`);
    } catch (e) {
      alert('Failed to unassign student');
      fetchBatchDetail();
    }
  };

  // Instant optimistic block / unblock toggle for student
  const handleToggleStudentStatus = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: nextStatus } : s)),
    );
    try {
      await api.put(`/users/${studentId}/status`, { status: nextStatus });
    } catch (e) {
      alert('Failed to update student status');
      fetchBatchDetail();
    }
  };

  // Instant optimistic delete for student
  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    const targetId = deletingStudent.id;
    setStudents((prev) => prev.filter((s) => s.id !== targetId));
    setDeletingStudent(null);
    try {
      await api.put(`/users/${targetId}/status`, { status: 'DELETED' });
    } catch (e) {
      alert('Failed to delete student');
      fetchBatchDetail();
    }
  };

  const handleOpenEditStudent = (stu: any) => {
    setEditingStudent(stu);
    setEditStudentFullName(stu.fullName || '');
    setEditStudentPhone(stu.phone || '');
    setEditStudentEmail(stu.email || '');
    setEditStudentRollNumber(stu.studentProfile?.rollNumber || (stu.identifier && !stu.identifier.includes('@') ? stu.identifier : 'RN-12345'));
    setEditStudentBatchId(stu.studentProfile?.batchId || batchId);
    setEditStudentProvince(stu.studentProfile?.province || 'Bagmati');
    setEditStudentDistrict(stu.studentProfile?.district || 'Kathmandu');
    setEditStudentMunicipality(stu.studentProfile?.municipality || 'Kathmandu Metropolitan City');
    setEditStudentWardNumber(stu.studentProfile?.wardNumber || '04');
    setEditStudentParentPhone(stu.studentProfile?.parentPhone || '');
    setEditStudentAvatarUrl(stu.avatarUrl || '');
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                fullName: editStudentFullName,
                phone: editStudentPhone,
                email: editStudentEmail,
                avatarUrl: editStudentAvatarUrl,
                studentProfile: {
                  ...s.studentProfile,
                  rollNumber: editStudentRollNumber,
                  batchId: editStudentBatchId,
                  province: editStudentProvince,
                  district: editStudentDistrict,
                  municipality: editStudentMunicipality,
                  wardNumber: editStudentWardNumber,
                  parentPhone: editStudentParentPhone,
                },
              }
            : s,
        ),
      );

      await api.put(`/users/students/${editingStudent.id}`, {
        fullName: editStudentFullName,
        phone: editStudentPhone,
        email: editStudentEmail,
        rollNumber: editStudentRollNumber,
        batchId: editStudentBatchId || undefined,
        province: editStudentProvince,
        district: editStudentDistrict,
        municipality: editStudentMunicipality,
        wardNumber: editStudentWardNumber,
        parentPhone: editStudentParentPhone,
        avatarUrl: editStudentAvatarUrl,
      });

      setEditingStudent(null);
      if (editStudentBatchId !== batchId) {
        setStudents((prev) => prev.filter((s) => s.id !== editingStudent.id));
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save student profile');
      fetchBatchDetail();
    }
  };

  const handleOpenAssignBatch = (stu: any) => {
    setAssigningStudent(stu);
    setTargetBatchId(stu.studentProfile?.batchId || batchId);
  };

  const handleConfirmAssignBatch = async () => {
    if (!assigningStudent) return;
    const studentId = assigningStudent.id;

    if (targetBatchId !== batchId) {
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    }

    setAssigningStudent(null);

    try {
      if (!targetBatchId) {
        await api.put(`/users/students/${studentId}`, { batchId: null });
      } else {
        await api.put(`/users/students/${studentId}/batch`, { batchId: targetBatchId });
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to assign batch');
      fetchBatchDetail();
    }
  };

  // ── Faculty Teacher Handlers (Instant Optimistic Updates) ──
  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setEditTeacherFullName('');
    setEditTeacherEmail('');
    setEditTeacherPhone('');
    setEditTeacherFacultyCode(generateFacultyCode());
    setEditTeacherDesignation('Senior Faculty');
    setEditTeacherSpecialization('Physics');
    setEditTeacherAvatarUrl('');
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (tch: any) => {
    setEditingTeacher(tch);
    setEditTeacherFullName(tch.fullName || '');
    setEditTeacherEmail(tch.email || '');
    setEditTeacherPhone(tch.phone || '');
    setEditTeacherFacultyCode(tch.teacherProfile?.facultyCode || (tch.identifier && !tch.identifier.includes('@') ? tch.identifier : generateFacultyCode()));
    setEditTeacherDesignation(tch.teacherProfile?.designation || 'Senior Faculty');
    setEditTeacherSpecialization((tch.teacherProfile?.specialization || []).join(', '));
    setEditTeacherAvatarUrl(tch.avatarUrl || '');
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = editTeacherFacultyCode.trim() || generateFacultyCode();

    try {
      if (editingTeacher) {
        // Optimistic update
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === editingTeacher.id
              ? {
                  ...t,
                  fullName: editTeacherFullName,
                  email: editTeacherEmail,
                  phone: editTeacherPhone,
                  avatarUrl: editTeacherAvatarUrl,
                  teacherProfile: {
                    ...t.teacherProfile,
                    facultyCode: finalCode,
                    designation: editTeacherDesignation,
                    specialization: editTeacherSpecialization.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                }
              : t,
          ),
        );

        await api.put(`/users/teachers/${editingTeacher.id}`, {
          fullName: editTeacherFullName,
          email: editTeacherEmail,
          phone: editTeacherPhone,
          facultyCode: finalCode,
          designation: editTeacherDesignation,
          specialization: editTeacherSpecialization.split(',').map((s) => s.trim()).filter(Boolean),
          avatarUrl: editTeacherAvatarUrl,
        });
      } else {
        const res = await api.post('/users/teachers', {
          fullName: editTeacherFullName,
          email: editTeacherEmail,
          phone: editTeacherPhone,
          facultyCode: finalCode,
          designation: editTeacherDesignation,
          specialization: editTeacherSpecialization.split(',').map((s) => s.trim()).filter(Boolean),
          avatarUrl: editTeacherAvatarUrl,
        });
        alert(`Teacher onboarded! Temporary Password: ${res.data.rawPassword}`);
        fetchBatchDetail();
      }
      setIsTeacherModalOpen(false);
      setEditingTeacher(null);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save faculty teacher');
      fetchBatchDetail();
    }
  };

  // Instant optimistic block / unblock toggle for teacher
  const handleToggleTeacherStatus = async (teacherId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    setTeachers((prev) =>
      prev.map((t) => (t.id === teacherId ? { ...t, status: nextStatus } : t)),
    );
    try {
      await api.put(`/users/${teacherId}/status`, { status: nextStatus });
    } catch (e) {
      alert('Failed to update teacher status');
      fetchBatchDetail();
    }
  };

  // Instant optimistic delete for teacher
  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    const targetId = deletingTeacher.id;
    setTeachers((prev) => prev.filter((t) => t.id !== targetId));
    setDeletingTeacher(null);
    try {
      await api.put(`/users/${targetId}/status`, { status: 'DELETED' });
    } catch (e) {
      alert('Failed to delete teacher');
      fetchBatchDetail();
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, isTeacher: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (isTeacher) {
        setEditTeacherAvatarUrl(reader.result as string);
      } else {
        setEditStudentAvatarUrl(reader.result as string);
      }
      setIsUploadingPhoto(false);
    };
    reader.onerror = () => {
      alert('Failed to read image file');
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

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

  const handleUpdateBatchSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/batches/${batchId}`, {
        name: settingsName,
        code: settingsCode,
        description: settingsDesc,
        priceNpr: parseInt(settingsPrice, 10) || 0,
        startDate: settingsStartDate ? new Date(settingsStartDate) : undefined,
        endDate: settingsEndDate ? new Date(settingsEndDate) : undefined,
        status: settingsStatus,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      setIsEditBatchModalOpen(false);
      fetchBatchDetail();
    } catch (e) {
      alert('Failed to update batch settings');
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Academic batch not found.</p>
        <Link href="/batches" className="text-brand-600 text-xs font-semibold mt-2 inline-block">
          ← Back to Batches
        </Link>
      </div>
    );
  }

  const subjects = batch.subjects || [];
  const filteredStudents = students.filter((s) => {
    const query = studentSearch.toLowerCase();
    return (
      (s.fullName || '').toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query) ||
      (s.phone || '').includes(query) ||
      (s.studentProfile?.rollNumber || '').toLowerCase().includes(query)
    );
  });

  const filteredTeachers = teachers.filter((t) => {
    const query = teacherSearch.toLowerCase();
    return (
      (t.fullName || '').toLowerCase().includes(query) ||
      (t.email || '').toLowerCase().includes(query) ||
      (t.phone || '').includes(query) ||
      (t.teacherProfile?.facultyCode || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <Link
          href="/batches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Batches
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{batch.name}</h1>
                <span className="px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 font-mono text-xs font-bold border border-brand-200">
                  {batch.code}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                  batch.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {batch.status || 'ACTIVE'}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {batch.description || 'Full comprehensive medical & engineering entrance syllabus with live tests and interactive video classes.'}
              </p>
            </div>
          </div>

          {!isStudent && (
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <button
                onClick={() => setIsEditBatchModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Details
              </button>
              <button
                onClick={openEnrollModal}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Enroll Students
              </button>
            </div>
          )}
        </div>

        {/* Stats Strip */}
        <div className={`grid ${isStudent ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100 text-xs`}>
          {!isStudent && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Enrolled Students</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono">{students.length}</span>
            </div>
          )}
          <div className="p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
            <span className="text-[10px] text-brand-600 block font-medium">Curriculum Subjects</span>
            <span className="text-base sm:text-lg font-extrabold text-brand-700 font-mono">{subjects.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
            <span className="text-[10px] text-purple-600 block font-medium">Mock Tests</span>
            <span className="text-base sm:text-lg font-extrabold text-purple-700 font-mono">{batchTests.length}</span>
          </div>
          {!isStudent ? (
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] text-emerald-600 block font-medium">Faculty Teachers</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono">{teachers.length}</span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-600 block font-medium">Batch Enrollment</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-700">Enrolled & Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        {[
          { key: 'subjects', label: `Curriculum & Subjects (${subjects.length})`, icon: BookOpen },
          ...(!isStudent ? [
            { key: 'students', label: `Enrolled Students (${students.length})`, icon: Users },
            { key: 'teachers', label: `Faculty Teachers (${teachers.length})`, icon: Users },
          ] : []),
          { key: 'tests', label: `Batch Exams (${batchTests.length})`, icon: FileCheck2 },
          ...(!isStudent ? [{ key: 'settings', label: 'Batch Settings', icon: Settings }] : []),
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-brand-600 text-brand-600 bg-white rounded-t-2xl shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: CURRICULUM SUBJECTS & LESSONS ── */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Academic Subjects ({subjects.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Chapters, recorded lecture videos, study notes, and chapter tests.</p>
            </div>
            {!isStudent && (
              <button
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectName('');
                  setIsSubjectModalOpen(true);
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Subject
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub: any) => {
              const lessons = sub.lessons || [];
              return (
                <div key={sub.id} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{sub.name}</h3>
                        <span className="text-[11px] text-slate-400 font-medium">{lessons.length} Chapters / Lessons</span>
                      </div>
                    </div>

                    {!isStudent && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedSubjectId(sub.id);
                            setEditingLesson(null);
                            setLessonName('');
                            setLessonDescription('');
                            setIsLessonModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Lesson
                        </button>
                        <button
                          onClick={() => {
                            setEditingSubject(sub);
                            setSubjectName(sub.name);
                            setIsSubjectModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingSubject(sub)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lessons list */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {lessons.map((ls: any) => (
                      <div
                        key={ls.id}
                        className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                      >
                        <Link href={`/lessons/${ls.id}`} className="flex-1 min-w-0 font-bold text-xs text-slate-800 hover:text-brand-600 truncate">
                          {ls.name}
                        </Link>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/lessons/${ls.id}`}
                            className="px-2.5 py-1 bg-white hover:bg-brand-600 hover:text-white text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 shadow-sm transition-all"
                          >
                            Open Chapter →
                          </Link>

                          {!isStudent && (
                            <button
                              onClick={() => setDeletingLesson(ls)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {lessons.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-400">No lessons in this subject yet.</p>
                    )}
                  </div>
                </div>
              );
            })}

            {subjects.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                No subjects in this batch yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: ENROLLED STUDENTS ── */}
      {activeTab === 'students' && !isStudent && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students in this batch..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">{filteredStudents.length} Students Listed</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                <button
                  onClick={() => setStudentViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    studentViewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Cards Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setStudentViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    studentViewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List / Table View"
                >
                  <List className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">List</span>
                </button>
              </div>

              {!isStudent && (
                <button
                  onClick={openEnrollModal}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Enroll Students
                </button>
              )}
            </div>
          </div>

          {/* ── SUB-VIEW 1: CARDS GRID VIEW ── */}
          {studentViewMode === 'grid' && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStudents.map((stu) => (
                <div
                  key={stu.id}
                  className="bg-slate-50/70 rounded-3xl border border-slate-200 p-5 flex flex-col justify-between hover:border-brand-300 transition-all shadow-sm group"
                >
                  <div>
                    {/* Top Row: Avatar + Roll No + Edit/Delete */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {stu.avatarUrl ? (
                          <img
                            src={stu.avatarUrl}
                            alt={stu.fullName}
                            className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
                            {stu.fullName ? stu.fullName[0] : 'S'}
                          </div>
                        )}
                        <div>
                          <Link href={`/students/${stu.id}`} className="font-extrabold text-slate-900 hover:text-brand-600 text-sm block line-clamp-1">
                            {stu.fullName}
                          </Link>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-mono text-[10px] font-bold border border-brand-200">
                            {stu.studentProfile?.rollNumber || (stu.identifier && !stu.identifier.includes('@') ? stu.identifier : 'RN-STU')}
                          </span>
                        </div>
                      </div>

                      {!isStudent && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditStudent(stu)}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(stu)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Batch Assignment Tag with 1-Click Change */}
                    <div className="mt-3 p-2.5 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GraduationCap className="w-4 h-4 text-brand-600 shrink-0" />
                        <span className="text-[11px] font-bold truncate text-slate-800">
                          {batch.name}
                        </span>
                      </div>

                      {!isStudent && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenAssignBatch(stu)}
                            className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold rounded-md border border-brand-200/80 transition-colors"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => handleUnassignStudent(stu.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                            title="Unassign from batch"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Contact & Nepal Location */}
                    <div className="space-y-1 mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-500">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{stu.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{stu.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {stu.studentProfile?.district
                            ? `${stu.studentProfile.district}, ${stu.studentProfile.province || ''}`
                            : 'Nepal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    {!isStudent ? (
                      <button
                        onClick={() => handleToggleStudentStatus(stu.id, stu.status)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          stu.status === 'ACTIVE'
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${stu.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {stu.status === 'ACTIVE' ? 'Active' : 'Blocked'}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Enrolled Student</span>
                    )}

                    <Link
                      href={`/students/${stu.id}`}
                      className="px-3 py-1 bg-white hover:bg-brand-600 hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm transition-all flex items-center gap-1"
                    >
                      360° View →
                    </Link>
                  </div>
                </div>
              ))}

              {filteredStudents.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                  No students enrolled in this batch yet.
                </div>
              )}
            </div>
          )}

          {/* ── SUB-VIEW 2: LIST / TABLE VIEW ── */}
          {studentViewMode === 'list' && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/60">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Student Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {stu.avatarUrl ? (
                            <img
                              src={stu.avatarUrl}
                              alt={stu.fullName}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                              {stu.fullName ? stu.fullName[0] : 'S'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link href={`/students/${stu.id}`} className="font-extrabold text-slate-900 hover:text-brand-600 truncate block">
                              {stu.fullName}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* 2. Email & Phone */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate text-xs">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{stu.email || 'No email'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{stu.phone || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Roll No */}
                      <td className="py-3 px-4 font-mono font-bold text-brand-700">
                        <span className="px-2 py-0.5 rounded-md bg-brand-50 border border-brand-200/80 text-brand-700 text-[11px]">
                          {stu.studentProfile?.rollNumber || (stu.identifier && !stu.identifier.includes('@') ? stu.identifier : '-')}
                        </span>
                      </td>

                      {/* 4. Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            stu.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              stu.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {stu.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* 5. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/students/${stu.id}`}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-bold rounded-lg transition-colors"
                          >
                            360° View
                          </Link>

                          {!isStudent && (
                            <>
                              <button
                                onClick={() => handleOpenEditStudent(stu)}
                                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                title="Edit Student"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleStudentStatus(stu.id, stu.status)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors border ${
                                  stu.status === 'ACTIVE'
                                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200/80'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200/80'
                                }`}
                              >
                                {stu.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                              </button>

                              <button
                                onClick={() => setDeletingStudent(stu)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        No students enrolled in this batch yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: BATCH TESTS ── */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Batch Live Exams & Chapter Tests ({batchTests.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Examinations scheduled or active for students in this batch.</p>
            </div>
            {!isStudent && (
              <Link
                href={`/tests/create?batchId=${batchId}`}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Create Batch Test
              </Link>
            )}
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
                No mock tests created for this batch yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: ASSIGNED FACULTY TEACHERS ── */}
      {activeTab === 'teachers' && !isStudent && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Search faculty name, faculty code, email..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">{filteredTeachers.length} Faculty Listed</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                <button
                  onClick={() => setTeacherViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    teacherViewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List / Table View"
                >
                  <List className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setTeacherViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    teacherViewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Cards Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">Cards</span>
                </button>
              </div>

              {!isStudent && (
                <button
                  onClick={handleOpenAddTeacher}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Onboard Faculty Teacher
                </button>
              )}
            </div>
          </div>

          {/* ── SUB-VIEW 1: LIST / TABLE VIEW (DEFAULT) ── */}
          {teacherViewMode === 'list' && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/60">
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTeachers.map((tch) => (
                    <tr key={tch.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Faculty Member & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {tch.avatarUrl ? (
                            <img
                              src={tch.avatarUrl}
                              alt={tch.fullName}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                              {tch.fullName ? tch.fullName[0] : 'T'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link href={`/teachers/${tch.id}`} className="font-extrabold text-slate-900 hover:text-brand-600 truncate block">
                              {tch.fullName}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* 2. Email & Contact (Dedicated Column) */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate text-xs">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{tch.email || 'No email'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{tch.phone || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Designation */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block text-xs">
                          {tch.teacherProfile?.designation || 'Faculty Instructor'}
                        </span>
                      </td>

                      {/* 4. Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            tch.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tch.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {tch.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* 5. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/teachers/${tch.id}`}
                            className="px-2.5 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 text-[11px] font-bold rounded-lg transition-colors"
                          >
                            360° View
                          </Link>

                          {!isStudent && (
                            <>
                              <button
                                onClick={() => handleOpenEditTeacher(tch)}
                                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                title="Edit Teacher"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleTeacherStatus(tch.id, tch.status)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors border ${
                                  tch.status === 'ACTIVE'
                                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200/80'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200/80'
                                }`}
                              >
                                {tch.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                              </button>

                              <button
                                onClick={() => setDeletingTeacher(tch)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Teacher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        No faculty teachers assigned to this batch yet. Click &quot;Onboard Faculty Teacher&quot; above to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── SUB-VIEW 2: CARDS GRID VIEW ── */}
          {teacherViewMode === 'grid' && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTeachers.map((tch) => (
                <div
                  key={tch.id}
                  className="bg-slate-50/70 rounded-3xl border border-slate-200 p-5 flex flex-col justify-between hover:border-brand-300 transition-all group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      {tch.avatarUrl ? (
                        <img
                          src={tch.avatarUrl}
                          alt={tch.fullName}
                          className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0">
                          {tch.fullName ? tch.fullName[0] : 'T'}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">
                          {tch.teacherProfile?.facultyCode || (tch.identifier && !tch.identifier.includes('@') ? tch.identifier : '-')}
                        </span>

                        {!isStudent && (
                          <>
                            <button
                              onClick={() => handleOpenEditTeacher(tch)}
                              className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingTeacher(tch)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <Link href={`/teachers/${tch.id}`}>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors flex items-center justify-between">
                        <span>{tch.fullName}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                      </h3>
                    </Link>
                    <p className="text-xs text-brand-600 font-medium mt-0.5">
                      {tch.teacherProfile?.designation || 'Faculty Instructor'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {(tch.teacherProfile?.specialization || ['Curriculum Expert']).map((spec: string) => (
                        <span key={spec} className="px-2 py-0.5 bg-white text-slate-600 text-[10px] font-medium rounded-md border border-slate-200">
                          {spec}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-1 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                      <div className="flex items-center gap-2 truncate font-mono text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{tch.email || 'No email set'}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{tch.phone || '+97798XXXXXXXX'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    {!isStudent ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            tch.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tch.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {tch.status || 'ACTIVE'}
                        </span>

                        <button
                          onClick={() => handleToggleTeacherStatus(tch.id, tch.status)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors border ${
                            tch.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200/80'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200/80'
                          }`}
                        >
                          {tch.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Faculty Member</span>
                    )}

                    <Link
                      href={`/teachers/${tch.id}`}
                      className="px-3 py-1 bg-white hover:bg-brand-600 hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm transition-all flex items-center gap-1"
                    >
                      360° View →
                    </Link>
                  </div>
                </div>
              ))}

              {filteredTeachers.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                  No faculty teachers assigned to this batch yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: BATCH SETTINGS FORM ── */}
      {activeTab === 'settings' && !isStudent && (
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

      {/* ── ONBOARD & EDIT FACULTY TEACHER MODAL ── */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTeacher ? `Edit Faculty: ${editingTeacher.fullName}` : 'Onboard Faculty Teacher'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Faculty credentials, designation & subject specialization.</p>
              </div>

              <button onClick={() => setIsTeacherModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-brand-500 cursor-pointer relative group overflow-hidden shrink-0">
                  {editTeacherAvatarUrl ? (
                    <img src={editTeacherAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-brand-600" />
                      <span className="text-[9px] font-bold mt-1">Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e, true)}
                    className="hidden"
                  />
                </label>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editTeacherFullName}
                    onChange={(e) => setEditTeacherFullName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Karki"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={editTeacherEmail}
                    onChange={(e) => setEditTeacherEmail(e.target.value)}
                    placeholder="teacher@examly.com"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editTeacherPhone}
                    onChange={(e) => setEditTeacherPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Faculty Code</label>
                  <input
                    type="text"
                    value={editTeacherFacultyCode}
                    onChange={(e) => setEditTeacherFacultyCode(e.target.value)}
                    placeholder="TCH-101"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <select
                    value={editTeacherDesignation}
                    onChange={(e) => setEditTeacherDesignation(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Senior Faculty">Senior Faculty</option>
                    <option value="HOD Physics">HOD Physics</option>
                    <option value="HOD Chemistry">HOD Chemistry</option>
                    <option value="HOD Biology">HOD Biology</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Visiting Lecturer">Visiting Lecturer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Specialization Subjects (comma separated)</label>
                <input
                  type="text"
                  value={editTeacherSpecialization}
                  onChange={(e) => setEditTeacherSpecialization(e.target.value)}
                  placeholder="e.g. Organic Chemistry, Thermodynamics, Botany"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-900 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" /> Granular RBAC Permissions
                </span>
                <p className="text-[11px] leading-relaxed text-purple-800">
                  After onboarding, you can grant custom granular permissions in the teacher&apos;s 360 profile.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20"
                >
                  {editingTeacher ? 'Save Changes' : 'Onboard Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE FACULTY TEACHER MODAL ── */}
      {deletingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete {deletingTeacher.fullName}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this faculty teacher from the institute roster?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingTeacher(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeacher}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
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
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
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

      {/* ── FAST 1-CLICK ASSIGN / CHANGE BATCH MODAL ── */}
      {assigningStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assign or Transfer Batch</h3>
                  <p className="text-[11px] text-slate-500">{assigningStudent.fullName} • Roll: {assigningStudent.studentProfile?.rollNumber || assigningStudent.identifier || '-'}</p>
                </div>
              </div>
              <button onClick={() => setAssigningStudent(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Select Academic Batch</label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <div
                  onClick={() => setTargetBatchId('')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    targetBatchId === ''
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-900">Unassigned (No Batch)</span>
                      <p className="text-[10px] text-slate-500">Remove student from active batch enrollment</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    targetBatchId === '' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {targetBatchId === '' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {allBatches.map((b) => {
                  const isSelected = targetBatchId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setTargetBatchId(b.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{b.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                            {b.code}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{b.description || 'Full syllabus batch'}</p>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setAssigningStudent(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignBatch}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                Confirm Assignment <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT STUDENT MODAL ── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Student: {editingStudent.fullName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Personal details, roll number, Nepal cascade & batch assignment.</p>
              </div>

              <button onClick={() => setEditingStudent(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-brand-500 cursor-pointer relative group overflow-hidden shrink-0">
                  {editStudentAvatarUrl ? (
                    <img src={editStudentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-brand-600" />
                      <span className="text-[9px] font-bold mt-1">Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e, false)}
                    className="hidden"
                  />
                </label>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editStudentFullName}
                    onChange={(e) => setEditStudentFullName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={editStudentPhone}
                    onChange={(e) => setEditStudentPhone(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editStudentEmail}
                    onChange={(e) => setEditStudentEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    value={editStudentRollNumber}
                    onChange={(e) => setEditStudentRollNumber(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Batch</label>
                  <select
                    value={editStudentBatchId}
                    onChange={(e) => setEditStudentBatchId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">-- Unassigned (No Batch) --</option>
                    {allBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nepal Cascade Location */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 block">Nepal Address & Location</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Province</label>
                    <select
                      value={editStudentProvince}
                      onChange={(e) => setEditStudentProvince(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                    >
                      {['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">District</label>
                    <input
                      type="text"
                      value={editStudentDistrict}
                      onChange={(e) => setEditStudentDistrict(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Municipality / Rural</label>
                    <input
                      type="text"
                      value={editStudentMunicipality}
                      onChange={(e) => setEditStudentMunicipality(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Ward No.</label>
                    <input
                      type="text"
                      value={editStudentWardNumber}
                      onChange={(e) => setEditStudentWardNumber(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE STUDENT MODAL ── */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete {deletingStudent.fullName}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to soft delete this student record?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingStudent(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Yes, Delete
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
