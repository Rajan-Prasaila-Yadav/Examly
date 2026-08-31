// apps/web/src/app/(dashboard)/curriculum/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  FolderTree,
  Plus,
  Video,
  FileText,
  ChevronRight,
  Folder,
  Play,
  Download,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { ReorderHandle } from '@/components/reorder-handle';

export default function CurriculumPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  useEffect(() => {
    if (isStudent) {
      router.replace('/batches');
      return;
    }

    const fetchBatches = async () => {
      try {
        const res = await api.get('/batches');
        setBatches(res.data);
        if (res.data.length > 0) {
          const detail = await api.get(`/batches/${res.data[0].id}`);
          setSelectedBatch(detail.data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchBatches();
  }, [isStudent, router]);

  const handleSelectBatch = async (batchId: string) => {
    try {
      const res = await api.get(`/batches/${batchId}`);
      setSelectedBatch(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isStudent ? 'Course Curriculum & Lectures' : 'Academic Curriculum & Content Hierarchy'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            4-Tier Course Structure: Batch ➡️ Subject ➡️ Lesson Chapters ➡️ Video Lectures & PDF Handouts.
          </p>
        </div>

        {!isStudent && selectedBatch?.id && (
          <Link
            href={`/batches/${selectedBatch.id}`}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Manage Subjects in Batch
          </Link>
        )}
      </div>

      {/* Batch Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit overflow-x-auto">
        {batches.map((b) => (
          <button
            key={b.id}
            onClick={() => handleSelectBatch(b.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedBatch?.id === b.id
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Subjects & Lessons Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(selectedBatch?.subjects || []).map((sub: any, idx: number) => (
          <div key={sub.id || idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {!isStudent && <ReorderHandle title="Drag to reorder subject" className="p-0.5" />}
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs">
                  {sub.name[0]}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{sub.name}</h3>
              </div>
              {!isStudent && (
                <Link
                  href={`/batches/${selectedBatch.id}`}
                  className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Manage
                </Link>
              )}
            </div>

            {/* Lessons List */}
            <div className="space-y-2.5">
              {(sub.lessons || []).map((les: any) => (
                <Link
                  key={les.id}
                  href={`/lessons/${les.id}`}
                  className="block p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-300 hover:bg-brand-50/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {!isStudent && <ReorderHandle title="Drag to reorder lesson" className="p-0" />}
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-brand-600 transition-colors truncate">
                        {les.name}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 shrink-0 ml-1" />
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3 text-purple-600" /> {les._count?.videos || 0} Videos
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-emerald-600" /> {les._count?.notes || 0} Notes
                    </span>
                  </div>
                </Link>
              ))}

              {(!sub.lessons || sub.lessons.length === 0) && (
                <p className="text-center py-4 text-xs text-slate-400">No lessons authored yet.</p>
              )}
            </div>
          </div>
        ))}

        {(!selectedBatch?.subjects || selectedBatch.subjects.length === 0) && (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No subjects assigned to this batch yet.
          </div>
        )}
      </div>
    </div>
  );
}
