// apps/web/src/app/(dashboard)/lessons/[id]/videos/[videoId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isDirectVideo } from '@/lib/video-utils';
import { io, Socket } from 'socket.io-client';
import {
  Play,
  ThumbsUp,
  Heart,
  Lightbulb,
  Award,
  Flame,
  Download,
  Pin,
  Send,
  ArrowLeft,
  Video,
  FileText,
  FileCheck2,
  Clock,
  Sparkles,
  Shield,
  MessageSquare,
  Trash2,
  Edit2,
  CheckCircle2,
  CornerDownRight,
  MoreVertical,
  X,
  Users,
} from 'lucide-react';
import katex from 'katex';

function formatRelativeTime(dateString?: string | Date) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

export default function SocialVideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const lessonId = params.id as string;
  const videoId = params.videoId as string;

  const [lesson, setLesson] = useState<any>(null);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [reactionsCount, setReactionsCount] = useState<Record<string, number>>({
    LIKE: 0,
    LOVE: 0,
    HELPFUL: 0,
    BRAVO: 0,
    CELEBRATE: 0,
  });
  const [usersByReaction, setUsersByReaction] = useState<Record<string, any[]>>({
    LIKE: [],
    LOVE: [],
    HELPFUL: [],
    BRAVO: [],
    CELEBRATE: [],
  });

  // Reaction Users Modal
  const [viewingReactionType, setViewingReactionType] = useState<string | null>(null);
  const [reactionClickEffect, setReactionClickEffect] = useState<string | null>(null);

  // Live Comments State
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchReactions = async (vidId: string, bypassCache = true) => {
    try {
      const res = await api.get(`/lessons/videos/${vidId}/reactions`, { bypassCache });
      if (res.data) {
        setReactionsCount(res.data.counts || {});
        setUsersByReaction(res.data.usersByReaction || {});
        setSelectedReaction(res.data.userReaction || null);
      }
    } catch (e) {
      console.error('Failed to load reactions', e);
    }
  };

  const fetchComments = async (vidId: string, bypassCache = true) => {
    try {
      const res = await api.get(`/lessons/videos/${vidId}/comments`, { bypassCache });
      setComments(res.data || []);
    } catch (e) {
      console.error('Failed to load comments', e);
    }
  };

  // Helper to notify other tabs/windows in real time
  const notifyBroadcast = (action: string, payload?: any) => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window && currentVideo?.id) {
      try {
        const bc = new BroadcastChannel('examly_video_realtime');
        bc.postMessage({ videoId: currentVideo.id, action, payload, timestamp: Date.now() });
        bc.close();
      } catch (err) {
        // BroadcastChannel optional fallback
      }
    }
  };

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await api.get(`/lessons/${lessonId}`, { bypassCache: true });
        setLesson(res.data);
        const v = res.data.videos?.find((x: any) => x.id === videoId) || res.data.videos?.[0];
        setCurrentVideo(v);
        if (v) {
          fetchReactions(v.id, true);
          fetchComments(v.id, true);
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

  // ── Real-Time Live Sync: WebSockets, Multi-Tab Broadcast, and Live Heartbeat ──
  useEffect(() => {
    if (!currentVideo?.id) return;
    const vidId = currentVideo.id;

    const handleCommentsSyncData = (data: any) => {
      if (!data) return;
      const { action, payload } = data;
      if (action === 'CREATE' && payload) {
        setComments((prev) => {
          const exists = prev.some((c) => c.id === payload.id || (c.replies || []).some((r: any) => r.id === payload.id));
          if (exists) return prev;

          if (payload.parentId) {
            return prev.map((c) =>
              c.id === payload.parentId
                ? { ...c, replies: [...(c.replies || []).filter((r: any) => r.id !== payload.id), payload] }
                : c
            );
          } else {
            return [payload, ...prev.filter((c) => c.id !== payload.id)];
          }
        });
      } else if (action === 'UPDATE' && payload) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === payload.id) {
              return { ...c, content: payload.content };
            }
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map((r: any) =>
                  r.id === payload.id ? { ...r, content: payload.content } : r
                ),
              };
            }
            return c;
          })
        );
      } else if (action === 'DELETE' && payload) {
        setComments((prev) => {
          if (payload.parentId) {
            return prev.map((c) =>
              c.id === payload.parentId
                ? { ...c, replies: (c.replies || []).filter((r: any) => r.id !== payload.commentId) }
                : c
            );
          } else {
            return prev.filter((c) => c.id !== payload.commentId);
          }
        });
      } else if (action === 'REACTION' && payload) {
        setComments((prev) =>
          prev.map((c) => {
            const updateReactionsFromPayload = (target: any) => {
              let userReaction: string | null = null;
              if (user?.id) {
                for (const [rtype, uList] of Object.entries(payload.usersByReaction || {})) {
                  if (Array.isArray(uList) && uList.some((u: any) => u.id === user.id)) {
                    userReaction = rtype;
                    break;
                  }
                }
              }
              return {
                ...target,
                reactionsData: {
                  counts: payload.counts || {},
                  usersByReaction: payload.usersByReaction || {},
                  userReaction: userReaction !== null ? userReaction : target.reactionsData?.userReaction,
                  total: payload.total || 0,
                },
              };
            };

            if (payload.parentId && c.id === payload.parentId) {
              return {
                ...c,
                replies: (c.replies || []).map((r: any) =>
                  r.id === payload.commentId ? updateReactionsFromPayload(r) : r
                ),
              };
            } else if (!payload.parentId && c.id === payload.commentId) {
              return updateReactionsFromPayload(c);
            }
            return c;
          })
        );
      } else {
        fetchComments(vidId, true);
      }
    };

    // 1. Socket.IO Live Connection with Global Cloud Deployment Support
    let socket: Socket | null = null;
    try {
      let socketServerUrl = '';
      if (typeof window !== 'undefined') {
        if (API_BASE_URL.startsWith('http')) {
          socketServerUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
        } else {
          socketServerUrl = window.location.origin;
        }
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('examly_access_token') || '' : '';
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

      socket = io(`${socketServerUrl}/video`, {
        transports: ['websocket', 'polling'],
        secure: isHttps,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        auth: { token },
      });

      socket.on('connect', () => {
        socket?.emit('join_video', { videoId: vidId });
      });

      socket.on('video_reaction_updated', (data: any) => {
        if (data) {
          setReactionsCount(data.counts || {});
          setUsersByReaction(data.usersByReaction || {});
        }
      });

      socket.on('video_comments_sync', handleCommentsSyncData);
    } catch (e) {
      console.warn('Socket connection fallback to polling sync', e);
    }

    // 2. BroadcastChannel Multi-Tab Live Sync (instant <10ms sync across tabs/accounts in same browser)
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('examly_video_realtime');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.videoId === vidId) {
            if (event.data.action && event.data.payload) {
              handleCommentsSyncData({ action: event.data.action.replace('comment_', '').toUpperCase(), payload: event.data.payload });
            } else {
              fetchReactions(vidId, true);
              fetchComments(vidId, true);
            }
          }
        };
      } catch (err) {}
    }

    // 3. Fast Smart Live Heartbeat (Silent Background Poll every 2s when tab is active)
    const syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchReactions(vidId, true);
        fetchComments(vidId, true);
      }
    }, 2000);

    return () => {
      if (socket) {
        socket.emit('leave_video', { videoId: vidId });
        socket.disconnect();
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      clearInterval(syncInterval);
    };
  }, [currentVideo?.id, user?.id]);

  // Instant Optimistic Reaction Handling (Exactly 1 reaction per user)
  const handleReact = async (type: 'LIKE' | 'LOVE' | 'HELPFUL' | 'BRAVO' | 'CELEBRATE') => {
    if (!currentVideo || !user) return;

    // Visual trigger effect
    setReactionClickEffect(type);
    setTimeout(() => setReactionClickEffect(null), 600);

    const prevSelected = selectedReaction;
    const isRemoving = prevSelected === type;
    const newSelected = isRemoving ? null : type;

    // Optimistically update counts & users list immediately!
    setSelectedReaction(newSelected);
    setReactionsCount((prev) => {
      const next = { ...prev };
      if (prevSelected) {
        next[prevSelected] = Math.max(0, (next[prevSelected] || 0) - 1);
      }
      if (!isRemoving) {
        next[type] = (next[type] || 0) + 1;
      }
      return next;
    });

    setUsersByReaction((prev) => {
      const next = { ...prev };
      if (prevSelected && next[prevSelected]) {
        next[prevSelected] = next[prevSelected].filter((u: any) => u.id !== user.id);
      }
      if (!isRemoving) {
        const currentUserProfile = {
          id: user.id,
          fullName: user.fullName || 'You',
          avatarUrl: (user as any).avatarUrl || null,
          role: { code: user.role, name: user.role },
        };
        next[type] = [currentUserProfile, ...(next[type] || [])];
      }
      return next;
    });

    try {
      const res = await api.post(`/lessons/videos/${currentVideo.id}/reactions`, {
        reactionType: type,
      });
      if (res.data) {
        setReactionsCount(res.data.counts || {});
        setUsersByReaction(res.data.usersByReaction || {});
        setSelectedReaction(res.data.userReaction || null);
        notifyBroadcast('video_reaction');
      }
    } catch (e) {
      console.error('Failed to update reaction', e);
      fetchReactions(currentVideo.id);
    }
  };

  const handleCommentReact = async (
    commentId: string,
    type: 'LIKE' | 'LOVE' | 'HELPFUL',
    isReply = false,
    parentId?: string
  ) => {
    if (!user) return;

    // Optimistically update comment reactions in 0ms (1 reaction per user)
    setComments((prev) =>
      prev.map((c) => {
        const updateReactions = (target: any) => {
          const rData = target.reactionsData || { counts: { LIKE: 0, LOVE: 0, HELPFUL: 0 }, userReaction: null, usersByReaction: {} };
          const prevReaction = rData.userReaction;
          const isRemoving = prevReaction === type;
          const newReaction = isRemoving ? null : type;

          const newCounts = { ...rData.counts };
          if (prevReaction) {
            newCounts[prevReaction] = Math.max(0, (newCounts[prevReaction] || 0) - 1);
          }
          if (!isRemoving) {
            newCounts[type] = (newCounts[type] || 0) + 1;
          }

          const newUsersByReaction = { ...rData.usersByReaction };
          if (prevReaction && newUsersByReaction[prevReaction]) {
            newUsersByReaction[prevReaction] = newUsersByReaction[prevReaction].filter((u: any) => u.id !== user.id);
          }
          if (!isRemoving) {
            const currentUser = { id: user.id, fullName: user.fullName || 'You', avatarUrl: (user as any).avatarUrl, role: { code: user.role, name: user.role } };
            newUsersByReaction[type] = [currentUser, ...(newUsersByReaction[type] || [])];
          }

          return {
            ...target,
            reactionsData: {
              ...rData,
              userReaction: newReaction,
              counts: newCounts,
              usersByReaction: newUsersByReaction,
              total: Object.values(newCounts).reduce((a: any, b: any) => (a || 0) + (b || 0), 0),
            },
          };
        };

        if (isReply && parentId && c.id === parentId) {
          return {
            ...c,
            replies: (c.replies || []).map((r: any) => (r.id === commentId ? updateReactions(r) : r)),
          };
        } else if (!isReply && c.id === commentId) {
          return updateReactions(c);
        }
        return c;
      })
    );

    try {
      await api.post(`/lessons/videos/comments/${commentId}/reactions`, {
        reactionType: type,
      });
      notifyBroadcast('comment_reaction');
    } catch (e) {
      console.error('Failed to react to comment', e);
    }
  };

  // 0ms Instant Optimistic Comment and Reply Posting
  const handlePostComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const content = parentId ? replyTextMap[parentId] : commentText;
    if (!content || !content.trim() || !currentVideo || !user) return;

    const cleanContent = content.trim();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newCommentObj = {
      id: tempId,
      videoId: currentVideo.id,
      userId: user.id,
      parentId: parentId || null,
      content: cleanContent,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: user.id,
        fullName: user.fullName || 'You',
        avatarUrl: (user as any).avatarUrl || null,
        role: { code: user.role, name: user.role },
      },
      replies: [],
      reactionsData: { counts: { LIKE: 0, LOVE: 0, HELPFUL: 0 }, usersByReaction: {}, userReaction: null, total: 0 },
    };

    // 0ms Immediate optimistic insertion into UI
    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), newCommentObj] } : c
        )
      );
      setReplyTextMap((prev) => ({ ...prev, [parentId]: '' }));
      setActiveReplyId(null);
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    } else {
      setComments((prev) => [newCommentObj, ...prev]);
      setCommentText('');
    }
    notifyBroadcast('comment_post', newCommentObj);

    try {
      const res = await api.post(`/lessons/videos/${currentVideo.id}/comments`, {
        content: cleanContent,
        parentId: parentId || null,
      });

      if (res.data) {
        setComments((prev) =>
          prev.map((c) => {
            if (parentId && c.id === parentId) {
              return {
                ...c,
                replies: (c.replies || []).map((r: any) => (r.id === tempId ? { ...r, id: res.data.id } : r)),
              };
            } else if (!parentId && c.id === tempId) {
              return { ...c, id: res.data.id };
            }
            return c;
          })
        );
      }
    } catch (e) {
      alert('Failed to post doubt discussion comment');
      fetchComments(currentVideo.id, true);
    }
  };

  const handleUpdateComment = async (commentId: string, isReply = false, parentId?: string) => {
    if (!editCommentText.trim()) return;
    try {
      await api.put(`/lessons/videos/comments/${commentId}`, {
        content: editCommentText.trim(),
      });

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, content: editCommentText.trim() };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r: any) =>
                r.id === commentId ? { ...r, content: editCommentText.trim() } : r
              ),
            };
          }
          return c;
        })
      );
      setEditingCommentId(null);
      setEditCommentText('');
      notifyBroadcast('comment_update');
    } catch (e) {
      alert('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/lessons/videos/comments/${commentId}`);
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies || []).filter((r: any) => r.id !== commentId) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      notifyBroadcast('comment_delete');
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
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const embedUrl = currentVideo?.videoUrl ? getYouTubeEmbedUrl(currentVideo.videoUrl, true) : null;
  const isDirect = currentVideo?.videoUrl ? isDirectVideo(currentVideo.videoUrl) : false;

  // Next video calculation
  const videoList = lesson?.videos || [];
  const currentIndex = videoList.findIndex((v: any) => v.id === currentVideo?.id);
  const nextVideo = currentIndex >= 0 && currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null;

  const reactionConfig = [
    { type: 'LIKE' as const, label: 'Like', icon: ThumbsUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { type: 'LOVE' as const, label: 'Love', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    { type: 'HELPFUL' as const, label: 'Helpful', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { type: 'BRAVO' as const, label: 'Bravo', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { type: 'CELEBRATE' as const, label: 'Fire', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/lessons/${lessonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {lesson?.name || 'Lesson'}
        </Link>

        <span className="text-xs text-slate-500 font-semibold">
          {lesson?.subject?.batch?.name} • {lesson?.subject?.name}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Stream Player & Details (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* 16:9 Video Player Container with Anti-Leak Watermark */}
          <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-900 aspect-video group">
            {embedUrl ? (
              <iframe
                src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}modestbranding=1&rel=0&iv_load_policy=3&controls=1&showinfo=0`}
                title={currentVideo?.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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

            {/* Floating Anti-Leak Watermark */}
            <div className="absolute top-4 right-4 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1.5 border border-white/10 shadow-lg">
              <Shield className="w-3 h-3 text-purple-400" />
              <span>{user?.fullName || 'Student'} • ENROLLED</span>
            </div>
          </div>

          {/* Video Metadata Header & YouTube Channel Info */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-100">
                  {lesson?.subject?.name || 'Physics'}
                </span>
                {currentVideo?.isFreePreview && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Free Preview
                  </span>
                )}
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {Math.floor((currentVideo?.durationSeconds || 2700) / 60)} Mins Length
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-snug break-words">
                {currentVideo?.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {lesson?.subject?.batch?.name || 'Batch'} • Lecture {currentIndex + 1} of {videoList.length}
              </p>
            </div>

            {/* YouTube-Style Channel / Uploader Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Channel Avatar */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
                  {lesson?.subject?.name ? lesson.subject.name[0] : 'E'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {lesson?.subject?.name || 'Subject'} Faculty
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  </div>
                  <span className="text-[11px] text-purple-700 font-medium block truncate">
                    {lesson?.subject?.batch?.name || 'Examly Academic Program'}
                  </span>
                </div>
              </div>

              <Link
                href={`/lessons/${lessonId}`}
                className="w-full sm:w-auto text-center px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
              >
                View Chapter →
              </Link>
            </div>

            {/* Instant Reactions Bar - 2 Clean Lines on Mobile, 1 Line on Desktop */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {reactionConfig.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedReaction === r.type;
                  const count = reactionsCount[r.type] || 0;
                  const usersList = usersByReaction[r.type] || [];
                  const isPopping = reactionClickEffect === r.type;

                  return (
                    <div key={r.type} className="relative group/btn flex-1 sm:flex-initial min-w-[64px] sm:min-w-0">
                      <button
                        onClick={() => handleReact(r.type)}
                        className={`w-full sm:w-auto px-2 sm:px-3.5 py-2 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all transform active:scale-95 ${
                          isPopping ? 'scale-110' : ''
                        } ${
                          isSelected
                            ? `${r.bg} ${r.border} ${r.color} shadow-sm ring-1 ring-purple-300`
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSelected ? r.color : 'text-slate-400'} transition-transform group-hover/btn:scale-110`} />
                        <span>{r.label}</span>
                        <span className="font-mono text-[10px] sm:text-[11px] font-bold">{count}</span>
                      </button>

                      {/* Show Users Popup on Click or Pill View */}
                      {usersList.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingReactionType(r.type);
                          }}
                          title={`See who reacted with ${r.label}`}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                        >
                          <Users className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {lesson?.notes?.length > 0 && (
                  <a
                    href={lesson.notes[0].fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto sm:ml-auto px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Notes
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* YouTube-Style Academic Comments & Doubts Forum */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Comments & Doubts Forum ({comments.length})
              </h2>
            </div>

            {/* Top Comment Post Box */}
            <form onSubmit={(e) => handlePostComment(e)} className="flex items-start gap-3">
              {/* Current User Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ask a doubt or share notes on this lecture (supports KaTeX $formula$)..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />

                {commentText.trim() && (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCommentText('')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPostingComment}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" /> Comment
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4 pt-2">
              {comments.map((c) => {
                const authorName = c.author?.fullName || 'Student';
                const roleCode = c.author?.role?.code || 'STUDENT';
                const isFaculty = roleCode === 'TEACHER' || roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN';
                const isOwner = user?.id === c.userId || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
                const isEditing = editingCommentId === c.id;
                const replies = c.replies || [];
                const areRepliesExpanded = expandedReplies[c.id] || false;

                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      c.isPinned ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Author Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {c.author?.avatarUrl ? (
                          <img src={c.author.avatarUrl} alt={authorName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          authorName[0]?.toUpperCase() || 'U'
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Author Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{authorName}</span>
                            {isFaculty && (
                              <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
                                Faculty
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatRelativeTime(c.createdAt)}
                            </span>
                            {c.isPinned && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                <Pin className="w-3 h-3" /> Pinned
                              </span>
                            )}
                          </div>

                          {isOwner && !isEditing && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditCommentText(c.content);
                                }}
                                className="p-1 text-slate-400 hover:text-purple-600 rounded-md"
                                title="Edit Comment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                                title="Delete Comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Comment Content (or Edit Form) */}
                        {isEditing ? (
                          <div className="space-y-2 pt-1">
                            <input
                              type="text"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-purple-300 rounded-xl focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateComment(c.id)}
                                className="px-3.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-800 leading-relaxed break-words">
                            {renderMath(c.content)}
                          </div>
                        )}

                        {/* Reply & Comment Reaction Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-3 pt-1 flex-wrap">
                            {/* Comment Reaction Buttons (YouTube style) */}
                            <div className="flex items-center gap-1.5 bg-slate-100/70 p-0.5 px-1.5 rounded-xl border border-slate-200/60">
                              {[
                                { type: 'LIKE' as const, label: 'Like', icon: ThumbsUp, color: 'text-blue-600' },
                                { type: 'LOVE' as const, label: 'Love', icon: Heart, color: 'text-rose-600' },
                                { type: 'HELPFUL' as const, label: 'Helpful', icon: Lightbulb, color: 'text-amber-600' },
                              ].map((cr) => {
                                const Icon = cr.icon;
                                const rData = c.reactionsData || { counts: {}, userReaction: null, usersByReaction: {} };
                                const isSelected = rData.userReaction === cr.type;
                                const count = rData.counts?.[cr.type] || 0;
                                const users = rData.usersByReaction?.[cr.type] || [];

                                return (
                                  <button
                                    key={cr.type}
                                    type="button"
                                    onClick={() => handleCommentReact(c.id, cr.type)}
                                    title={users.length > 0 ? `${users.map((u: any) => u.fullName).join(', ')}` : cr.label}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                      isSelected
                                        ? 'bg-white shadow-xs text-purple-700'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    <Icon className={`w-3 h-3 ${isSelected ? cr.color : 'text-slate-400'}`} />
                                    {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => setActiveReplyId(activeReplyId === c.id ? null : c.id)}
                              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1 ml-1"
                            >
                              <CornerDownRight className="w-3.5 h-3.5" /> Reply
                            </button>

                            {replies.length > 0 && (
                              <button
                                onClick={() =>
                                  setExpandedReplies((prev) => ({
                                    ...prev,
                                    [c.id]: !areRepliesExpanded,
                                  }))
                                }
                                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 ml-auto"
                              >
                                {areRepliesExpanded
                                  ? '▲ Hide replies'
                                  : `▼ View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Inline Reply Form */}
                        {activeReplyId === c.id && (
                          <form
                            onSubmit={(e) => handlePostComment(e, c.id)}
                            className="mt-2 flex gap-2 pt-2 border-t border-slate-200"
                          >
                            <input
                              type="text"
                              value={replyTextMap[c.id] || ''}
                              onChange={(e) =>
                                setReplyTextMap({ ...replyTextMap, [c.id]: e.target.value })
                              }
                              placeholder="Write a reply or answer..."
                              className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                            <button
                              type="submit"
                              disabled={!replyTextMap[c.id]?.trim()}
                              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all"
                            >
                              Reply
                            </button>
                          </form>
                        )}

                        {/* Threaded Replies */}
                        {replies.length > 0 && areRepliesExpanded && (
                          <div className="mt-3 pl-3 border-l-2 border-purple-200 space-y-3 pt-1">
                            {replies.map((r: any) => {
                              const rAuthorName = r.author?.fullName || 'Faculty';
                              const rIsOwner = user?.id === r.userId || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
                              const isReplyEditing = editingCommentId === r.id;

                              return (
                                <div key={r.id} className="flex items-start gap-2.5">
                                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {rAuthorName[0]?.toUpperCase() || 'F'}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-bold text-slate-900">
                                          {rAuthorName}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono">
                                          {formatRelativeTime(r.createdAt)}
                                        </span>
                                      </div>

                                      {rIsOwner && !isReplyEditing && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(r.id);
                                              setEditCommentText(r.content);
                                            }}
                                            className="text-slate-400 hover:text-purple-600 p-0.5"
                                            title="Edit reply"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteComment(r.id, c.id)}
                                            className="text-slate-400 hover:text-rose-600 p-0.5"
                                            title="Delete reply"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {isReplyEditing ? (
                                      <div className="space-y-1.5">
                                        <input
                                          type="text"
                                          value={editCommentText}
                                          onChange={(e) => setEditCommentText(e.target.value)}
                                          className="w-full text-xs p-2 bg-white border border-purple-300 rounded-lg focus:outline-none"
                                        />
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setEditingCommentId(null)}
                                            className="px-2 py-0.5 text-[10px] text-slate-500"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateComment(r.id, true, c.id)}
                                            className="px-2.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="text-xs text-slate-700 leading-relaxed break-words">
                                          {renderMath(r.content)}
                                        </div>

                                        {/* Reply Reaction Buttons */}
                                        <div className="flex items-center gap-1 pt-0.5">
                                          {[
                                            { type: 'LIKE' as const, label: 'Like', icon: ThumbsUp, color: 'text-blue-600' },
                                            { type: 'LOVE' as const, label: 'Love', icon: Heart, color: 'text-rose-600' },
                                          ].map((cr) => {
                                            const Icon = cr.icon;
                                            const rData = r.reactionsData || { counts: {}, userReaction: null, usersByReaction: {} };
                                            const isSelected = rData.userReaction === cr.type;
                                            const count = rData.counts?.[cr.type] || 0;
                                            const users = rData.usersByReaction?.[cr.type] || [];

                                            return (
                                              <button
                                                key={cr.type}
                                                type="button"
                                                onClick={() => handleCommentReact(r.id, cr.type, true, c.id)}
                                                title={users.length > 0 ? `${users.map((u: any) => u.fullName).join(', ')}` : cr.label}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all ${
                                                  isSelected
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'text-slate-400 hover:text-slate-700'
                                                }`}
                                              >
                                                <Icon className={`w-2.5 h-2.5 ${isSelected ? cr.color : 'text-slate-400'}`} />
                                                {count > 0 && <span className="font-mono text-[9px]">{count}</span>}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {comments.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No comments or doubts posted yet. Be the first to start the discussion!
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

          {/* Next Video Countdown Card */}
          {nextVideo && (
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-5 text-white shadow-xl space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Up Next in this Course
              </span>
              <h3 className="text-sm font-bold leading-snug">{nextVideo.title}</h3>
              <p className="text-[11px] text-purple-100 font-mono">
                Duration: {Math.floor((nextVideo.durationSeconds || 2700) / 60)} Mins
              </p>

              <button
                onClick={() => router.push(`/lessons/${lessonId}/videos/${nextVideo.id}`)}
                className="w-full py-2.5 bg-white text-purple-700 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-purple-700" /> Play Next Lecture
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
                        ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20 shadow-sm'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80'
                    }`}
                  >
                    <div className="w-14 h-10 rounded-xl bg-slate-900 overflow-hidden relative shrink-0">
                      <img src={thumb} alt={v.title} className="w-full h-full object-cover" />
                      {isPlaying && (
                        <div className="absolute inset-0 bg-purple-600/80 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {idx + 1}. {v.title}
                      </span>
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

      {/* Reaction Users Breakdown Modal */}
      {viewingReactionType && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {reactionConfig.find((r) => r.type === viewingReactionType)?.label} Reactions
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold font-mono">
                  {usersByReaction[viewingReactionType]?.length || 0}
                </span>
              </div>
              <button
                onClick={() => setViewingReactionType(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(usersByReaction[viewingReactionType] || []).map((u: any, idx: number) => (
                <div
                  key={u.id || idx}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {u.fullName ? u.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {u.fullName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {u.role?.name || u.role?.code || 'Student'}
                    </span>
                  </div>
                </div>
              ))}

              {(!usersByReaction[viewingReactionType] || usersByReaction[viewingReactionType].length === 0) && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No users have given this reaction yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

