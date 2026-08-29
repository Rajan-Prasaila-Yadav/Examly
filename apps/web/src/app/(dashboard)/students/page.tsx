'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
} from 'lucide-react';

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

  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
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

  // Delete State
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);

  const fetchStudents = async () => {
    try {
      const [stuRes, batRes] = await Promise.all([
        api.get('/users/students', { params: { search } }),
        api.get('/batches'),
      ]);
      setStudents(stuRes.data || []);
      setBatches(batRes.data || []);
      if (batRes.data?.length > 0 && !batchId) {
        setBatchId(batRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const generateRollNumber = () => {
    return `RN-${Math.floor(10000 + Math.random() * 90000)}`;
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setRollNumber(generateRollNumber());
    setParentName('');
    setParentPhone('');
    setAvatarUrl('');
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
        alert('Student profile updated successfully!');
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
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save student');
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await api.put(`/users/${studentId}/status`, { status: nextStatus });
      fetchStudents();
    } catch (e) {
      alert('Failed to update student status');
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    try {
      await api.put(`/users/${deletingStudent.id}/status`, { status: 'DELETED' });
      setDeletingStudent(null);
      fetchStudents();
    } catch (e) {
      alert('Failed to delete student');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Enrolled Students Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full Student Management: Enrollment, Nepal Cascade Address, 1-Click Block/Unblock, and 360° Scorecards.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Enroll New Student
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll number, or phone..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">{students.length} Students Enrolled</span>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/50">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {students.map((stu) => (
                <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {stu.avatarUrl ? (
                        <img
                          src={stu.avatarUrl}
                          alt={stu.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold flex items-center justify-center text-xs shadow-sm">
                          {stu.fullName ? stu.fullName[0] : 'S'}
                        </div>
                      )}
                      <div>
                        <Link href={`/students/${stu.id}`} className="font-bold text-slate-900 hover:text-brand-600">
                          {stu.fullName}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{stu.phone}</span>
                          {stu.email && <span>• {stu.email}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-brand-700">
                    {stu.studentProfile?.rollNumber || (stu.identifier && !stu.identifier.includes('@') ? stu.identifier : '-')}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                      {stu.studentProfile?.batch?.name || 'Unassigned'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {stu.studentProfile?.district
                      ? `${stu.studentProfile.district}, ${stu.studentProfile.province || ''}`
                      : 'Nepal'}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        stu.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : stu.status === 'BLOCKED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
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

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/students/${stu.id}`}
                        className="px-2.5 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 text-[11px] font-bold rounded-lg transition-colors"
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
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                          stu.status === 'ACTIVE'
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
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
              ))}

              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No students found. Click &quot;Enroll New Student&quot; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

                  {/* Prominent Roll Number Field */}
                  <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-200 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-brand-900 mb-1">
                        Student Roll Number *
                      </label>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. 12A-034 or RN-10293"
                        required
                        className="w-full text-xs p-2.5 bg-white border border-brand-300 rounded-xl font-mono font-bold text-brand-700 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setRollNumber(generateRollNumber())}
                      className="mt-5 px-3 py-2 bg-brand-100 hover:bg-brand-200 text-brand-800 text-xs font-bold rounded-xl whitespace-nowrap transition-colors"
                    >
                      🎲 Generate
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number (+977) *</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
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
                        placeholder="aarav@example.com"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Nepal Address Cascade Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="block text-[11px] font-bold text-slate-700">Permanent Address (Nepal Cascade)</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Province</label>
                        <input
                          type="text"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">District</label>
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Municipality</label>
                        <input
                          type="text"
                          value={municipality}
                          onChange={(e) => setMunicipality(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Ward No.</label>
                        <input
                          type="text"
                          value={wardNumber}
                          onChange={(e) => setWardNumber(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: ACADEMIC DETAILS ── */}
              {formStep === 'academic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Assign Batch *</label>
                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="">-- Select Academic Batch --</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Guardian / Parent Phone</label>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="+9779876512345"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Admission Date</label>
                    <input
                      type="date"
                      value={admissionDate}
                      onChange={(e) => setAdmissionDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-brand-50/40 border border-brand-200 text-xs text-brand-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      <BookOpen className="w-3.5 h-3.5 text-brand-600" /> Automated Curriculum Mapping:
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                      All subjects and mock tests assigned to this batch will be instantly mapped to the student.
                    </p>
                  </div>
                </div>
              )}

              {/* ── TAB 3: ACCESS & CREDENTIALS ── */}
              {formStep === 'access' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-900 block">System Access & Login</span>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      A secure temporary password will be auto-generated for the student. They can log in using their Roll Number or Email.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                    ✔ Single-Device Security Policy active
                  </div>
                </div>
              )}

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
