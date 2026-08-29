// apps/web/src/app/(dashboard)/curriculum/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
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

export default function CurriculumPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  useEffect(() => {
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
  }, []);

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
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Academic Curriculum & Content Hierarchy</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            4-Tier Course Structure: Batch ➡️ Subject ➡️ Lesson Chapters ➡️ Video Lectures & PDF Handouts.
          </p>
        </div>

        <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Subject to Batch
        </button>
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
        {(selectedBatch?.subjects || [
          { name: 'Physics', lessons: [{ name: '01 Kinematics & 1D Motion', _count: { videos: 4, notes: 2 } }, { name: '02 Laws of Motion & Friction', _count: { videos: 3, notes: 1 } }] },
          { name: 'Chemistry', lessons: [{ name: '01 Atomic Structure', _count: { videos: 5, notes: 3 } }, { name: '02 Chemical Bonding', _count: { videos: 4, notes: 2 } }] },
          { name: 'Zoology', lessons: [{ name: '01 Animal Tissues & Histology', _count: { videos: 3, notes: 1 } }] },
        ]).map((sub: any, idx: number) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs">
                  {sub.name[0]}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{sub.name}</h3>
              </div>
              <button className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Lesson
              </button>
            </div>

            {/* Lessons List */}
            <div className="space-y-2.5">
              {(sub.lessons || []).map((les: any, lIdx: number) => (
                <div
                  key={lIdx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">
                      {les.name}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600" />
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3 text-purple-600" /> {les._count?.videos || 2} Videos
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-emerald-600" /> {les._count?.notes || 1} Notes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
