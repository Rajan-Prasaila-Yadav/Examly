// apps/web/src/app/(dashboard)/lessons/[id]/videos/[videoId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isDirectVideo } from '@/lib/video-utils';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  ThumbsUp,
  Heart,
  Lightbulb,
  Award,
  Download,
  Pin,
  Send,
  ArrowLeft,
  ArrowRight,
  Video,
  FileText,
  FileCheck2,
  Clock,
  Sparkles,
  Shield,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import katex from 'katex';

export default function SocialVideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const lessonId = params.id as string;
  const videoId = params.videoId as string;

  const [lesson, setLesson] = useState<any>(null);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0');
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [reactionsCount, setReactionsCount] = useState<Record<string, number>>({
    LIKE: 0,
    LOVE: 0,
    HELPFUL: 0,
    BRAVO: 0,
    CELEBRATE: 0,
  });

  // Live Comments State
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchReactions = async (vidId: string) => {
    try {
      const res = await api.get(`/lessons/videos/${vidId}/reactions`);
      if (res.data) {
        setReactionsCount(res.data.counts || {});
        setSelectedReaction(res.data.userReaction || null);
      }
    } catch (e) {
      console.error('Failed to load reactions', e);
    }
  };

  const fetchComments = async (vidId: string) => {
    try {
      const res = await api.get(`/lessons/videos/${vidId}/comments`);
      setComments(res.data || []);
    } catch (e) {
      console.error('Failed to load comments', e);
    }
  };

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await api.get(`/lessons/${lessonId}`);
        setLesson(res.data);
        const v = res.data.videos?.find((x: any) => x.id === videoId) || res.data.videos?.[0];
        setCurrentVideo(v);
        if (v) {
          fetchReactions(v.id);
          fetchComments(v.id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    if (lessonId) {
      fetchLesson();
    }
  }, [lessonId, videoId]);

  const handleReact = async (type: 'LIKE' | 'LOVE' | 'HELPFUL' | 'BRAVO') => {
    if (!currentVideo) return;
    try {
      const res = await api.post(`/lessons/videos/${currentVideo.id}/reactions`, {
        reactionType: type,
      });
      if (res.data) {
        setReactionsCount(res.data.counts || {});
        setSelectedReaction(res.data.userReaction || null);
      }
    } catch (e) {
      console.error('Failed to update reaction', e);
    }
  };

  const handlePostComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const content = parentId ? replyTextMap[parentId] : commentText;
    if (!content || !content.trim() || !currentVideo) return;

    setIsPostingComment(true);
    try {
      const res = await api.post(`/lessons/videos/${currentVideo.id}/comments`, {
        content: content.trim(),
        parentId: parentId || null,
      });

      if (parentId) {
        // Append reply
        setComments((prev) =>
          prev.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies || []), res.data] } : c))
        );
        setReplyTextMap((prev) => ({ ...prev, [parentId]: '' }));
        setActiveReplyId(null);
      } else {
        // Append top-level comment
        setComments([res.data, ...comments]);
        setCommentText('');
      }
    } catch (e) {
      alert('Failed to post doubt discussion comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.delete(`/lessons/videos/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      alert('Failed to delete comment');
    }
  };

  const renderMath = (text: string) => {
    try {
      const parts = text.split(/(\$[^$]+\$)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1);
          const html = katex.renderToString(formula, { throwOnError: false, displayMode: false });
          return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={idx}>{part}</span>;
      });
    } catch (e) {
      return text;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const embedUrl = currentVideo?.videoUrl ? getYouTubeEmbedUrl(currentVideo.videoUrl, true) : null;
  const isDirect = currentVideo?.videoUrl ? isDirectVideo(currentVideo.videoUrl) : false;

  // Next video calculation
  const videoList = lesson?.videos || [];
  const currentIndex = videoList.findIndex((v: any) => v.id === currentVideo?.id);
  const nextVideo = currentIndex >= 0 && currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/lessons/${lessonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {lesson?.name || 'Lesson'}
        </Link>

        <span className="text-xs text-slate-400 font-mono">
          {lesson?.subject?.batch?.name} • {lesson?.subject?.name}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Stream Player & Details (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* 16:9 Video Player Container with Anti-Leak Watermark */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800 aspect-video group">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={currentVideo?.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : isDirect ? (
              <video
                src={currentVideo?.videoUrl}
                controls
                className="w-full h-full"
                poster={getYouTubeThumbnailUrl(currentVideo?.videoUrl)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Video className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-white">{currentVideo?.title || 'Video Lecture'}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Please attach a valid YouTube or Cloudflare R2 MP4 video URL in lesson settings.
                </p>
              </div>
            )}

            {/* Floating Anti-Leak Watermark (Nepal Compliance) */}
            <div className="absolute top-4 right-4 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1.5 border border-white/10">
              <Shield className="w-3 h-3 text-brand-400" />
              <span>{user?.fullName || 'Aarav Sharma'} • 12A-034</span>
            </div>
          </div>

          {/* Video Metadata Header */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">
                  {lesson?.subject?.name || 'Physics'}
                </span>
                {currentVideo?.isFreePreview && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Free Preview
                  </span>
                )}
                <span className="text-[11px] text-slate-400 font-mono">
                  {Math.floor((currentVideo?.durationSeconds || 2700) / 60)} Mins Duration
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-snug">{currentVideo?.title}</h1>
              <p className="text-xs text-slate-400 mt-1">1.2K views • Published by Faculty • #CEE2026 #NEET</p>
            </div>

            {/* Faculty Instructor Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold text-sm flex items-center justify-center shadow-md">
                  {lesson?.subject?.name ? lesson.subject.name[0] : 'F'}
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    {lesson?.subject?.name || 'Subject'} Faculty
                  </span>
                  <span className="text-[10px] text-brand-600 font-medium">
                    {lesson?.subject?.batch?.name || 'Academic Batch'} • Official Video Lecture
                  </span>
                </div>
              </div>
              <Link
                href={`/lessons/${lessonId}`}
                className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl transition-all"
              >
                ← Back to Chapter
              </Link>
            </div>

            {/* Single Reaction Emoji Bar & Share */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              {[
                { type: 'LIKE' as const, label: 'Like', icon: ThumbsUp, color: 'text-blue-600' },
                { type: 'LOVE' as const, label: 'Love', icon: Heart, color: 'text-rose-600' },
                { type: 'HELPFUL' as const, label: 'Helpful', icon: Lightbulb, color: 'text-amber-600' },
                { type: 'BRAVO' as const, label: 'Bravo', icon: Award, color: 'text-purple-600' },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = selectedReaction === r.type;
                const count = reactionsCount[r.type] || 0;

                return (
                  <button
                    key={r.type}
                    onClick={() => handleReact(r.type)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? r.color : 'text-slate-400'}`} />
                    <span>{r.label}</span>
                    <span className="font-mono text-[10px] font-bold">{count}</span>
                  </button>
                );
              })}

              {lesson?.notes?.length > 0 && (
                <a
                  href={lesson.notes[0].fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Download Notes
                </a>
              )}
            </div>
          </div>

          {/* Doubts & Discussion Feed */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-600" /> Academic Discussion & Doubt Forum ({comments.length})
              </h2>
            </div>

            {/* Comment Form */}
            <form onSubmit={(e) => handlePostComment(e)} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ask a question or formula doubt on this lecture (supports KaTeX $formula$)..."
                className="flex-1 text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                type="submit"
                disabled={isPostingComment || !commentText.trim()}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Post Doubt
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-4 pt-2">
              {comments.map((c) => {
                const authorName = c.author?.fullName || 'Student';
                const roleCode = c.author?.role?.code || 'STUDENT';
                const isTeacher = roleCode === 'TEACHER' || roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN';

                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                      c.isPinned ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{authorName}</span>
                        {isTeacher && (
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                            Faculty
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {c.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        <button
                          onClick={() => setActiveReplyId(activeReplyId === c.id ? null : c.id)}
                          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Reply
                        </button>
                        {(user?.id === c.userId || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed font-normal">
                      {renderMath(c.content)}
                    </div>

                    {/* Threaded Replies */}
                    {(c.replies || []).length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-brand-300 space-y-2">
                        {c.replies.map((r: any) => (
                          <div key={r.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-brand-800">
                                  {r.author?.fullName || 'Faculty'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                                </span>
                              </div>
                              {(user?.id === r.userId || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                <button
                                  onClick={() => handleDeleteComment(r.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                  title="Delete reply"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-slate-700 leading-relaxed">
                              {renderMath(r.content)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    {activeReplyId === c.id && (
                      <form onSubmit={(e) => handlePostComment(e, c.id)} className="mt-2 flex gap-2 pt-2 border-t border-slate-200">
                        <input
                          type="text"
                          value={replyTextMap[c.id] || ''}
                          onChange={(e) => setReplyTextMap({ ...replyTextMap, [c.id]: e.target.value })}
                          placeholder="Write your explanation or doubt answer..."
                          className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!replyTextMap[c.id]?.trim()}
                          className="px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                        >
                          Reply
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}

              {comments.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No academic doubts posted for this lecture yet. Be the first to ask!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Next Video Card & Lesson Playlist (1 Col) */}
        <div className="space-y-5">
          {/* Chapter Test Action Card */}
          {lesson?.tests?.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-xl space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5" /> Chapter Test Available
              </span>
              <h3 className="text-sm font-bold leading-snug">{lesson.tests[0].title}</h3>
              <p className="text-[11px] text-emerald-100 font-mono">
                {lesson.tests[0].durationMinutes} Mins • {lesson.tests[0].totalMarks} Marks
              </p>
              <Link
                href={`/tests/${lesson.tests[0].id}`}
                className="w-full py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-emerald-800" /> Start Chapter Test
              </Link>
            </div>
          )}

          {/* Next Video Countdown Card (SCR-STU-06B) */}
          {nextVideo && (
            <div className="bg-gradient-to-br from-brand-600 to-accent-indigo rounded-3xl p-5 text-white shadow-xl space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Up Next in this Course
              </span>
              <h3 className="text-sm font-bold leading-snug">{nextVideo.title}</h3>
              <p className="text-[11px] text-brand-100 font-mono">
                Duration: {Math.floor((nextVideo.durationSeconds || 2700) / 60)} Mins
              </p>

              <button
                onClick={() => router.push(`/lessons/${lessonId}/videos/${nextVideo.id}`)}
                className="w-full py-2.5 bg-white text-brand-700 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-brand-700" /> Play Next Lecture
              </button>
            </div>
          )}

          {/* Playlist Videos */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-600" /> Chapter Playlist ({videoList.length})
            </h3>

            <div className="space-y-2.5">
              {videoList.map((v: any) => {
                const isPlaying = v.id === currentVideo?.id;
                const thumb = getYouTubeThumbnailUrl(v.videoUrl);

                return (
                  <button
                    key={v.id}
                    onClick={() => setCurrentVideo(v)}
                    className={`w-full text-left p-2.5 rounded-2xl border flex items-center gap-3 transition-all ${
                      isPlaying
                        ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-500/20'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80'
                    }`}
                  >
                    <div className="w-14 h-10 rounded-xl bg-slate-900 overflow-hidden relative shrink-0">
                      <img src={thumb} alt={v.title} className="w-full h-full object-cover" />
                      {isPlaying && (
                        <div className="absolute inset-0 bg-brand-600/80 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 block truncate">{v.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.floor((v.durationSeconds || 2700) / 60)} mins
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF Notes in this Lesson */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Lesson PDF Notes ({lesson?.notes?.length || 0})
            </h3>

            <div className="space-y-2">
              {(lesson?.notes || []).map((n: any) => (
                <a
                  key={n.id}
                  href={n.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all flex items-center justify-between block group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block truncate">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(n.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB • Handout
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
