// apps/web/src/lib/query/use-queries.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

// ── Dashboard Queries ──
export function useStudentDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: async () => {
      const res = await api.get('/dashboard/student');
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const res = await api.get('/dashboard/admin');
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

// ── Batches & Catalog Queries ──
export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await api.get('/batches');
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useBatchDetail(batchId: string) {
  return useQuery({
    queryKey: ['batches', batchId],
    queryFn: async () => {
      const res = await api.get(`/batches/${batchId}`);
      return res.data;
    },
    enabled: !!batchId,
    staleTime: 60 * 1000,
  });
}

export function useSubjects(batchId?: string) {
  return useQuery({
    queryKey: ['subjects', batchId || 'all'],
    queryFn: async () => {
      const res = await api.get('/subjects', { params: batchId ? { batchId } : {} });
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useLessonDetail(lessonId: string) {
  return useQuery({
    queryKey: ['lessons', lessonId],
    queryFn: async () => {
      const res = await api.get(`/lessons/${lessonId}`);
      return res.data;
    },
    enabled: !!lessonId,
    staleTime: 60 * 1000,
  });
}

// ── Videos & Social (Comments / Reactions) Queries ──
export function useVideoDetail(videoId: string) {
  return useQuery({
    queryKey: ['videos', videoId],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}`);
      return res.data;
    },
    enabled: !!videoId,
    staleTime: 60 * 1000,
  });
}

export function useVideoComments(videoId: string) {
  return useQuery({
    queryKey: ['videos', videoId, 'comments'],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}/comments`);
      return res.data;
    },
    enabled: !!videoId,
    staleTime: 15 * 1000,
  });
}

export function useWatchHistory() {
  return useQuery({
    queryKey: ['videos', 'history'],
    queryFn: async () => {
      const res = await api.get('/videos/history');
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useVideoRecommendations(videoId: string) {
  return useQuery({
    queryKey: ['videos', videoId, 'recommendations'],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}/recommendations`);
      return res.data;
    },
    enabled: !!videoId,
    staleTime: 60 * 1000,
  });
}

export function useSyncWatchProgress(videoId: string) {
  return useMutation<any, Error, { progressSeconds: number; durationSeconds: number }>({
    mutationFn: async ({ progressSeconds, durationSeconds }) => {
      const res = await api.post(`/videos/${videoId}/progress`, { progressSeconds, durationSeconds });
      return res.data;
    },
  });
}

/**
 * Optimistic mutation for video comments
 */
export function useCreateComment(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { content: string; parentId?: string }, { previousComments: any }>({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const res = await api.post(`/videos/${videoId}/comments`, { content, parentId });
      return res.data;
    },
    onMutate: async (newComment) => {
      await queryClient.cancelQueries({ queryKey: ['videos', videoId, 'comments'] });
      const previousComments = queryClient.getQueryData(['videos', videoId, 'comments']);

      // Optimistically append new comment to query cache
      queryClient.setQueryData(['videos', videoId, 'comments'], (old: any[] = []) => [
        {
          id: `temp-${Date.now()}`,
          videoId,
          content: newComment.content,
          parentId: newComment.parentId || null,
          createdAt: new Date().toISOString(),
          replies: [],
          reactions: [],
          _count: { replies: 0, reactions: 0 },
        },
        ...old,
      ]);

      return { previousComments };
    },
    onError: (err, newComment, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['videos', videoId, 'comments'], context.previousComments);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', videoId, 'comments'] });
    },
  });
}

/**
 * Optimistic mutation for video reactions
 */
export function useToggleVideoReaction(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string | undefined, { previousVideo: any }>({
    mutationFn: async (reactionType = 'LIKE') => {
      const res = await api.post(`/videos/${videoId}/reactions`, { reactionType });
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['videos', videoId] });
      const previousVideo = queryClient.getQueryData(['videos', videoId]);

      // Optimistically toggle reaction count & state in video query
      queryClient.setQueryData(['videos', videoId], (old: any) => {
        if (!old) return old;
        const willReact = !old.hasReacted;
        return {
          ...old,
          hasReacted: willReact,
          _count: {
            ...old._count,
            reactions: Math.max(0, (old._count?.reactions || 0) + (willReact ? 1 : -1)),
          },
        };
      });

      return { previousVideo };
    },
    onError: (err, variables, context) => {
      if (context?.previousVideo) {
        queryClient.setQueryData(['videos', videoId], context.previousVideo);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', videoId] });
    },
  });
}

// ── Tests & Leaderboard Queries ──
export function useTests(batchId?: string) {
  return useQuery({
    queryKey: ['tests', batchId || 'all'],
    queryFn: async () => {
      const res = await api.get('/tests', { params: batchId ? { batchId } : {} });
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useTestDetail(testId: string) {
  return useQuery({
    queryKey: ['tests', testId],
    queryFn: async () => {
      const res = await api.get(`/tests/${testId}`);
      return res.data;
    },
    enabled: !!testId,
    staleTime: 30 * 1000,
  });
}

export function useTestLeaderboard(testId: string) {
  return useQuery({
    queryKey: ['tests', testId, 'leaderboard'],
    queryFn: async () => {
      const res = await api.get(`/tests/${testId}/leaderboard`);
      return res.data;
    },
    enabled: !!testId,
    staleTime: 15 * 1000,
  });
}

// ── Users (Students) Queries ──
export function useStudentsList(page = 1, limit = 50, batchId?: string, search?: string) {
  return useQuery({
    queryKey: ['users', 'students', { page, limit, batchId, search }],
    queryFn: async () => {
      const res = await api.get('/users/students', {
        params: { page, limit, ...(batchId ? { batchId } : {}), ...(search ? { search } : {}) },
      });
      return res.data;
    },
    staleTime: 15 * 1000,
  });
}

// ── Search & Faceted Filter Queries ──
export function useGlobalSearch(query: string, limit = 5) {
  return useQuery({
    queryKey: ['search', 'global', query, limit],
    queryFn: async ({ signal }) => {
      const res = await api.get('/search', {
        params: { q: query, limit },
        signal,
      });
      return res.data;
    },
    enabled: !!query && query.trim().length >= 1,
    staleTime: 30 * 1000,
  });
}

export function useFacetedSearch(params: Record<string, any>) {
  return useQuery({
    queryKey: ['search', 'faceted', params],
    queryFn: async ({ signal }) => {
      const res = await api.get('/search/faceted', {
        params,
        signal,
      });
      return res.data;
    },
    staleTime: 20 * 1000,
  });
}

