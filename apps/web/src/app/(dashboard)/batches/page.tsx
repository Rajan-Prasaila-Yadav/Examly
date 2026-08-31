// apps/web/src/app/(dashboard)/batches/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  GraduationCap,
  Plus,
  Users,
  BookOpen,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Search,
  ChevronRight,
  AlertTriangle,
  FileCheck2,
  FileText,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { CardGridSkeleton } from '@/components/skeleton';
import { ReorderHandle } from '@/components/reorder-handle';

let cachedBatches: any[] = [];

export default function BatchesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const [batches, setBatches] = useState<any[]>(cachedBatches);
  const [isLoading, setIsLoading] = useState(cachedBatches.length === 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [priceNpr, setPriceNpr] = useState('14999');

  // Edit Modal
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('14999');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  // Delete Confirmation Modal
  const [deletingBatch, setDeletingBatch] = useState<any | null>(null);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      if (res.data) {
        cachedBatches = res.data;
        setBatches(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const loadingId = toast.loading('Creating batch...', `Setting up ${name}`);
    setIsCreateOpen(false);

    try {
      const res = await api.post('/batches', {
        name,
        code: code || `BATCH-${Date.now()}`,
        description,
        priceNpr: parseInt(priceNpr, 10) || 0,
      });

      setName('');
      setCode('');
      setDescription('');

      toast.dismissToast(loadingId);
      toast.success('Batch Created Successfully!', `${res.data?.name || name} is now active.`);
      await fetchBatches();
    } catch (e: any) {
      toast.dismissToast(loadingId);
      toast.error('Failed to create batch', e.response?.data?.message || 'Please check input data');
      await fetchBatches();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (b: any) => {
    setEditingBatch(b);
    setEditName(b.name);
    setEditCode(b.code);
    setEditDesc(b.description || '');
    setEditPrice((b.priceNpr || 0).toString());
    setEditStatus(b.status || 'ACTIVE');
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    const targetId = editingBatch.id;
    const targetName = editName;
    setIsSubmitting(true);
    const loadingId = toast.loading('Updating batch...', `Saving changes to ${targetName}`);
    setEditingBatch(null);

    try {
      await api.put(`/batches/${targetId}`, {
        name: editName,
        code: editCode,
        description: editDesc,
        priceNpr: parseInt(editPrice, 10) || 0,
        status: editStatus,
      });

      toast.dismissToast(loadingId);
      toast.success('Batch Updated Successfully!', `${targetName} saved.`);
      await fetchBatches();
    } catch (e: any) {
      toast.dismissToast(loadingId);
      toast.error('Failed to update batch', e.response?.data?.message || 'Error occurred');
      await fetchBatches();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHide = async (b: any) => {
    const nextStatus = b.status === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN';
    const loadingId = toast.loading('Updating visibility...', `${b.name} → ${nextStatus}`);

    try {
      await api.put(`/batches/${b.id}`, { status: nextStatus });
      toast.dismissToast(loadingId);
      toast.success(
        nextStatus === 'HIDDEN' ? 'Batch Hidden' : 'Batch Activated',
        `${b.name} is now ${nextStatus === 'HIDDEN' ? 'hidden from student view' : 'visible to enrolled students'}.`,
      );
      await fetchBatches();
    } catch (e) {
      toast.dismissToast(loadingId);
      toast.error('Failed to toggle status');
      await fetchBatches();
    }
  };

  const handleDeleteBatch = async () => {
    if (!deletingBatch) return;
    const targetId = deletingBatch.id;
    const batchName = deletingBatch.name;
    setDeletingBatch(null);
    const loadingId = toast.loading('Deleting batch...', `Archiving ${batchName}`);

    try {
      await api.delete(`/batches/${targetId}`);
      toast.dismissToast(loadingId);
      toast.success('Batch Deleted Successfully', `${batchName} has been soft deleted.`);
      await fetchBatches();
    } catch (e) {
      toast.dismissToast(loadingId);
      toast.error('Failed to delete batch');
      await fetchBatches();
    }
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    const updated = [...batches];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setBatches(updated);
    setDraggedIndex(null);

    try {
      await api.put('/batches/reorder', { ids: updated.map((b) => b.id) });
      toast.success('Batches Reordered', 'New batch order saved.');
    } catch (err) {
      console.error(err);
      fetchBatches();
    }
  };

  const moveBatch = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= batches.length) return;
    const updated = [...batches];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setBatches(updated);

    try {
      await api.put('/batches/reorder', { ids: updated.map((b) => b.id) });
      toast.success('Batches Reordered', 'New batch order saved.');
    } catch (err) {
      console.error(err);
      fetchBatches();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isStudent ? 'My Enrolled Batches' : 'Batches & Academic Classes'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStudent
              ? 'Browse your assigned classes, subjects, notes, and examinations.'
              : 'Full CRUD: Drag to reorder, Edit details, Hide/Unhide, Manage Curriculum, and Enroll students.'}
          </p>
        </div>

        {!isStudent && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Create New Batch
          </button>
        )}
      </div>

      {/* Batch Cards Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((b, idx) => (
            <div
              key={b.id}
              draggable={!isStudent}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={() => setDraggedIndex(null)}
              className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative ${
                b.status === 'HIDDEN' ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/90'
              } ${draggedIndex === idx ? 'opacity-40 border-dashed border-brand-500 ring-2 ring-brand-400/40' : ''}`}
            >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {!isStudent && (
                    <ReorderHandle
                      title="Drag or click arrows to reorder batch"
                      onMoveUp={() => moveBatch(idx, 'up')}
                      onMoveDown={() => moveBatch(idx, 'down')}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < batches.length - 1}
                    />
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-mono text-[11px] font-bold border border-brand-200/60">
                    {b.code}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {b.status === 'HIDDEN' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      <EyeOff className="w-3 h-3" /> Hidden
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}

                  {/* Edit & Delete Quick Actions (Admins & Faculty only) */}
                  {!isStudent && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                        title="Edit Batch"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleHide(b)}
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        title={b.status === 'HIDDEN' ? 'Unhide Batch' : 'Hide Batch'}
                      >
                        {b.status === 'HIDDEN' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setDeletingBatch(b)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <Link href={`/batches/${b.id}`} className="block">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors flex items-center justify-between">
                  <span>{b.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                </h3>
              </Link>
              {b.description ? (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {b.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic mt-1">Academic batch curriculum</p>
              )}

              {/* Meta Stats */}
              {isStudent ? (
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                    <span>{b.subjects?.length || b._count?.subjects || 0} Subjects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{Array.isArray(b.tests) ? b.tests.length : (b._count?.tests || 0)} Mock Tests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                    <span>{b.subjects?.reduce((acc: number, s: any) => acc + (s._count?.lessons || 0), 0) || 0} Lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>{b._count?.notes || (b.subjects?.length ? b.subjects.length : 0)} Notes & PDFs</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                    <span>{b.subjects?.length || 0} Subjects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-accent-indigo" />
                    <span>{b._count?.students || 0} Students</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Batch Fee</span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {b.priceNpr > 0 ? `NPR ${b.priceNpr.toLocaleString()}` : 'FREE'}
                </span>
              </div>

              <Link
                href={`/batches/${b.id}`}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                {isStudent ? 'View Curriculum →' : 'Manage Class →'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Create Batch Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Create New Academic Batch</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CEE 2026 Batch B"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Batch Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CEE-B"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Price (NPR)</label>
                  <input
                    type="number"
                    value={priceNpr}
                    onChange={(e) => setPriceNpr(e.target.value)}
                    placeholder="14999"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Batch curriculum summary..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-60 rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {isSubmitting ? 'Creating Batch...' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Batch ({editingBatch.code})</h3>
              <button onClick={() => setEditingBatch(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Batch Code</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Price (NPR)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Visible to Students)</option>
                  <option value="HIDDEN">HIDDEN (Faculty Only)</option>
                  <option value="ARCHIVED">ARCHIVED (Read Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-60 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {isSubmitting ? 'Updating Batch...' : 'Update Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete {deletingBatch.name}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to soft delete this batch? All curriculum and tests will be archived.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingBatch(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBatch}
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
