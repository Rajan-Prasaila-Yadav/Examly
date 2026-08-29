'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
} from 'lucide-react';

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

  const [teachers, setTeachers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
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
      setTeachers(tchRes.data || []);
      setBatches(batRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const generateFacultyCode = () => {
    return `TCH-${Math.floor(100 + Math.random() * 900)}`;
  };

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
    const finalCode = facultyCode?.trim() || generateFacultyCode();

    try {
      if (editingTeacher) {
        await api.put(`/users/teachers/${editingTeacher.id}`, {
          fullName,
          email,
          phone,
          facultyCode: finalCode,
          designation,
          specialization: specialization.split(',').map((s) => s.trim()).filter(Boolean),
          avatarUrl,
        });
        alert('Teacher profile updated successfully!');
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
      }
      setIsModalOpen(false);
      setEditingTeacher(null);
      fetchTeachers();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save teacher');
    }
  };

  const handleToggleStatus = async (teacherId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await api.put(`/users/${teacherId}/status`, { status: nextStatus });
      fetchTeachers();
    } catch (e) {
      alert('Failed to update teacher status');
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    try {
      await api.put(`/users/${deletingTeacher.id}/status`, { status: 'DELETED' });
      setDeletingTeacher(null);
      fetchTeachers();
    } catch (e) {
      alert('Failed to delete teacher');
    }
  };

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

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((tch) => (
          <div
            key={tch.id}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                {tch.avatarUrl ? (
                  <img
                    src={tch.avatarUrl}
                    alt={tch.fullName}
                    className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold text-sm flex items-center justify-center shadow-md">
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
                    title="Edit Teacher"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingTeacher(tch)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Teacher"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <Link href={`/teachers/${tch.id}`}>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors flex items-center justify-between">
                  <span>{tch.fullName}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                </h3>
              </Link>
              <p className="text-xs text-brand-600 font-medium mt-0.5">
                {tch.teacherProfile?.designation || 'Faculty Instructor'}
              </p>

              {/* Specialization Badges */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(tch.teacherProfile?.specialization || ['Curriculum Expert']).map((spec: string) => (
                  <span
                    key={spec}
                    className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{tch.email || 'No email set'}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tch.phone || '+97798XXXXXXXX'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleToggleStatus(tch.id, tch.status)}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  tch.status === 'ACTIVE'
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                {tch.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {tch.status === 'ACTIVE' ? 'Active' : 'Blocked'}
              </button>

              <Link
                href={`/teachers/${tch.id}`}
                className="px-3 py-1 bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-all"
              >
                360° View →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ── SCROLLABLE ONBOARD & EDIT TEACHER MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
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

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveTeacher} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Photo & Name */}
              <div className="flex items-center gap-4">
                <label className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-brand-500 cursor-pointer relative group overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <UserSquare2 className="w-5 h-5 text-slate-400 group-hover:text-brand-600" />
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
                    placeholder="e.g. Dr. Arun Mehta"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Faculty Code */}
              <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Faculty Code *
                  </label>
                  <input
                    type="text"
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value)}
                    placeholder="e.g. TCH-015"
                    required
                    className="w-full text-xs p-2.5 bg-white border border-purple-300 rounded-xl font-mono font-bold text-purple-700 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFacultyCode(generateFacultyCode())}
                  className="mt-5 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl whitespace-nowrap transition-colors"
                >
                  🎲 Generate
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+97798XXXXXXXX"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="faculty@examly.edu.np"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Senior Physics Faculty"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Specialization Areas (Comma separated)</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Mechanics, Modern Physics, Thermodynamics"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all"
                >
                  {editingTeacher ? 'Save Changes' : 'Onboard Faculty'}
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
                Are you sure you want to soft delete this faculty record?
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
