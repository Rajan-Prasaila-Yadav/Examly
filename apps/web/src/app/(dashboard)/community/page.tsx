// apps/web/src/app/(dashboard)/community/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  MessageSquare,
  Plus,
  Pin,
  Heart,
  ThumbsUp,
  Lightbulb,
  Award,
  Send,
  Sparkles,
  BarChart2,
  FileText,
  Clock,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import katex from 'katex';

export default function CommunityPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  // New Post Form
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Option 1', 'Option 2']);
  const [isPollOpen, setIsPollOpen] = useState(false);

  const fetchFeed = async () => {
    try {
      const res = await api.get('/community/feed');
      setFeed(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/community/posts', {
        title,
        contentHtml,
        isPinned,
        poll: isPollOpen && pollQuestion ? { question: pollQuestion, options: pollOptions } : undefined,
      });

      setTitle('');
      setContentHtml('');
      setIsPosting(false);
      setIsPollOpen(false);
      fetchFeed();
    } catch (e: any) {
      alert('Failed to publish post');
    }
  };

  const handleReact = async (postId: string, reactionType: string) => {
    try {
      await api.post(`/community/posts/${postId}/react`, { reactionType });
      fetchFeed();
    } catch (e) {
      console.error(e);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Community Wall & Notice Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Post institutional announcements, batch polls, formulas, and academic discussions.
          </p>
        </div>

        <button
          onClick={() => setIsPosting(!isPosting)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> {isPosting ? 'Cancel Post' : 'New Announcement'}
        </button>
      </div>

      {/* New Post Box */}
      {isPosting && (
        <form onSubmit={handleCreatePost} className="bg-white rounded-2xl border border-brand-200 p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" /> Create Announcement
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Post Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 📢 Thermodynamics & Optics Revision Plan"
              required
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Content (Supports LaTeX math like $E=mc^2$)
            </label>
            <textarea
              rows={4}
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              placeholder="Write your announcement or formula..."
              required
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
            />
          </div>

          {/* Pin toggle */}
          <div className="flex items-center gap-4 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600"
              />
              <span className="font-semibold">Pin to top of feed</span>
            </label>

            <button
              type="button"
              onClick={() => setIsPollOpen(!isPollOpen)}
              className="text-brand-600 font-semibold flex items-center gap-1 hover:underline"
            >
              <BarChart2 className="w-3.5 h-3.5" /> {isPollOpen ? 'Remove Poll' : '+ Attach Poll'}
            </button>
          </div>

          {/* Poll Builder Subform */}
          {isPollOpen && (
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2.5">
              <span className="block text-[11px] font-bold text-purple-900">Interactive Batch Poll</span>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Poll Question: e.g. Which chapter requires an extra revision session?"
                className="w-full text-xs p-2 bg-white border border-purple-200 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    className="w-full text-xs p-2 bg-white border border-purple-200 rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" /> Publish Announcement
            </button>
          </div>
        </form>
      )}

      {/* Feed Stream */}
      <div className="space-y-4">
        {feed.map((post) => (
          <div
            key={post.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
              post.isPinned ? 'border-brand-300 ring-1 ring-brand-500/20' : 'border-slate-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-indigo text-white font-bold text-xs flex items-center justify-center">
                  {post.author?.fullName ? post.author.fullName[0] : 'F'}
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{post.author?.fullName || 'Faculty'}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(post.publishedAt).toLocaleDateString()} • {post.batchId ? 'Batch Scoped' : 'All Students'}
                  </span>
                </div>
              </div>

              {post.isPinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
            </div>

            {/* Title & Body */}
            <div>
              <h2 className="text-sm font-bold text-slate-900">{post.title}</h2>
              <div className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line">
                {renderMath(post.contentHtml)}
              </div>
            </div>

            {/* Poll Widget if present */}
            {post.poll && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-purple-600" /> {post.poll.question}
                </span>
                <div className="space-y-2">
                  {post.poll.options?.map((opt: any) => (
                    <div
                      key={opt.id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between font-medium hover:border-brand-500 cursor-pointer transition-colors"
                    >
                      <span>{opt.optionText}</span>
                      <span className="font-bold text-[10px] text-slate-500 font-mono">
                        {opt._count?.votes || 0} votes
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reactions Bar (Single reaction per user) */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              {[
                { type: 'LIKE', label: 'Like', icon: ThumbsUp, color: 'text-blue-600' },
                { type: 'LOVE', label: 'Love', icon: Heart, color: 'text-rose-600' },
                { type: 'HELPFUL', label: 'Helpful', icon: Lightbulb, color: 'text-amber-600' },
                { type: 'BRAVO', label: 'Bravo', icon: Award, color: 'text-purple-600' },
              ].map((r) => {
                const Icon = r.icon;
                const count = post.reactions?.filter((x: any) => x.reactionType === r.type).length || 0;

                return (
                  <button
                    key={r.type}
                    onClick={() => handleReact(post.id, r.type)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-600 flex items-center gap-1.5 transition-all"
                  >
                    <Icon className={`w-3.5 h-3.5 ${count > 0 ? r.color : 'text-slate-400'}`} />
                    <span>{count}</span>
                  </button>
                );
              })}

              <span className="ml-auto text-[11px] text-slate-400 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {post._count?.comments || 0} Comments
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
