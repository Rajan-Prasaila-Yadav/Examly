// apps/web/src/app/(dashboard)/lessons/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getYouTubeThumbnailUrl, getYouTubeVideoId } from '@/lib/video-utils';
import {
  Video,
  FileText,
  FolderTree,
  FileCheck2,
  Plus,
  ArrowLeft,
  Play,
  Download,
  Folder,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  File,
} from 'lucide-react';

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'resources' | 'tests'>('videos');
  const [isLoading, setIsLoading] = useState(true);

  // Video Modals (Create & Edit)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState<any | null>(null);

  // Note Modals (Create & Edit)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFileUrl, setNoteFileUrl] = useState('');
  const [deletingNote, setDeletingNote] = useState<any | null>(null);

  // Resource Node Modal & Hierarchical Navigation
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [isFolder, setIsFolder] = useState(false);
  const [resourceFileUrl, setResourceFileUrl] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id: string | null; title: string }[]>([
    { id: null, title: 'Root Library' },
  ]);

  // Lesson Edit Modal
  const [isLessonEditOpen, setIsLessonEditOpen] = useState(false);
  const [editLessonName, setEditLessonName] = useState('');
  const [editLessonDesc, setEditLessonDesc] = useState('');

  const fetchLessonDetail = async () => {
    try {
      const res = await api.get(`/lessons/${lessonId}`);
      setLesson(res.data);
      setEditLessonName(res.data.name);
      setEditLessonDesc(res.data.description || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) {
      fetchLessonDetail();
    }
  }, [lessonId]);

  // Video Submit (Add or Edit)
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVideo) {
        await api.put(`/lessons/videos/${editingVideo.id}`, {
          title: videoTitle,
          videoUrl,
          durationSeconds: parseInt(durationMinutes, 10) * 60 || 2700,
          isFreePreview,
        });
      } else {
        await api.post(`/lessons/${lessonId}/videos`, {
          title: videoTitle,
          videoUrl,
          durationSeconds: parseInt(durationMinutes, 10) * 60 || 2700,
          isFreePreview,
        });
      }
      setIsVideoModalOpen(false);
      setEditingVideo(null);
      setVideoTitle('');
      setVideoUrl('');
      fetchLessonDetail();
    } catch (e) {
      alert('Failed to save video');
    }
  };

  const handleDeleteVideo = async () => {
    if (!deletingVideo) return;
    try {
      await api.delete(`/lessons/videos/${deletingVideo.id}`);
      setDeletingVideo(null);
      fetchLessonDetail();
    } catch (e) {
      alert('Failed to delete video');
    }
  };

  // Note Submit (Add or Edit)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNote) {
        await api.put(`/lessons/notes/${editingNote.id}`, {
          title: noteTitle,
          fileUrl: noteFileUrl,
        });
      } else {
        await api.post(`/lessons/${lessonId}/notes`, {
          title: noteTitle,
          fileUrl: noteFileUrl || 'https://pub-2df0d2ec62c04b949be7927811dc3911.r2.dev/notes/sample-note.pdf',
          fileSizeBytes: 2450000,
        });
      }
      setIsNoteModalOpen(false);
      setEditingNote(null);
      setNoteTitle('');
      setNoteFileUrl('');
      fetchLessonDetail();
    } catch (e) {
      alert('Failed to save note');
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNote) return;
    try {
      await api.delete(`/lessons/notes/${deletingNote.id}`);
      setDeletingNote(null);
      fetchLessonDetail();
    } catch (e) {
      alert('Failed to delete note');
    }
  };

  // Resource Node Submit
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/lessons/${lessonId}/resources`, {
        title: resourceTitle,
        isFolder,
        parentId: currentFolderId || null,
        fileUrl: isFolder ? undefined : resourceFileUrl || 'https://pub-2df0d2ec62c04b949be7927811dc3911.r2.dev/sample.pdf',
        fileType: isFolder ? 'folder' : 'pdf',
      });
      setIsResourceModalOpen(false);
      setResourceTitle('');
      setResourceFileUrl('');
      fetchLessonDetail();
    } catch (e) {
      alert('Failed to add resource');
    }
  };

  const handleDeleteResource = async (nodeId: string) => {
    try {
      await api.delete(`/lessons/resources/${nodeId}`);
      fetchLessonDetail();
    } catch (e) {
      alert('Failed to delete resource');
    }
  };

  // Update Lesson Metadata
  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/lessons/${lessonId}`, {
        name: editLessonName,
        description: editLessonDesc,
      });
      setIsLessonEditOpen(false);
      fetchLessonDetail();
    } catch (e) {
      alert('Failed to update lesson');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Lesson not found.</p>
        <Link href="/batches" className="text-brand-600 text-xs font-semibold mt-2 inline-block">
          ← Back to Batches
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb Header */}
      <div>
        <Link
          href={`/batches/${lesson.subject?.batchId || ''}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {lesson.subject?.batch?.name || 'Batch'}
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
                  {lesson.subject?.name || 'Subject'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {lesson.subject?.batch?.name || 'Batch'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{lesson.name}</h1>
                <button
                  onClick={() => setIsLessonEditOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
                  title="Edit Lesson"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {lesson.description || 'Chapter learning materials, video lectures, and PDF downloads.'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  setEditingVideo(null);
                  setVideoTitle('');
                  setVideoUrl('');
                  setIsVideoModalOpen(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all"
              >
                <Video className="w-4 h-4" /> + Video Lecture
              </button>
              <button
                onClick={() => {
                  setEditingNote(null);
                  setNoteTitle('');
                  setNoteFileUrl('');
                  setIsNoteModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
              >
                <FileText className="w-4 h-4" /> + PDF Note
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
        {[
          { key: 'videos', label: 'Video Lectures', icon: Video, count: lesson.videos?.length || 0 },
          { key: 'notes', label: 'PDF Notes & Handouts', icon: FileText, count: lesson.notes?.length || 0 },
          { key: 'resources', label: 'Resource Folder Tree', icon: FolderTree, count: lesson.resources?.length || 0 },
          { key: 'tests', label: 'Chapter Tests', icon: FileCheck2, count: lesson.tests?.length || 0 },
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
              <span className="px-1.5 py-0.2 bg-slate-100 text-[10px] rounded-full text-slate-600 font-mono">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Video Lectures with Full Edit/Delete CRUD */}
      {activeTab === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(lesson.videos || []).map((v: any) => {
            const thumb = getYouTubeThumbnailUrl(v.videoUrl);

            return (
              <div
                key={v.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  <Link
                    href={`/lessons/${lessonId}/videos/${v.id}`}
                    className="h-44 bg-slate-950 block relative overflow-hidden group-hover:opacity-95 transition-opacity"
                  >
                    <img
                      src={thumb}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-0.5 fill-white" />
                      </div>
                    </div>

                    {v.isFreePreview && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold shadow-md">
                        Free Preview
                      </span>
                    )}

                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono backdrop-blur-sm">
                      {Math.floor((v.durationSeconds || 2700) / 60)} mins
                    </span>
                  </Link>

                  <div className="p-5">
                    <Link href={`/lessons/${lessonId}/videos/${v.id}`}>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                        {v.title}
                      </h3>
                    </Link>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">{v.videoUrl}</p>
                  </div>
                </div>

                <div className="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/lessons/${lessonId}/videos/${v.id}`}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    Watch Lecture <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingVideo(v);
                        setVideoTitle(v.title);
                        setVideoUrl(v.videoUrl);
                        setDurationMinutes(Math.floor(v.durationSeconds / 60).toString());
                        setIsFreePreview(v.isFreePreview);
                        setIsVideoModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Edit Video"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeletingVideo(v)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {(!lesson.videos || lesson.videos.length === 0) && (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
              <Video className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No video lectures attached yet</h3>
              <p className="text-xs text-slate-500 mt-1">Paste any YouTube URL or Cloudflare R2 MP4 video link.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: PDF Notes & Handouts with Full Edit/Delete CRUD */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(lesson.notes || []).map((n: any) => (
            <div
              key={n.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{n.title}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      PDF Document • {(n.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingNote(n);
                      setNoteTitle(n.title);
                      setNoteFileUrl(n.fileUrl);
                      setIsNoteModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-brand-600 rounded-md"
                    title="Edit Note"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingNote(n)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={n.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download Note
                </a>
              </div>
            </div>
          ))}

          {(!lesson.notes || lesson.notes.length === 0) && (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No PDF notes uploaded yet</h3>
              <p className="text-xs text-slate-500 mt-1">Upload study materials, formula sheets, and DPP handouts.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Resource Folder Tree Manager */}
      {activeTab === 'resources' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Resource Folder Tree</h2>
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-slate-600">
                {folderBreadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id || 'root'}>
                    {idx > 0 && <span className="text-slate-300">/</span>}
                    <button
                      onClick={() => {
                        const targetIdx = folderBreadcrumbs.findIndex((b) => b.id === crumb.id);
                        setCurrentFolderId(crumb.id);
                        setFolderBreadcrumbs(folderBreadcrumbs.slice(0, targetIdx + 1));
                      }}
                      className={`hover:text-brand-600 transition-colors ${
                        idx === folderBreadcrumbs.length - 1 ? 'text-brand-700 font-bold' : ''
                      }`}
                    >
                      {crumb.title}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsResourceModalOpen(true)}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Resource / Folder
            </button>
          </div>

          <div className="space-y-2">
            {(lesson.resources || [])
              .filter((r: any) => (currentFolderId ? r.parentId === currentFolderId : !r.parentId))
              .map((resNode: any) => (
                <div
                  key={resNode.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/70 transition-all"
                >
                  <div
                    className={`flex items-center gap-3 ${resNode.isFolder ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (resNode.isFolder) {
                        setCurrentFolderId(resNode.id);
                        setFolderBreadcrumbs((prev) => [...prev, { id: resNode.id, title: resNode.title }]);
                      }
                    }}
                  >
                    {resNode.isFolder ? (
                      <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                    ) : (
                      <File className="w-5 h-5 text-brand-600" />
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-900 block hover:text-brand-600">
                        {resNode.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {resNode.isFolder ? 'Click to open folder' : 'Attachment File'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {resNode.fileUrl && (
                      <a
                        href={resNode.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteResource(resNode.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

            {(lesson.resources || []).filter((r: any) =>
              currentFolderId ? r.parentId === currentFolderId : !r.parentId
            ).length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                {currentFolderId
                  ? 'This folder is empty. Click "+ Add Resource / Folder" to add items here.'
                  : 'No folders or resources added yet. Click "+ Add Resource / Folder".'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Chapter Tests */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Chapter Quizzes & Concept Tests ({lesson.tests?.length || 0})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Quick tests and past-year drills attached to this chapter.</p>
            </div>
            <Link
              href={`/tests/create?lessonId=${lessonId}`}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create Chapter Test
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(lesson.tests || []).map((t: any) => (
              <div key={t.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-brand-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      CHAPTER TEST
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      t.testStatus === 'LIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.testStatus || 'DRAFT'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{t.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                    <span>⏳ {t.durationMinutes}m</span>
                    <span>🎯 {t.totalMarks} Marks</span>
                    <span>📝 {t.passMarks} Pass</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <Link
                    href={`/tests/${t.id}`}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    Take / View Test <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {(!lesson.tests || lesson.tests.length === 0) && (
              <div className="col-span-full text-center py-10 text-slate-400 text-xs">
                No chapter tests attached to this lesson yet. Click &quot;Create Chapter Test&quot; to build a quiz.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingVideo ? 'Edit Video Lecture' : 'Attach Video Lecture'}
              </h3>
              <button onClick={() => setIsVideoModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Video Title</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. 1.1 Velocity & Acceleration Vectors"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  YouTube URL (or Cloudflare R2 MP4 Link)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              {/* Instant YouTube Thumbnail Preview */}
              {videoUrl && getYouTubeVideoId(videoUrl) && (
                <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center gap-3">
                  <img
                    src={getYouTubeThumbnailUrl(videoUrl)}
                    alt="Preview"
                    className="w-16 h-10 object-cover rounded-lg border border-purple-300"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-purple-900 block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600" /> YouTube Video Detected!
                    </span>
                    <span className="text-[10px] text-purple-700 font-mono truncate block">
                      ID: {getYouTubeVideoId(videoUrl)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isFreePreview}
                      onChange={(e) => setIsFreePreview(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                    <span className="font-semibold text-slate-700">Free Preview</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md"
                >
                  Save Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingNote ? 'Edit PDF Note' : 'Upload PDF Note / Handout'}
              </h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Note Title</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Kinematics Handwritten Formula Sheet"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cloudflare R2 PDF URL</label>
                <input
                  type="url"
                  value={noteFileUrl}
                  onChange={(e) => setNoteFileUrl(e.target.value)}
                  placeholder="https://pub-2df0d2ec62c04b949be7927811dc3911.r2.dev/notes/kinematics.pdf"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resource Node Modal */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Resource / Folder</h3>
              <button onClick={() => setIsResourceModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Resource Title</label>
                <input
                  type="text"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="e.g. Extra Problems or Folder Name"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isFolder}
                  onChange={(e) => setIsFolder(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600"
                />
                <span className="font-semibold text-slate-700">This is a folder container</span>
              </label>

              {!isFolder && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">File URL</label>
                  <input
                    type="url"
                    value={resourceFileUrl}
                    onChange={(e) => setResourceFileUrl(e.target.value)}
                    placeholder="https://pub-2df0d2ec62c04b949be7927811dc3911.r2.dev/file.pdf"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsResourceModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Video Modal */}
      {deletingVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Video?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete "{deletingVideo.title}"?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingVideo(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVideo}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Modal */}
      {deletingNote && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete PDF Note?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete "{deletingNote.title}"?
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setDeletingNote(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNote}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lesson Metadata Modal */}
      {isLessonEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Lesson Chapter</h3>
              <button onClick={() => setIsLessonEditOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lesson Name</label>
                <input
                  type="text"
                  value={editLessonName}
                  onChange={(e) => setEditLessonName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editLessonDesc}
                  onChange={(e) => setEditLessonDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsLessonEditOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md"
                >
                  Update Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
