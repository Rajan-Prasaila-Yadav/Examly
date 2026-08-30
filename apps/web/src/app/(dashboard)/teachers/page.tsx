// apps/web/src/app/(dashboard)/teachers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CardGridSkeleton, TableSkeleton } from '@/components/skeleton';
import {
  UserSquare2,
  Plus,
  Search,
  Mail,
  Phone,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  ChevronRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Lock,
  Camera,
  Layers,
  LayoutGrid,
  List,
  GraduationCap,
} from 'lucide-react';

let cachedTeachers: any[] = [];
let cachedTeacherBatches: any[] = [];

export default function TeachersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  useEffect(() => {
    if (isStudent) {
      router.replace('/');
    }
  }, [isStudent, router]);

  const [teachers, setTeachers] = useState<any[]>(cachedTeachers);
  const [batches, setBatches] = useState<any[]>(cachedTeacherBatches);
  const [isLoading, setIsLoading] = useState(cachedTeachers.length === 0);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Default to list view as requested
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State (Create & Edit)
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [facultyCode, setFacultyCode] = useState('');
  const [designation, setDesignation] = useState('Senior Faculty');
  const [specialization, setSpecialization] = useState('Physics');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Delete State
  const [deletingTeacher, setDeletingTeacher] = useState<any | null>(null);

  const fetchTeachers = async () => {
    try {
      const [tchRes, batRes] = await Promise.all([
        api.get('/users/teachers'),
        api.get('/batches'),
      ]);
      if (tchRes.data) {
        cachedTeachers = tchRes.data;
        setTeachers(tchRes.data);
      }
      if (batRes.data) {
        cachedTeacherBatches = batRes.data;
        setBatches(batRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const generateFacultyCode = () => `TCH-${Math.floor(100 + Math.random() * 900)}`;

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setFacultyCode(generateFacultyCode());
    setDesignation('Senior Faculty');
    setSpecialization('Physics');
    setAvatarUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tch: any) => {
    setEditingTeacher(tch);
    setFullName(tch.fullName || '');
    setEmail(tch.email || '');
    setPhone(tch.phone || '');
    setFacultyCode(tch.teacherProfile?.facultyCode || (tch.identifier && !tch.identifier.includes('@') ? tch.identifier : generateFacultyCode()));
    setDesignation(tch.teacherProfile?.designation || 'Senior Faculty');
    setSpecialization((tch.teacherProfile?.specialization || []).join(', '));
    setAvatarUrl(tch.avatarUrl || '');
    setIsModalOpen(true);
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

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = facultyCode.trim() || generateFacultyCode();

    try {
      if (editingTeacher) {
        // Optimistic UI update
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === editingTeacher.id
              ? {
                  ...t,
                  fullName,
                  email,
                  phone,
                  avatarUrl,
                  teacherProfile: {
                    ...t.teacherProfile,
                    facultyCode: finalCode,
                    designation,
                    specialization: specialization.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                }
              : t,
          ),
        );

        await api.put(`/users/teachers/${editingTeacher.id}`, {
          fullName,
          email,
          phone,
          facultyCode: finalCode,
          designation,
          specialization: specialization.split(',').map((s) => s.trim()).filter(Boolean),
          avatarUrl,
        });
      } else {
        const res = await api.post('/users/teachers', {
          fullName,
          email,
          phone,
          facultyCode: finalCode,
          designation,
          specialization: specialization.split(',').map((s) => s.trim()).filter(Boolean),
          avatarUrl,
        });
        alert(`Teacher onboarded! Temporary Password: ${res.data.rawPassword}`);
        fetchTeachers();
      }
      setIsModalOpen(false);
      setEditingTeacher(null);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save teacher');
      fetchTeachers();
    }
  };

  const handleToggleStatus = async (teacherId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    // Optimistic update
    setTeachers((prev) =>
      prev.map((t) => (t.id === teacherId ? { ...t, status: nextStatus } : t)),
    );
    try {
      await api.put(`/users/${teacherId}/status`, { status: nextStatus });
    } catch (e) {
      alert('Failed to update teacher status');
      fetchTeachers();
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    const targetId = deletingTeacher.id;
    // Optimistic update
    setTeachers((prev) => prev.filter((t) => t.id !== targetId));
    setDeletingTeacher(null);
    try {
      await api.put(`/users/${targetId}/status`, { status: 'DELETED' });
    } catch (e) {
      alert('Failed to delete teacher');
      fetchTeachers();
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const query = search.toLowerCase();
    return (
      (t.fullName || '').toLowerCase().includes(query) ||
      (t.email || '').toLowerCase().includes(query) ||
      (t.phone || '').includes(query) ||
      (t.teacherProfile?.facultyCode || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Faculty & Instructors</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full Faculty Management: Onboard, Edit profiles, Block/Unblock, and 360° Profile Analytics.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Onboard Faculty Teacher
        </button>
      </div>

      {/* Main Table / Grid Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        {/* Search Toolbar with View Toggle */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search faculty name, faculty code, email..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">{filteredTeachers.length} Faculty Listed</span>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List / Table View"
              >
                <List className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> <span className="text-[11px] hidden sm:inline">Cards</span>
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
            {/* ── VIEW MODE 1: LIST / TABLE VIEW (DEFAULT) ── */}
            {viewMode === 'list' && (
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

                        <button
                          onClick={() => handleOpenEdit(tch)}
                          className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit Teacher"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(tch.id, tch.status)}
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
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No faculty members found. Click &quot;Onboard Faculty Teacher&quot; above to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── VIEW MODE 2: CARDS GRID VIEW ── */}
        {viewMode === 'grid' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeachers.map((tch) => (
              <div
                key={tch.id}
                className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-brand-300 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    {tch.avatarUrl ? (
                      <img
                        src={tch.avatarUrl}
                        alt={tch.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold text-sm flex items-center justify-center shadow-md">
                        {tch.fullName ? tch.fullName[0] : 'T'}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">
                        {tch.teacherProfile?.facultyCode || (tch.identifier && !tch.identifier.includes('@') ? tch.identifier : '-')}
                      </span>

                      <button
                        onClick={() => handleOpenEdit(tch)}
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
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{tch.email || 'No email set'}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{tch.phone || '+97798XXXXXXXX'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
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
                      onClick={() => handleToggleStatus(tch.id, tch.status)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors border ${
                        tch.status === 'ACTIVE'
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200/80'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200/80'
                      }`}
                    >
                      {tch.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                    </button>
                  </div>

                  <Link
                    href={`/teachers/${tch.id}`}
                    className="px-3 py-1 bg-white hover:bg-brand-600 hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm transition-all flex items-center gap-1"
                  >
                    360° View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* ── SCROLLABLE ONBOARD & EDIT TEACHER MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTeacher ? `Edit Faculty: ${editingTeacher.fullName}` : 'Onboard Faculty Teacher'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Faculty credentials, designation & subject specialization.</p>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@examly.com"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value)}
                    placeholder="TCH-101"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
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
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Organic Chemistry, Thermodynamics, Botany"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-900 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" /> Granular RBAC Permissions
                </span>
                <p className="text-[11px] leading-relaxed text-purple-800">
                  After onboarding, you can grant granular permissions (e.g. Test Authoring, Community, Evaluation) in the teacher&apos;s 360 profile.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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

      {/* Delete Teacher Modal */}
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
    </div>
  );
}
