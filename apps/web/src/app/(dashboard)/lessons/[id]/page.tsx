// apps/web/src/app/(dashboard)/lessons/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { DetailPageSkeleton } from '@/components/skeleton';
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
  getYouTubePlaylistId,
  validateVideoUrl,
  fetchYouTubeMetadata,
  fetchYouTubePlaylist,
} from '@/lib/video-utils';
import {
  FolderTree,
  Plus,
  Video,
  FileText,
  ChevronRight,
  ChevronDown,
  Folder,
  Play,
  Download,
  BookOpen,
  Sparkles,
  ArrowLeft,
  Edit2,
  Trash2,
  File,
  Upload,
  Lock,
  FileCheck2,
  CheckCircle2,
  X,
  ExternalLink,
  AlertTriangle,
  LayoutGrid,
  List,
  Layers,
  Clock,
  RotateCcw,
  Loader2,
  ListPlus,
  CheckSquare,
  Square,
  Radio,
  Tv,
} from 'lucide-react';
import { ReorderHandle } from '@/components/reorder-handle';

export default function LessonDetailPage() {
  const { user } = useAuth();
  const isStudent =
    user?.role === 'STUDENT' ||
    user?.role === 'Student' ||
    (typeof user?.role === 'object' && ((user.role as any)?.name === 'STUDENT' || (user.role as any)?.code === 'STUDENT'));

  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'resources' | 'tests'>('videos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Video Modals (Create & Edit)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState<any | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [detectedMeta, setDetectedMeta] = useState<any | null>(null);

  // YouTube Playlist Importer Modal
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);
  const [playlistData, setPlaylistData] = useState<any | null>(null);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState<{ [videoId: string]: boolean }>({});
  const [playlistTitles, setPlaylistTitles] = useState<{ [videoId: string]: string }>({});
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);

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
    { id: null, title: 'Resources' },
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

  // Real-time YouTube Metadata Detection & Auto-fill
  const handleVideoUrlChange = async (url: string) => {
    setVideoUrl(url);
    const validation = validateVideoUrl(url);
    
    // Check if it is a playlist link
    if (validation.isPlaylist) {
      setDetectedMeta({
        isPlaylist: true,
        message: 'This is a YouTube Playlist link! Click "Import as Playlist" to batch add all videos.',
      });
      setIsFetchingMeta(false);
      return;
    }

    const vid = getYouTubeVideoId(url);
    if (vid) {
      setIsFetchingMeta(true);
      try {
        const meta = await fetchYouTubeMetadata(url, api);
        if (meta) {
          setDetectedMeta(meta);
          if (meta.isValid !== false) {
            // Auto-fill video title if empty or when creating new
            if (!videoTitle || videoTitle.trim() === '' || editingVideo === null) {
              if (meta.title) setVideoTitle(meta.title);
            }
            // Auto-fill duration
            if (meta.durationMinutes) {
              setDurationMinutes(String(meta.durationMinutes));
            }
          }
        }
      } catch (err) {
        console.error('Failed to auto-detect video metadata', err);
      } finally {
        setIsFetchingMeta(false);
      }
    } else {
      if (url.trim() && !validation.isValid) {
        setDetectedMeta({
          isValid: false,
          message: validation.message || 'Invalid or malformed video link.',
        });
      } else {
        setDetectedMeta(null);
      }
      setIsFetchingMeta(false);
    }
  };

  // YouTube Playlist Importer Functions
  const handleFetchPlaylist = async (urlToFetch?: string) => {
    const target = (urlToFetch || playlistUrl).trim();
    if (!target) {
      setPlaylistError('Please enter a YouTube playlist link or ID.');
      return;
    }
    setIsFetchingPlaylist(true);
    setPlaylistError(null);
    try {
      const res = await fetchYouTubePlaylist(target, api);
      if (res && res.success && res.videos?.length > 0) {
        setPlaylistData(res);
        const initialSelected: { [key: string]: boolean } = {};
        const initialTitles: { [key: string]: string } = {};
        res.videos.forEach((v: any) => {
          initialSelected[v.videoId] = true;
          initialTitles[v.videoId] = v.title;
        });
        setSelectedPlaylistVideos(initialSelected);
        setPlaylistTitles(initialTitles);
      } else {
        setPlaylistError(res?.error || 'No videos found in playlist. Please verify the playlist link is public.');
        setPlaylistData(null);
      }
    } catch (err: any) {
      setPlaylistError(err.message || 'Failed to fetch playlist.');
      setPlaylistData(null);
    } finally {
      setIsFetchingPlaylist(false);
    }
  };

  const handleImportPlaylistVideos = async () => {
    if (!playlistData || !playlistData.videos) return;
    const toImport = playlistData.videos
      .filter((v: any) => selectedPlaylistVideos[v.videoId])
      .map((v: any) => ({
        title: playlistTitles[v.videoId] || v.title,
        videoUrl: v.videoUrl,
        durationSeconds: v.durationSeconds || 1800,
        isFreePreview: false,
      }));

    if (toImport.length === 0) {
      alert('Please select at least one video to import.');
      return;
    }

    setIsImportingPlaylist(true);
    try {
      await api.post(`/lessons/${lessonId}/videos/bulk`, { videos: toImport });
      setIsPlaylistModalOpen(false);
      setPlaylistData(null);
      setPlaylistUrl('');
      fetchLessonDetail();
    } catch (err) {
      alert('Failed to import playlist videos. Please try again.');
    } finally {
      setIsImportingPlaylist(false);
    }
  };

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

  const [draggedVideoIdx, setDraggedVideoIdx] = useState<number | null>(null);
  const [draggedNoteIdx, setDraggedNoteIdx] = useState<number | null>(null);

  const moveVideo = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentVideos = [...(lesson?.videos || [])];
    if (targetIndex < 0 || targetIndex >= currentVideos.length) return;

    const [moved] = currentVideos.splice(index, 1);
    currentVideos.splice(targetIndex, 0, moved);
    setLesson((prev: any) => ({ ...prev, videos: currentVideos }));

    try {
      await api.put('/lessons/videos/reorder', { ids: currentVideos.map((v) => v.id) });
    } catch (err) {
      fetchLessonDetail();
    }
  };

  const handleVideoDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `video:${index}`);
    setDraggedVideoIdx(index);
  };

  const handleVideoDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedVideoIdx === null || draggedVideoIdx === targetIndex) {
      setDraggedVideoIdx(null);
      return;
    }
    const currentVideos = [...(lesson?.videos || [])];
    const [moved] = currentVideos.splice(draggedVideoIdx, 1);
    currentVideos.splice(targetIndex, 0, moved);
    setLesson((prev: any) => ({ ...prev, videos: currentVideos }));
    setDraggedVideoIdx(null);

    try {
      await api.put('/lessons/videos/reorder', { ids: currentVideos.map((v) => v.id) });
    } catch (err) {
      fetchLessonDetail();
    }
  };

  const moveNote = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentNotes = [...(lesson?.notes || [])];
    if (targetIndex < 0 || targetIndex >= currentNotes.length) return;

    const [moved] = currentNotes.splice(index, 1);
    currentNotes.splice(targetIndex, 0, moved);
    setLesson((prev: any) => ({ ...prev, notes: currentNotes }));

    try {
      await api.put('/lessons/notes/reorder', { ids: currentNotes.map((n) => n.id) });
    } catch (err) {
      fetchLessonDetail();
    }
  };

  const handleNoteDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `note:${index}`);
    setDraggedNoteIdx(index);
  };

  const handleNoteDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedNoteIdx === null || draggedNoteIdx === targetIndex) {
      setDraggedNoteIdx(null);
      return;
    }
    const currentNotes = [...(lesson?.notes || [])];
    const [moved] = currentNotes.splice(draggedNoteIdx, 1);
    currentNotes.splice(targetIndex, 0, moved);
    setLesson((prev: any) => ({ ...prev, notes: currentNotes }));
    setDraggedNoteIdx(null);

    try {
      await api.put('/lessons/notes/reorder', { ids: currentNotes.map((n) => n.id) });
    } catch (err) {
      fetchLessonDetail();
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
                  {lesson.subject?.name || 'Subject'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {lesson.subject?.batch?.name || 'Batch'}
                </span>

                {/* Chapter Switcher Menu */}
                {lesson.subject?.lessons && lesson.subject.lessons.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setIsChapterMenuOpen(!isChapterMenuOpen)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-brand-600" />
                      <span>All Chapters ({lesson.subject.lessons.length})</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>

                    {isChapterMenuOpen && (
                      <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 max-h-80 overflow-y-auto space-y-1">
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {lesson.subject?.name} Chapters
                        </div>
                        {lesson.subject.lessons.map((sib: any, sibIdx: number) => {
                          const isCurrent = sib.id === lessonId;
                          return (
                            <Link
                              key={sib.id}
                              href={`/lessons/${sib.id}`}
                              onClick={() => setIsChapterMenuOpen(false)}
                              className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                                isCurrent
                                  ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] flex items-center justify-center font-mono font-bold shrink-0">
                                  {sibIdx + 1}
                                </span>
                                <span className="truncate">{sib.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                                {sib._count?.videos || 0} vids
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{lesson.name}</h1>
                {!isStudent && (
                  <button
                    onClick={() => setIsLessonEditOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
                    title="Edit Lesson"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {lesson.description || 'Chapter learning materials, video lectures, and PDF downloads.'}
              </p>
            </div>

            {!isStudent && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => {
                    setEditingVideo(null);
                    setVideoTitle('');
                    setVideoUrl('');
                    setDetectedMeta(null);
                    setIsVideoModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Video className="w-4 h-4" /> + Video
                </button>
                <button
                  onClick={() => {
                    setPlaylistUrl('');
                    setPlaylistData(null);
                    setPlaylistError(null);
                    setIsPlaylistModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                >
                  <ListPlus className="w-4 h-4" /> Import Playlist
                </button>
                <button
                  onClick={() => {
                    setEditingNote(null);
                    setNoteTitle('');
                    setNoteFileUrl('');
                    setIsNoteModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-4 h-4" /> + PDF Note
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & View Mode Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs Navigation (Horizontally scrollable on mobile) */}
        <div className="w-full sm:w-auto overflow-x-auto pb-1 -mb-1 custom-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-max min-w-full sm:min-w-0">
            {[
              { key: 'videos', label: 'Videos', icon: Video, count: lesson.videos?.length || 0 },
              { key: 'notes', label: 'Notes', icon: FileText, count: lesson.notes?.length || 0 },
              { key: 'resources', label: 'Resources', icon: FolderTree, count: lesson.resources?.length || 0 },
              { key: 'tests', label: 'Chapter Tests', icon: FileCheck2, count: lesson.tests?.length || 0 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === t.key
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.label}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                      activeTab === t.key ? 'bg-brand-50 text-brand-700' : 'bg-slate-300/60 text-slate-700'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Toggle: Cards vs List (Hidden on mobile phones, always clean cards on phone) */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl self-end sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      {/* Tab 1: Video Lectures */}
      {activeTab === 'videos' && (
        <>
          {/* Card / Grid View (Default on mobile) */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {(lesson.videos || []).map((v: any, vIdx: number) => {
                const thumb = getYouTubeThumbnailUrl(v.videoUrl);
                const isDragging = draggedVideoIdx === vIdx;

                return (
                  <div
                    key={v.id}
                    draggable={!isStudent}
                    onDragStart={(e) => handleVideoDragStart(e, vIdx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => handleVideoDrop(e, vIdx)}
                    onDragEnd={() => setDraggedVideoIdx(null)}
                    className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col justify-between ${
                      isDragging ? 'opacity-40 border-dashed border-brand-500 ring-2 ring-brand-400 scale-[0.99]' : ''
                    }`}
                  >
                    <div>
                      {/* Video Thumbnail */}
                      <Link
                        href={`/lessons/${lessonId}/videos/${v.id}`}
                        draggable={false}
                        className="h-44 bg-slate-950 block relative overflow-hidden group-hover:opacity-95 transition-opacity select-none"
                      >
                        <img
                          src={thumb}
                          alt={v.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 ml-0.5 fill-white" />
                          </div>
                        </div>

                        {v.isFreePreview && (
                          <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold shadow-md">
                            Free Preview
                          </span>
                        )}

                        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono backdrop-blur-sm">
                          {Math.floor((v.durationSeconds || 2700) / 60)} mins
                        </span>
                      </Link>

                      {/* Full-width Video Title & Lecture Index */}
                      <div className="p-4 sm:p-5 pb-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                            Lecture {vIdx + 1}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {Math.floor((v.durationSeconds || 2700) / 60)} mins
                          </span>
                        </div>
                        <Link href={`/lessons/${lessonId}/videos/${v.id}`} draggable={false} className="block select-none">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors leading-snug break-words">
                            {v.title}
                          </h3>
                        </Link>
                      </div>
                    </div>

                    {/* Bottom Action Strip */}
                    <div className="p-4 sm:p-5 pt-3 flex items-center justify-between border-t border-slate-100 mt-2">
                      <Link
                        href={`/lessons/${lessonId}/videos/${v.id}`}
                        draggable={false}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" /> Watch Video
                      </Link>

                      {!isStudent && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingVideo(v);
                              setVideoTitle(v.title);
                              setVideoUrl(v.videoUrl);
                              setDurationMinutes(String(Math.floor((v.durationSeconds || 2700) / 60)));
                              setIsFreePreview(!!v.isFreePreview);
                              setDetectedMeta(null);
                              setIsVideoModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View (Desktop Option) */
            <div className="space-y-3">
              {(lesson.videos || []).map((v: any, vIdx: number) => {
                const thumb = getYouTubeThumbnailUrl(v.videoUrl);
                const isDragging = draggedVideoIdx === vIdx;

                return (
                  <div
                    key={v.id}
                    draggable={!isStudent}
                    onDragStart={(e) => handleVideoDragStart(e, vIdx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => handleVideoDrop(e, vIdx)}
                    onDragEnd={() => setDraggedVideoIdx(null)}
                    className={`bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                      isDragging ? 'opacity-40 border-dashed border-brand-500 ring-2 ring-brand-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Video Thumbnail */}
                      <Link
                        href={`/lessons/${lessonId}/videos/${v.id}`}
                        draggable={false}
                        className="w-28 h-18 sm:w-32 sm:h-20 rounded-xl overflow-hidden bg-slate-950 relative shrink-0 block group-hover:opacity-90 transition-opacity"
                      >
                        <img src={thumb} alt={v.title} className="w-full h-full object-cover pointer-events-none" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md">
                            <Play className="w-3 h-3 fill-white ml-0.5" />
                          </div>
                        </div>
                      </Link>

                      {/* Video Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                            Lecture {vIdx + 1}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                            ⏳ {Math.floor((v.durationSeconds || 2700) / 60)} mins
                          </span>
                          {v.isFreePreview && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              Free Preview
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/lessons/${lessonId}/videos/${v.id}`}
                          draggable={false}
                          className="text-sm font-bold text-slate-900 hover:text-purple-600 transition-colors leading-snug break-words block"
                        >
                          {v.title}
                        </Link>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Link
                        href={`/lessons/${lessonId}/videos/${v.id}`}
                        draggable={false}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Watch Video
                      </Link>

                      {!isStudent && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingVideo(v);
                              setVideoTitle(v.title);
                              setVideoUrl(v.videoUrl);
                              setDurationMinutes(String(Math.floor((v.durationSeconds || 2700) / 60)));
                              setIsFreePreview(!!v.isFreePreview);
                              setDetectedMeta(null);
                              setIsVideoModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(!lesson.videos || lesson.videos.length === 0) && (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-10 text-center">
              <Video className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No video lectures attached yet</h3>
              <p className="text-xs text-slate-500 mt-1">Video lectures will appear here once published by faculty.</p>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Notes with Full Edit/Delete CRUD */}
      {activeTab === 'notes' && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {(lesson.notes || []).map((n: any, nIdx: number) => {
                const isDragging = draggedNoteIdx === nIdx;

                return (
                  <div
                    key={n.id}
                    draggable={!isStudent}
                    onDragStart={(e) => handleNoteDragStart(e, nIdx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => handleNoteDrop(e, nIdx)}
                    onDragEnd={() => setDraggedNoteIdx(null)}
                    className={`bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      isDragging ? 'opacity-40 border-dashed border-brand-500 ring-2 ring-brand-400' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug break-words select-none">{n.title}</h3>
                          <span className="text-[10px] text-slate-400 font-mono">
                            PDF Document • {(n.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      </div>

                      {!isStudent && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
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
                      )}
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
                );
              })}
            </div>
          ) : (
            /* Notes List View */
            <div className="space-y-3">
              {(lesson.notes || []).map((n: any, nIdx: number) => {
                const isDragging = draggedNoteIdx === nIdx;

                return (
                  <div
                    key={n.id}
                    draggable={!isStudent}
                    onDragStart={(e) => handleNoteDragStart(e, nIdx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => handleNoteDrop(e, nIdx)}
                    onDragEnd={() => setDraggedNoteIdx(null)}
                    className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDragging ? 'opacity-40 border-dashed border-brand-500 ring-2 ring-brand-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug break-words select-none">{n.title}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">
                          PDF Document • {(n.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <a
                        href={n.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>

                      {!isStudent && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingNote(n);
                              setNoteTitle(n.title);
                              setNoteFileUrl(n.fileUrl);
                              setIsNoteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50"
                            title="Edit Note"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingNote(n)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(!lesson.notes || lesson.notes.length === 0) && (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-10 text-center">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No notes uploaded yet</h3>
              <p className="text-xs text-slate-500 mt-1">Upload study materials, formula sheets, and DPP handouts.</p>
            </div>
          )}
        </>
      )}

      {/* Tab 3: Resources */}
      {activeTab === 'resources' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Lesson Resources & Study Files</h2>
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-slate-600 flex-wrap">
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

            {!isStudent && (
              <button
                onClick={() => setIsResourceModalOpen(true)}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Add Resource / Folder
              </button>
            )}
          </div>

          <div className="space-y-2">
            {(lesson.resources || [])
              .filter((r: any) => (currentFolderId ? r.parentId === currentFolderId : !r.parentId))
              .map((resNode: any) => (
                <div
                  key={resNode.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/70 transition-all gap-2"
                >
                  <div
                    className={`flex items-center gap-3 min-w-0 ${resNode.isFolder ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (resNode.isFolder) {
                        setCurrentFolderId(resNode.id);
                        setFolderBreadcrumbs((prev) => [...prev, { id: resNode.id, title: resNode.title }]);
                      }
                    }}
                  >
                    {resNode.isFolder ? (
                      <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20 shrink-0" />
                    ) : (
                      <File className="w-5 h-5 text-brand-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block hover:text-brand-600 truncate">
                        {resNode.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {resNode.isFolder ? 'Click to open folder' : 'Attachment File'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                    {!isStudent && (
                      <button
                        onClick={() => handleDeleteResource(resNode.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

            {(lesson.resources || []).filter((r: any) =>
              currentFolderId ? r.parentId === currentFolderId : !r.parentId
            ).length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                {currentFolderId
                  ? 'This folder is empty.'
                  : 'No folders or resources added yet.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Chapter Tests (Full Mobile Responsive) */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Chapter Quizzes & Practice Drills ({lesson.tests?.length || 0})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Quick chapter tests, concept quizzes, and past exam drills.</p>
            </div>
            {!isStudent && (
              <Link
                href={`/tests/create?lessonId=${lessonId}`}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Create Chapter Test
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(lesson.tests || []).map((t: any) => (
              <div key={t.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between hover:border-brand-300 hover:shadow-sm transition-all gap-4">
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
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{t.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-600 font-mono">
                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200/60">⏳ {t.durationMinutes} mins</span>
                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200/60">🎯 {t.totalMarks} Marks</span>
                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200/60">📝 {t.passMarks} Pass</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/tests/${t.id}`}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    Start / Take Test <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {(!lesson.tests || lesson.tests.length === 0) && (
              <div className="col-span-full bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-slate-800">No chapter quizzes attached yet</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Chapter practice drills will appear here once published by faculty.
                </p>
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
              {/* 1. YouTube Link (First input so pasting auto-fills everything) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  YouTube URL (or Cloudflare R2 MP4 Link)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)"
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Validation Warning: Playlist Link Detected */}
              {detectedMeta?.isPlaylist && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ListPlus className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-indigo-950">YouTube Playlist Detected!</h5>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        This is a playlist URL. You can import all videos from this playlist in 1 click!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaylistUrl(videoUrl);
                      setIsVideoModalOpen(false);
                      setIsPlaylistModalOpen(true);
                      handleFetchPlaylist(videoUrl);
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <ListPlus className="w-3.5 h-3.5" /> Open Playlist Batch Importer →
                  </button>
                </div>
              )}

              {/* Validation Warning: Invalid / Private Video */}
              {detectedMeta?.isValid === false && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-rose-900">Invalid Video Link</h5>
                    <p className="text-[11px] text-rose-700 mt-0.5">{detectedMeta.message}</p>
                  </div>
                </div>
              )}

              {/* 2. Instant YouTube Detection Banner */}
              {videoUrl && getYouTubeVideoId(videoUrl) && detectedMeta?.isValid !== false && !detectedMeta?.isPlaylist && (
                <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={getYouTubeThumbnailUrl(videoUrl)}
                      alt="Thumbnail Preview"
                      className="w-20 h-12 object-cover rounded-xl border border-purple-300 shadow-sm shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> YouTube Video Detected!
                        </span>
                        {isFetchingMeta && (
                          <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Fetching real title & length...
                          </span>
                        )}
                      </div>

                      {detectedMeta && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] font-mono">
                          <span className="bg-purple-100/80 text-purple-900 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-700" /> Real Length: {detectedMeta.formattedDuration}
                          </span>
                          {detectedMeta.authorName && (
                            <span className="text-purple-700 truncate max-w-[140px]">
                              by {detectedMeta.authorName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {detectedMeta?.title && videoTitle !== detectedMeta.title && (
                    <button
                      type="button"
                      onClick={() => setVideoTitle(detectedMeta.title)}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 hover:underline pt-1 border-t border-purple-200/60 w-full"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-apply Original YouTube Title: "{detectedMeta.title.slice(0, 45)}..."
                    </button>
                  )}
                </div>
              )}

              {/* 3. Customizable Display Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Video Display Name / Title</label>
                  <span className="text-[10px] text-slate-400 font-medium">Customizable</span>
                </div>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. Wave Optics 01 : Introduction & Huygens Principle"
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* 4. Duration & Free Preview */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
                  disabled={detectedMeta?.isValid === false || detectedMeta?.isPlaylist}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-purple-600/20 transition-all"
                >
                  {editingVideo ? 'Save Changes' : 'Attach Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YouTube Playlist Batch Importer Modal */}
      {isPlaylistModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import YouTube Playlist</h3>
                  <p className="text-xs text-slate-500">Batch add multiple lectures with real titles, thumbnails, and lengths</p>
                </div>
              </div>
              <button
                onClick={() => setIsPlaylistModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Playlist URL Input & Fetch Button */}
            <div className="space-y-2 shrink-0">
              <label className="block text-xs font-semibold text-slate-700">
                YouTube Playlist Link or ID
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=PL..."
                  className="flex-1 text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => handleFetchPlaylist()}
                  disabled={isFetchingPlaylist || !playlistUrl.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isFetchingPlaylist ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Fetch Videos
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {playlistError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{playlistError}</span>
              </div>
            )}

            {/* Playlist Content List */}
            {playlistData && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 space-y-3 pt-2">
                {/* Playlist Info & Select All Toolbar */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-indigo-950 truncate">
                      {playlistData.playlistTitle}
                    </h4>
                    <span className="text-[11px] text-indigo-700 font-semibold">
                      {playlistData.totalVideos} videos found in playlist
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = Object.values(selectedPlaylistVideos).every(Boolean);
                        const next: { [key: string]: boolean } = {};
                        playlistData.videos.forEach((v: any) => {
                          next[v.videoId] = !allSelected;
                        });
                        setSelectedPlaylistVideos(next);
                      }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-sm"
                    >
                      {Object.values(selectedPlaylistVideos).every(Boolean) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Videos Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                  {playlistData.videos.map((v: any, vIdx: number) => {
                    const isChecked = !!selectedPlaylistVideos[v.videoId];
                    return (
                      <div
                        key={v.videoId}
                        className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                          isChecked
                            ? 'bg-white border-indigo-200 shadow-sm'
                            : 'bg-slate-50/70 border-slate-200 opacity-60'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPlaylistVideos((prev) => ({
                              ...prev,
                              [v.videoId]: !prev[v.videoId],
                            }))
                          }
                          className="shrink-0 text-indigo-600 hover:text-indigo-700"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        {/* Thumbnail + Duration */}
                        <div className="relative w-20 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-black">
                          <img
                            src={v.thumbnailUrl}
                            alt={v.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-white text-[9px] font-mono">
                            {v.durationFormatted}
                          </span>
                        </div>

                        {/* Index Badge */}
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                          {vIdx + 1}
                        </span>

                        {/* Video Title Input (Editable) */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={playlistTitles[v.videoId] ?? v.title}
                            onChange={(e) =>
                              setPlaylistTitles((prev) => ({
                                ...prev,
                                [v.videoId]: e.target.value,
                              }))
                            }
                            className="w-full text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white p-1 rounded transition-all focus:outline-none"
                            placeholder="Video title"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-semibold">
                {playlistData
                  ? `${Object.values(selectedPlaylistVideos).filter(Boolean).length} of ${
                      playlistData.videos.length
                    } videos selected`
                  : 'Enter playlist URL above to preview'}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaylistModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                {playlistData && (
                  <button
                    type="button"
                    onClick={handleImportPlaylistVideos}
                    disabled={
                      isImportingPlaylist ||
                      Object.values(selectedPlaylistVideos).filter(Boolean).length === 0
                    }
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    {isImportingPlaylist ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing to Lesson...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Import{' '}
                        {Object.values(selectedPlaylistVideos).filter(Boolean).length} Videos
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
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
