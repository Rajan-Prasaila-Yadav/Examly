// apps/web/src/app/(dashboard)/students/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CardGridSkeleton, TableSkeleton } from '@/components/skeleton';
import {
  Users,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  X,
  Lock,
  Sparkles,
  ChevronRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Camera,
  BookOpen,
  User,
  GraduationCap,
  Layers,
  ArrowRight,
  LayoutGrid,
  List,
  UserX,
} from 'lucide-react';

let cachedStudents: any[] = [];
let cachedStudentsBatches: any[] = [];

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  useEffect(() => {
    if (isStudent && user?.id) {
      router.replace(`/students/${user.id}`);
    }
  }, [isStudent, user?.id, router]);

  const [students, setStudents] = useState<any[]>(cachedStudents);
  const [batches, setBatches] = useState<any[]>(cachedStudentsBatches);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Default to Card / Grid view as requested
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStep, setFormStep] = useState<'personal' | 'academic' | 'access'>('personal');

  // Form State (SCR-ADM-18)
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('2007-08-15');
  const [gender, setGender] = useState('Male');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [batchId, setBatchId] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Nepal Cascade
  const [province, setProvince] = useState('Bagmati');
  const [district, setDistrict] = useState('Kathmandu');
  const [municipality, setMunicipality] = useState('Kathmandu Metropolitan City');
  const [wardNumber, setWardNumber] = useState('04');

  // Assign Batch Modal State
  const [assigningStudent, setAssigningStudent] = useState<any | null>(null);
  const [targetBatchId, setTargetBatchId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Delete State
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);

  const fetchStudents = async () => {
    try {
      const [stuRes, batRes] = await Promise.all([
        api.get('/users/students', { params: { search, batchId: selectedBatchFilter || undefined } }),
        api.get('/batches'),
      ]);
      if (stuRes.data) {
        cachedStudents = stuRes.data;
        setStudents(stuRes.data);
      }
      if (batRes.data) {
        cachedStudentsBatches = batRes.data;
        setBatches(batRes.data);
      }
      if (batRes.data?.length > 0 && !batchId) {
        setBatchId(batRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, selectedBatchFilter]);

  const generateRollNumber = () => `RN-${Math.floor(10000 + Math.random() * 90000)}`;

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setRollNumber(generateRollNumber());
    setParentName('');
    setParentPhone('');
    setAvatarUrl('');
    setBatchId(batches[0]?.id || '');
    setFormStep('personal');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stu: any) => {
    setEditingStudent(stu);
    setFullName(stu.fullName || '');
    setPhone(stu.phone || '');
    setEmail(stu.email || '');
    setRollNumber(stu.studentProfile?.rollNumber || (stu.identifier && !stu.identifier.includes('@') ? stu.identifier : generateRollNumber()));
    setBatchId(stu.studentProfile?.batchId || (batches[0]?.id || ''));
    setProvince(stu.studentProfile?.province || 'Bagmati');
    setDistrict(stu.studentProfile?.district || 'Kathmandu');
    setMunicipality(stu.studentProfile?.municipality || 'Kathmandu Metropolitan City');
    setWardNumber(stu.studentProfile?.wardNumber || '04');
    setParentPhone(stu.studentProfile?.parentPhone || '');
    setAvatarUrl(stu.avatarUrl || '');
    setFormStep('personal');
    setIsModalOpen(true);
  };

  const handleOpenAssignBatch = (stu: any) => {
    setAssigningStudent(stu);
    setTargetBatchId(stu.studentProfile?.batchId || (batches[0]?.id || ''));
  };

  // Instant optimistic batch assignment
  const handleConfirmAssignBatch = async () => {
    if (!assigningStudent) return;
    const studentId = assigningStudent.id;
    const chosenBatch = batches.find((b) => b.id === targetBatchId);

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              studentProfile: {
                ...s.studentProfile,
                batchId: targetBatchId || null,
                batch: chosenBatch || null,
              },
            }
          : s,
      ),
    );

    setAssigningStudent(null);

    try {
      if (!targetBatchId) {
        // Unassign batch
        await api.put(`/users/students/${studentId}`, { batchId: null });
      } else {
        await api.put(`/users/students/${studentId}/batch`, { batchId: targetBatchId });
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to assign batch');
      fetchStudents();
    }
  };

  const handleUnassignStudent = async (stu: any) => {
    const studentId = stu.id;
    // Optimistic update
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              studentProfile: {
                ...s.studentProfile,
                batchId: null,
                batch: null,
              },
            }
          : s,
      ),
    );

    try {
      await api.put(`/users/students/${studentId}`, { batchId: null });
    } catch (e) {
      alert('Failed to unassign batch');
      fetchStudents();
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
      setIsUploadingPhoto(false);
    };
    reader.onerror = () => {
      alert('Failed to read image file');
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRollNumber = rollNumber?.trim() || generateRollNumber();

    try {
      if (editingStudent) {
        const chosenBatch = batches.find((b) => b.id === batchId);
        // Optimistic update
        setStudents((prev) =>
          prev.map((s) =>
            s.id === editingStudent.id
              ? {
                  ...s,
                  fullName,
                  phone,
                  email,
                  avatarUrl,
                  studentProfile: {
                    ...s.studentProfile,
                    rollNumber: finalRollNumber,
                    batchId,
                    batch: chosenBatch,
                    province,
                    district,
                    municipality,
                    wardNumber,
                    parentPhone,
                  },
                }
              : s,
          ),
        );

        await api.put(`/users/students/${editingStudent.id}`, {
          fullName,
          phone,
          email,
          rollNumber: finalRollNumber,
          batchId: batchId || undefined,
          province,
          district,
          municipality,
          wardNumber,
          parentPhone,
          avatarUrl,
        });
      } else {
        const res = await api.post('/users/students', {
          fullName,
          phone,
          email,
          rollNumber: finalRollNumber,
          batchId: batchId || undefined,
          province,
          district,
          municipality,
          wardNumber,
          parentPhone,
          avatarUrl,
        });
        alert(`Student enrolled! Temporary Password: ${res.data.rawPassword}`);
        fetchStudents();
      }
      setIsModalOpen(false);
      setEditingStudent(null);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save student');
      fetchStudents();
    }
  };

  // Instant optimistic block / unblock toggle
  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    // Optimistic UI state
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: nextStatus } : s)),
    );
    try {
      await api.put(`/users/${studentId}/status`, { status: nextStatus });
    } catch (e) {
      alert('Failed to update student status');
      fetchStudents();
    }
  };

  // Instant optimistic delete
  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    const targetId = deletingStudent.id;
    // Optimistic UI state
    setStudents((prev) => prev.filter((s) => s.id !== targetId));
    setDeletingStudent(null);
    try {
      await api.put(`/users/${targetId}/status`, { status: 'DELETED' });
    } catch (e) {
      alert('Failed to delete student');
      fetchStudents();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Enrolled Students Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full Student Management: Enrollment, Batch Assignment, Nepal Cascade Address, 1-Click Block/Unblock, and 360° Scorecards.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Enroll New Student
        </button>
      </div>

      {/* Main Table / Grid Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        {/* Search & Batch Filter Toolbar with View Toggle */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, roll number, or phone..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Batch Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter Batch:</span>
              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-700"
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium shrink-0">{students.length} Students Listed</span>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List / Table View"
              >
                <List className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── LOADING SKELETON ── */}
        {isLoading ? (
          <div className="p-5">
            {viewMode === 'grid' ? <CardGridSkeleton count={6} /> : <TableSkeleton rows={6} />}
          </div>
        ) : (
          <>
            {/* ── VIEW MODE 1: CARDS GRID VIEW (DEFAULT) ── */}
            {viewMode === 'grid' && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((stu) => {
              const currentBatch = stu.studentProfile?.batch || batches.find((b: any) => b.id === stu.studentProfile?.batchId);
              const currentBatchName = currentBatch ? currentBatch.name : 'Unassigned Batch';
              const isAssigned = !!currentBatch;

              return (
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

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(stu)}
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
                    </div>

                    {/* Batch Assignment Tag with 1-Click Change */}
                    <div className="mt-3 p-2.5 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GraduationCap className={`w-4 h-4 shrink-0 ${isAssigned ? 'text-brand-600' : 'text-amber-500'}`} />
                        <span className={`text-[11px] font-bold truncate ${isAssigned ? 'text-slate-800' : 'text-amber-700'}`}>
                          {currentBatchName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenAssignBatch(stu)}
                          className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold rounded-md border border-brand-200/80 transition-colors"
                        >
                          {isAssigned ? 'Change' : 'Assign'}
                        </button>
                        {isAssigned && (
                          <button
                            onClick={() => handleUnassignStudent(stu)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                            title="Unassign from batch"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        )}
                      </div>
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
                    <button
                      onClick={() => handleToggleStatus(stu.id, stu.status)}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        stu.status === 'ACTIVE'
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${stu.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {stu.status === 'ACTIVE' ? 'Active' : 'Blocked'}
                    </button>

                    <Link
                      href={`/students/${stu.id}`}
                      className="px-3 py-1 bg-white hover:bg-brand-600 hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm transition-all flex items-center gap-1"
                    >
                      360° View →
                    </Link>
                  </div>
                </div>
              );
            })}

            {students.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                No students found. Click &quot;Enroll New Student&quot; to add one.
              </div>
            )}
          </div>
        )}

        {/* ── VIEW MODE 2: LIST / TABLE VIEW ── */}
        {viewMode === 'list' && (
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
                {students.map((stu) => {
                  return (
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

                          <button
                            onClick={() => handleOpenEdit(stu)}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(stu.id, stu.status)}
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
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {students.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No students found. Click &quot;Enroll New Student&quot; to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}
      </div>

      {/* ── FAST 1-CLICK ASSIGN BATCH MODAL (Super Admin / Admin) ── */}
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
                {/* Option to Unassign */}
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

                {batches.map((b) => {
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
                disabled={isAssigning}
                onClick={handleConfirmAssignBatch}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {isAssigning ? 'Applying...' : 'Confirm Assignment'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCROLLABLE ENROLL & EDIT STUDENT MODAL (SCR-ADM-18) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'Enroll New Student'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Personal details, roll number, Nepal cascade & batch assignment.</p>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Pills */}
            <div className="px-5 sm:px-6 pt-4 pb-2 shrink-0">
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                {[
                  { key: 'personal', label: '1. Personal & Roll No' },
                  { key: 'academic', label: '2. Batch & Academic' },
                  { key: 'access', label: '3. Credentials' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormStep(t.key as any)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      formStep === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* ── TAB 1: PERSONAL & NEPAL CASCADE ── */}
              {formStep === 'personal' && (
                <div className="space-y-4">
                  {/* Photo & Name */}
                  <div className="flex items-center gap-4">
                    <label className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-brand-500 cursor-pointer relative group overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-slate-400 group-hover:text-brand-600" />
                          <span className="text-[9px] font-bold mt-1">Photo</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>

                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98XXXXXXXX"
                        required
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@example.com"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Parent/Guardian Name</label>
                      <input
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Parent Name"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Parent Phone</label>
                      <input
                        type="tel"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Nepal Cascade Location */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 block">Nepal Address & Location</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Province</label>
                        <select
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
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
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="e.g. Kathmandu"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Municipality / Rural</label>
                        <input
                          type="text"
                          value={municipality}
                          onChange={(e) => setMunicipality(e.target.value)}
                          placeholder="e.g. Lalitpur Metro"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Ward No.</label>
                        <input
                          type="text"
                          value={wardNumber}
                          onChange={(e) => setWardNumber(e.target.value)}
                          placeholder="e.g. 04"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: BATCH & ACADEMIC ── */}
              {formStep === 'academic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Batch</label>
                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="">-- Unassigned (No Batch) --</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      All subjects and mock tests assigned to this batch will be instantly mapped to the student.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number *</label>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="RN-12345"
                        required
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Admission Date</label>
                      <input
                        type="date"
                        value={admissionDate}
                        onChange={(e) => setAdmissionDate(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: ACCESS CREDENTIALS ── */}
              {formStep === 'access' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Lock className="w-4 h-4 text-amber-600" />
                      Automatic Credentials Generation
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      When enrolled, student login will be their <strong>Roll Number / Phone</strong>. A strong temporary password is generated and shown to you immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all"
                >
                  {editingStudent ? 'Save Changes' : 'Save & Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Modal */}
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
    </div>
  );
}
