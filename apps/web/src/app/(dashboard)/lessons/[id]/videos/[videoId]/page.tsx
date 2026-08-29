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
  Clock,
  Sparkles,
  Shield,
  MessageSquare,
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
  const [selectedReaction, setSelectedReaction] = useState<string | null>('LIKE');
  const [reactionsCount, setReactionsCount] = useState({
    LIKE: 142,
    LOVE: 38,
    HELPFUL: 24,
    BRAVO: 18,
  });

  // Comments State
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([
    {
      id: 'c1',
      author: 'Dr. Arun Mehta (Instructor)',
      isPinned: true,
      timeAgo: '1 day ago',
      content:
        'Remember: In kinematic formula $v^2 = u^2 + 2as$, acceleration $a$ must be strictly constant throughout the motion! Pay special attention to Example 3.4 at 18:20.',
      likes: 34,
    },
    {
      id: 'c2',
      author: 'Rohan Shrestha',
      isPinned: false,
      timeAgo: '4 hours ago',
      content: 'Sir, why did we take $g = -9.8\\text{ m/s}^2$ instead of $+9.8$ at timestamp 12:45?',
      likes: 3,
      reply: {
        author: 'Dr. Arun Mehta (Instructor)',
        timeAgo: '2 hours ago',
        content: 'Because the upward vertical direction was chosen as the positive y-axis coordinate!',
        likes: 8,
      },
    },
  ]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await api.get(`/lessons/${lessonId}`);
        setLesson(res.data);
        const v = res.data.videos?.find((x: any) => x.id === videoId) || res.data.videos?.[0];
        setCurrentVideo(v);
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

  const handleReact = (type: 'LIKE' | 'LOVE' | 'HELPFUL' | 'BRAVO') => {
    if (selectedReaction === type) {
      setSelectedReaction(null);
      setReactionsCount((prev) => ({ ...prev, [type]: prev[type] - 1 }));
    } else {
      if (selectedReaction) {
        setReactionsCount((prev) => ({ ...prev, [selectedReaction]: prev[selectedReaction as keyof typeof prev] - 1 }));
      }
      setSelectedReaction(type);
      setReactionsCount((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: Date.now().toString(),
      author: user?.fullName || 'Aarav Sharma',
      isPinned: false,
      timeAgo: 'Just now',
      content: commentText,
      likes: 0,
    };

    setComments([newComment, ...comments]);
    setCommentText('');
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
                  Dr
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Dr. Arun Mehta</span>
                  <span className="text-[10px] text-brand-600 font-medium">
                    Senior Physics Faculty • 2.4K Followers
                  </span>
                </div>
              </div>
              <button className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all">
                + Follow Faculty
              </button>
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
                const count = reactionsCount[r.type];

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
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-600" /> Academic Discussion & Doubt Forum
            </h2>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ask a question or formula doubt on this timestamp..."
                className="flex-1 text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Post
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-4 pt-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                    c.isPinned ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{c.author}</span>
                      <span className="text-[10px] text-slate-400">{c.timeAgo}</span>
                    </div>

                    {c.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        <Pin className="w-3 h-3" /> Pinned by Faculty
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed font-normal">
                    {renderMath(c.content)}
                  </div>

                  {/* Reply if present */}
                  {c.reply && (
                    <div className="mt-3 pl-4 border-l-2 border-brand-300 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-700">{c.reply.author}</span>
                        <span className="text-[10px] text-slate-400">{c.reply.timeAgo}</span>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        {renderMath(c.reply.content)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Next Video Card & Lesson Playlist (1 Col) */}
        <div className="space-y-5">
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
              {videoList.map((v: any, idx: number) => {
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
