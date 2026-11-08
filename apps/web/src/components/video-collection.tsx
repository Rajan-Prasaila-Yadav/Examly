'use client';
import React, { useMemo, useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Play,
  ChevronLeft,
  ChevronRight,
  Video,
  Calendar,
  Filter,
  X,
  Layers,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';

type Row = Record<string, any>;

function thumbnail(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1)
        : ['youtube.com', 'm.youtube.com'].includes(host)
        ? u.searchParams.get('v') || u.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1]
        : null;
    return id && /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

function Thumb({ row }: { row: Row }) {
  const [broken, setBroken] = useState(false);
  const image = thumbnail(row.videoUrl || '');
  const seconds = Number(row.durationSeconds) || 0;
  return (
    <div className="ex-video-thumb">
      {image && !broken ? (
        <img src={image} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="ex-video-thumb-placeholder">
          <Video size={32} />
        </div>
      )}
      <span className="ex-video-play">
        <Play size={20} fill="currentColor" />
      </span>
      {seconds > 0 && (
        <span className="ex-video-duration">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  );
}

export default function VideoCollection({
  rows,
  onOpen,
  actions,
}: {
  rows: Row[];
  onOpen: (row: Row) => void;
  actions?: (row: Row) => React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [sort, setSort] = useState('order');
  const [status, setStatus] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [lessonFilter, setLessonFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);

  // Extract unique batches, subjects, and lessons from rows
  const batches = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const bId = r.batchId || r.lesson?.subject?.batchId || r.subject?.batchId;
      const bName = r.batchName || r.lesson?.subject?.batch?.name || r.subject?.batch?.name;
      if (bId && bName) map.set(bId, bName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const sId = r.subjectId || r.lesson?.subjectId || r.lesson?.subject?.id;
      const sName = r.subjectName || r.lesson?.subject?.name;
      if (sId && sName) map.set(sId, sName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const lessons = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const lId = r.lessonId || r.lesson?.id;
      const lName = r.lessonName || r.lesson?.name;
      if (lId && lName) {
        if (!subjectFilter || (r.subjectId || r.lesson?.subjectId) === subjectFilter) {
          map.set(lId, lName);
        }
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows, subjectFilter]);

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const list = rows.filter((r) => {
      // Status filter
      if (status && r.status !== status) return false;

      // Batch filter
      if (batchFilter) {
        const bId = r.batchId || r.lesson?.subject?.batchId || r.subject?.batchId;
        if (bId !== batchFilter) return false;
      }

      // Subject filter
      if (subjectFilter) {
        const sId = r.subjectId || r.lesson?.subjectId || r.lesson?.subject?.id;
        if (sId !== subjectFilter) return false;
      }

      // Lesson filter
      if (lessonFilter) {
        const lId = r.lessonId || r.lesson?.id;
        if (lId !== lessonFilter) return false;
      }

      // Date / Month filter
      if (r.createdAt) {
        const d = new Date(r.createdAt);
        const dStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';

        if (datePreset === 'today') {
          if (dStr !== todayStr) return false;
        } else if (datePreset === 'yesterday') {
          if (dStr !== yesterday) return false;
        } else if (datePreset === 'this_month') {
          if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
        } else if (datePreset === 'prev_month') {
          if (d.getMonth() !== prevMonth || d.getFullYear() !== prevMonthYear) return false;
        } else if (datePreset === 'range') {
          if (startDate && dStr < startDate) return false;
          if (endDate && dStr > endDate) return false;
        }
      }

      // Search query
      if (query.trim()) {
        const hay = [
          r.title,
          r.description,
          r.lessonName,
          r.lesson?.name,
          r.subjectName,
          r.lesson?.subject?.name,
          r.batchName,
          r.lesson?.subject?.batch?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(query.toLowerCase().trim())) return false;
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sort === 'name') return (a.title || '').localeCompare(b.title || '');
      if (sort === 'newest') return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0);
      if (sort === 'oldest') return +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0);
      // 'order' default: lesson sortOrder or title
      const oA = a.sortOrder ?? 0;
      const oB = b.sortOrder ?? 0;
      return oA - oB;
    });
  }, [
    rows,
    query,
    status,
    batchFilter,
    subjectFilter,
    lessonFilter,
    datePreset,
    startDate,
    endDate,
    sort,
  ]);

  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * pageSize, current * pageSize);

  const activeFiltersCount =
    (status ? 1 : 0) +
    (batchFilter ? 1 : 0) +
    (subjectFilter ? 1 : 0) +
    (lessonFilter ? 1 : 0) +
    (datePreset !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setStatus('');
    setBatchFilter('');
    setSubjectFilter('');
    setLessonFilter('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setQuery('');
    setPage(1);
  };

  return (
    <section className="ex-video-library" aria-label="Course videos">
      {/* Primary Toolbar */}
      <div className="ex-video-toolbar">
        <label className="ex-video-search">
          <Search size={18} />
          <input
            value={query}
            placeholder="Search videos or lessons…"
            aria-label="Search videos"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>

        {/* Quick Filters */}
        <select
          aria-label="Video status"
          className="ex-input ex-auto"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Published</option>
          <option value="HIDDEN">Hidden</option>
        </select>

        <select
          aria-label="Sort videos"
          className="ex-input ex-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="order">Lesson order</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Title A–Z</option>
        </select>

        {/* More Filters Toggle */}
        <button
          type="button"
          className={`ex-btn ghost ${showAdvanced || activeFiltersCount > 0 ? 'is-active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal size={16} />
          <span>Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
        </button>

        {/* Grid / List Switcher */}
        <div className="ex-video-switch">
          <button
            type="button"
            className={view === 'grid' ? 'is-active' : ''}
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            type="button"
            className={view === 'list' ? 'is-active' : ''}
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Advanced Cascading & Date Filter Tray */}
      {showAdvanced && (
        <div className="ex-filters-tray">
          <div className="ex-filters-grid">
            {batches.length > 0 && (
              <label className="ex-filter-item">
                <span>Batch</span>
                <select
                  className="ex-input"
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {subjects.length > 0 && (
              <label className="ex-filter-item">
                <span>Subject</span>
                <select
                  className="ex-input"
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    setLessonFilter('');
                    setPage(1);
                  }}
                >
                  <option value="">All subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {lessons.length > 0 && (
              <label className="ex-filter-item">
                <span>Lesson / Chapter</span>
                <select
                  className="ex-input"
                  value={lessonFilter}
                  onChange={(e) => {
                    setLessonFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All lessons</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="ex-filter-item">
              <span>Date / Month</span>
              <select
                className="ex-input"
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_month">This month</option>
                <option value="prev_month">Previous month</option>
                <option value="range">Custom range…</option>
              </select>
            </label>

            {datePreset === 'range' && (
              <>
                <label className="ex-filter-item">
                  <span>Start Date</span>
                  <input
                    type="date"
                    className="ex-input"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label className="ex-filter-item">
                  <span>End Date</span>
                  <input
                    type="date"
                    className="ex-input"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </>
            )}
          </div>

          <div className="ex-filter-footer">
            <button type="button" className="ex-btn ghost text-xs" onClick={clearAllFilters}>
              Reset all filters
            </button>
          </div>
        </div>
      )}

      {/* Results Header / Active Filter Pills */}
      <div className="ex-video-summary-bar">
        <span className="ex-video-count">
          <b>{filtered.length}</b> {filtered.length === 1 ? 'video' : 'videos'}
          {query && ` matching “${query}”`}
        </span>
        {activeFiltersCount > 0 && (
          <div className="ex-active-filter-chips">
            {batchFilter && (
              <span className="ex-filter-pill">
                Batch: {batches.find((b) => b.id === batchFilter)?.name || batchFilter}
                <button type="button" onClick={() => setBatchFilter('')}>
                  <X size={13} />
                </button>
              </span>
            )}
            {subjectFilter && (
              <span className="ex-filter-pill">
                Subject: {subjects.find((s) => s.id === subjectFilter)?.name || subjectFilter}
                <button type="button" onClick={() => setSubjectFilter('')}>
                  <X size={13} />
                </button>
              </span>
            )}
            {lessonFilter && (
              <span className="ex-filter-pill">
                Lesson: {lessons.find((l) => l.id === lessonFilter)?.name || lessonFilter}
                <button type="button" onClick={() => setLessonFilter('')}>
                  <X size={13} />
                </button>
              </span>
            )}
            {status && (
              <span className="ex-filter-pill">
                Status: {status === 'ACTIVE' ? 'Published' : 'Hidden'}
                <button type="button" onClick={() => setStatus('')}>
                  <X size={13} />
                </button>
              </span>
            )}
            {datePreset !== 'all' && (
              <span className="ex-filter-pill">
                Date: {datePreset.replace('_', ' ')}
                <button type="button" onClick={() => setDatePreset('all')}>
                  <X size={13} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Videos List / Grid Display */}
      {view === 'grid' ? (
        <div className="ex-video-grid-modern">
          {shown.map((r) => {
            const subjectName = r.subjectName || r.lesson?.subject?.name || '';
            const lessonName = r.lessonName || r.lesson?.name || 'Modern Physics';
            const isPublished = r.status === 'ACTIVE';

            return (
              <article key={r.id} className="ex-video-card-grid">
                <button
                  type="button"
                  className="ex-video-cover-btn"
                  onClick={() => onOpen(r)}
                  aria-label={`Play ${r.title}`}
                >
                  <Thumb row={r} />
                </button>

                <div className="ex-video-card-body">
                  <div className="ex-video-meta-row">
                    <span className="ex-lesson-tag" title={lessonName}>
                      {lessonName}
                    </span>
                    <span className={`ex-status-pill ${isPublished ? 'published' : 'hidden'}`}>
                      {isPublished ? 'Published' : 'Hidden'}
                    </span>
                  </div>

                  <h3
                    className="ex-video-card-title"
                    title={r.title}
                    onClick={() => onOpen(r)}
                    role="button"
                    tabIndex={0}
                  >
                    {r.title}
                  </h3>

                  {subjectName && <p className="ex-subject-subtitle">{subjectName}</p>}

                  <div className="ex-video-card-actions">
                    <button
                      type="button"
                      className="ex-watch-pill-btn"
                      onClick={() => onOpen(r)}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Watch video</span>
                    </button>
                    {actions && <div className="ex-actions-menu">{actions(r)}</div>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ex-video-list-modern">
          {shown.map((r) => {
            const subjectName = r.subjectName || r.lesson?.subject?.name || '';
            const lessonName = r.lessonName || r.lesson?.name || 'Modern Physics';
            const isPublished = r.status === 'ACTIVE';

            return (
              <article key={r.id} className="ex-video-card-list">
                <button
                  type="button"
                  className="ex-video-list-thumb"
                  onClick={() => onOpen(r)}
                  aria-label={`Play ${r.title}`}
                >
                  <Thumb row={r} />
                </button>

                <div className="ex-video-list-body">
                  <div className="ex-video-list-top">
                    <div className="ex-video-list-tags">
                      <span className="ex-lesson-tag" title={lessonName}>
                        {lessonName}
                      </span>
                    </div>
                    <span className={`ex-status-pill ${isPublished ? 'published' : 'hidden'}`}>
                      {isPublished ? 'Published' : 'Hidden'}
                    </span>
                  </div>

                  <h3
                    className="ex-video-card-title"
                    title={r.title}
                    onClick={() => onOpen(r)}
                    role="button"
                    tabIndex={0}
                  >
                    {r.title}
                  </h3>

                  {subjectName && <p className="ex-subject-subtitle">{subjectName}</p>}

                  <div className="ex-video-list-footer">
                    <button
                      type="button"
                      className="ex-watch-pill-btn"
                      onClick={() => onOpen(r)}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Watch video</span>
                    </button>
                    {actions && <div className="ex-actions-menu">{actions(r)}</div>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!shown.length && (
        <div className="ex-empty">
          <Video size={36} />
          <b>{rows.length ? 'No matching videos found' : 'No videos yet'}</b>
          <span>
            {rows.length
              ? 'Try adjusting your search terms, date range, or filter criteria.'
              : 'Videos added to this course or batch will appear here.'}
          </span>
          {activeFiltersCount > 0 && (
            <button type="button" className="ex-btn ghost text-xs mt-2" onClick={clearAllFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <footer className="ex-footer">
        <span>
          {filtered.length
            ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, filtered.length)}`
            : '0'}{' '}
          of {filtered.length}
        </span>
        <div className="ex-actions">
          <button
            type="button"
            className="ex-icon"
            aria-label="Previous video page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            Page {current} of {pages}
          </span>
          <button
            type="button"
            className="ex-icon"
            aria-label="Next video page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </section>
  );
}
