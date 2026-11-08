'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getYouTubeVideoId } from '@/lib/video-utils';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  RotateCw,
  Maximize,
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  ThumbsUp,
  Heart,
  CheckCircle2,
  Check,
  ChevronDown,
  Volume2,
} from 'lucide-react';
import { IconButton } from './batch-workspace';

type R = Record<string, any>;
let youtubeReady: Promise<void> | undefined;

function loadYouTube() {
  if ((window as any).YT?.Player) return Promise.resolve();
  if (!youtubeReady) {
    youtubeReady = new Promise<void>((resolve, reject) => {
      const w = window as any;
      const old = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        old?.();
        resolve();
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        youtubeReady = undefined;
        reject(new Error('YouTube could not load.'));
      };
      document.head.appendChild(script);
    });
  }
  return youtubeReady;
}

const time = (n: number) =>
  `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2, '0')}`;

export default function ContentPlayer() {
  const params = useParams() as { id: string; videoId?: string };
  const id = params.videoId || params.id;
  const router = useRouter();
  const { user } = useAuth();

  const initialCached = typeof window !== 'undefined' ? api.getCached<R>(`/content/videos/${id}`) : null;
  const [data, setData] = useState<R | null>(initialCached);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!initialCached);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [rate, setRate] = useState(1);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [cc, setCC] = useState(false);

  const htmlVideo = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const yt = useRef<any>(null);
  const lastSync = useRef(0);
  const current = useRef({ seconds: 0, duration: 0 });
  const dataRef = useRef<R | null>(initialCached);

  const load = async (initial = false) => {
    if (initial && !dataRef.current) setLoading(true);
    try {
      const r = await api.get(`/content/videos/${id}`, { bypassCache: true, timeout: 30000 } as any);
      setData(r.data);
      dataRef.current = r.data;
      return r.data;
    } catch (e: any) {
      if (!dataRef.current) setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = api.getCached<R>(`/content/videos/${id}`);
    if (cached) {
      setData(cached);
      dataRef.current = cached;
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError('');
    setPosition(0);
    lastSync.current = 0;
    current.current = { seconds: 0, duration: 0 };
    let live = true;
    api
      .get(`/content/videos/${id}`, { timeout: 30000 } as any)
      .then((r) => {
        if (live) {
          setData(r.data);
          dataRef.current = r.data;
        }
      })
      .catch((e) => {
        if (live && !dataRef.current) setError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id, user?.id]);

  const youtubeId = data?.video?.provider === 'YOUTUBE' ? getYouTubeVideoId(data.video.videoUrl) : null;

  const sync = (force = false) => {
    const c = current.current;
    if (!c.duration || (!force && Math.abs(c.seconds - lastSync.current) < 15)) return;
    lastSync.current = c.seconds;
    api
      .post(
        `/content/videos/${id}/progress`,
        { progressSeconds: Math.floor(c.seconds), durationSeconds: Math.floor(c.duration) },
        { timeout: 30000 },
      )
      .catch(() => {
        lastSync.current = 0;
      });
  };

  useEffect(() => {
    if (!youtubeId || !frame.current) return;
    let alive = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    loadYouTube()
      .then(() => {
        if (!alive || !frame.current) return;
        const target = document.createElement('div');
        frame.current.replaceChildren(target);
        yt.current = new (window as any).YT.Player(target, {
          videoId: youtubeId,
          width: '100%',
          height: '100%',
          playerVars: {
            playsinline: 1,
            rel: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            autohide: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: any) => {
              if (!alive) return;
              e.target.setVolume(volume);
              const start = dataRef.current?.progress?.progressSeconds;
              if (start) e.target.seekTo(start, true);
              setDuration(e.target.getDuration());
            },
            onStateChange: (e: any) => {
              if (alive) setPlaying(e.data === 1);
            },
            onError: () =>
              setError('This YouTube video cannot be played here. Check that embedding is allowed and the video is available.'),
          },
        });
        interval = setInterval(() => {
          if (!yt.current?.getCurrentTime) return;
          const seconds = yt.current.getCurrentTime() || 0;
          const d = yt.current.getDuration() || 0;
          current.current = { seconds, duration: d };
          setPosition(seconds);
          setDuration(d);
          if (yt.current.getPlayerState?.() === 1) sync();
        }, 1000);
      })
      .catch((e) => setError(e.message));

    return () => {
      alive = false;
      if (interval) clearInterval(interval);
      sync(true);
      yt.current?.destroy?.();
      yt.current = null;
    };
  }, [youtubeId, id]);

  useEffect(() => () => {
    if (!youtubeId) sync(true);
  }, [id, youtubeId]);

  const seek = (n: number) => {
    const t = Math.max(0, Math.min(duration || n, n));
    if (youtubeId) yt.current?.seekTo?.(t, true);
    else if (htmlVideo.current) htmlVideo.current.currentTime = t;
    setPosition(t);
  };

  const toggle = () => {
    if (youtubeId) {
      if (playing) yt.current?.pauseVideo?.();
      else yt.current?.playVideo?.();
    } else if (htmlVideo.current) {
      if (htmlVideo.current.paused) {
        htmlVideo.current.play().catch(() => setError('Playback could not start. Try the player controls.'));
      } else {
        htmlVideo.current.pause();
      }
    }
  };

  const action = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      return true;
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const next = data?.playlist?.[data.playlist.findIndex((v: R) => v.id === id) + 1];

  if (loading && !data) return <div className="batch-prototype ex-card ex-empty" role="status">Loading video…</div>;
  if (!data)
    return (
      <div className="batch-prototype">
        <p className="ex-error" role="alert">{error || 'Video unavailable'}</p>
        <button className="ex-btn" onClick={() => load(true)}>Retry</button>
      </div>
    );

  const v = data.video;
  const safe = /^https?:\/\//i.test(v.videoUrl);
  const playlist = (data.playlist || []).filter((r: R) =>
    [r.title, r.lesson?.name].join(' ').toLowerCase().includes(search.toLowerCase()),
  );

  const commentTree = (parentId: string | null = null, depth = 0): React.ReactNode =>
    depth > 5
      ? null
      : data.comments
          ?.filter((c: R) => c.parentId === parentId)
          .map((c: R) => (
            <article className="ex-comment" key={c.id} style={{ marginLeft: depth ? 14 : 0 }}>
              <b>{c.author}</b>
              <small>{new Date(c.createdAt).toLocaleString()}</small>
              <p>{c.content}</p>
              <button className="ex-text-button ex-muted" onClick={() => setReply(c)}>
                Reply
              </button>
              {commentTree(c.id, depth + 1)}
            </article>
          ));

  return (
    <div className="batch-prototype ex-workspace ex-player-page">
      {/* Top Breadcrumb Nav */}
      <Link className="ex-back" href={`/lessons/${v.lessonId}`}>
        <ArrowLeft size={16} />
        <span>
          {data.lesson.subject.name} › {data.lesson.name}
        </span>
      </Link>

      {error && <p className="ex-error" role="alert">{error}</p>}

      <div className="ex-player-grid">
        {/* Left Column: Player, Video Info, Notes, Comments */}
        <div className="ex-player-main-col">
          {/* Main Video Frame */}
          <div className="ex-video-frame" ref={container}>
            <div className="ex-video-stage" style={{ filter: `brightness(${brightness}%)` }}>
              {youtubeId ? (
                <div className="ex-youtube-wrap">
                  <div className="ex-youtube" ref={frame} />
                  <div
                    className="ex-video-click-shield"
                    onClick={toggle}
                    onDoubleClick={() => {
                      if (!document.fullscreenElement) {
                        container.current?.requestFullscreen?.();
                      } else {
                        document.exitFullscreen?.();
                      }
                    }}
                    title={playing ? 'Click to pause · Double click for fullscreen' : 'Click to play · Double click for fullscreen'}
                  />
                </div>
              ) : safe ? (
                <video
                  ref={htmlVideo}
                  src={v.videoUrl}
                  controls
                  playsInline
                  controlsList={v.allowDownload ? undefined : 'nodownload'}
                  crossOrigin={v.subtitleUrl ? 'anonymous' : undefined}
                  onLoadedMetadata={(e) => {
                    const el = e.currentTarget;
                    setDuration(el.duration);
                    el.volume = volume / 100;
                    el.currentTime = Math.min(data.progress?.progressSeconds || 0, el.duration);
                  }}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    setPosition(el.currentTime);
                    current.current = { seconds: el.currentTime, duration: el.duration };
                    sync();
                  }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => {
                    setPlaying(false);
                    sync(true);
                  }}
                  onEnded={() => {
                    sync(true);
                    setPlaying(false);
                  }}
                  onError={() => setError('Video could not load. Check the media URL and storage access.')}
                >
                  {v.subtitleUrl && <track src={v.subtitleUrl} kind="subtitles" label="Subtitles" srcLang="en" />}
                </video>
              ) : (
                <p>Invalid media URL.</p>
              )}
            </div>

            {v.watermark && <span className="ex-watermark">{user?.fullName}</span>}

            {/* Custom Bottom Video Controls Bar */}
            <div className="ex-video-controls">
              <input
                aria-label="Seek video"
                type="range"
                min="0"
                max={duration || 1}
                value={Math.min(position, duration || 1)}
                onChange={(e) => seek(+e.target.value)}
              />
              <div className="ex-toolbar">
                <IconButton title={playing ? 'Pause' : 'Play'} onClick={toggle}>
                  {playing ? <Pause size={19} /> : <Play size={19} />}
                </IconButton>
                <IconButton title="Back 10 seconds" onClick={() => seek(position - 10)}>
                  <RotateCcw size={18} />
                </IconButton>
                <IconButton title="Forward 10 seconds" onClick={() => seek(position + 10)}>
                  <RotateCw size={18} />
                </IconButton>
                <IconButton
                  title="Next video"
                  disabled={!next}
                  onClick={() => next && router.push(`/videos/${next.id}`)}
                >
                  <SkipForward size={18} />
                </IconButton>
                <small className="ex-grow">
                  {time(position)} / {time(duration)}
                </small>

                <label className="ex-volume">
                  <Volume2 size={16} />
                  <input
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => {
                      setVolume(+e.target.value);
                      if (youtubeId) yt.current?.setVolume?.(+e.target.value);
                      else if (htmlVideo.current) htmlVideo.current.volume = +e.target.value / 100;
                    }}
                  />
                </label>

                <select
                  aria-label="Playback speed"
                  value={rate}
                  onChange={(e) => {
                    setRate(+e.target.value);
                    if (youtubeId) yt.current?.setPlaybackRate?.(+e.target.value);
                    else if (htmlVideo.current) htmlVideo.current.playbackRate = +e.target.value;
                  }}
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <option key={r} value={r}>
                      {r}×
                    </option>
                  ))}
                </select>

                {!youtubeId && v.subtitleUrl && (
                  <button
                    title="Toggle subtitles"
                    onClick={() => {
                      const track = htmlVideo.current?.textTracks[0];
                      if (track) track.mode = cc ? 'hidden' : 'showing';
                      setCC(!cc);
                    }}
                  >
                    CC
                  </button>
                )}

                <IconButton
                  title="Full screen"
                  onClick={() => {
                    if (document.fullscreenElement) document.exitFullscreen();
                    else container.current?.requestFullscreen().catch(() => setError('Fullscreen is unavailable.'));
                  }}
                >
                  <Maximize size={19} />
                </IconButton>
              </div>
            </div>
          </div>

          {/* Video Metadata Card with Pills & Brightness */}
          <div className="ex-card ex-player-card">
            <div className="ex-player-card-head">
              <div className="ex-player-titles">
                <h2 className="ex-player-video-title">{v.title}</h2>
                <p className="ex-player-subtext">
                  {data.lesson.subject.name} › {data.lesson.name} · {new Date(v.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Reaction Pills matching Image 1 */}
              <div className="ex-reaction-pills-row">
                <button
                  type="button"
                  className={`ex-reaction-pill-btn ${data.reactions?.mine === 'LIKE' ? 'is-active' : ''}`}
                  disabled={busy}
                  onClick={() =>
                    action(() => api.post(`/content/videos/${id}/reactions`, { reactionType: 'LIKE' }))
                  }
                >
                  <ThumbsUp size={15} fill={data.reactions?.mine === 'LIKE' ? 'currentColor' : 'none'} />
                  <span>{data.reactions?.LIKE || 0}</span>
                </button>
                <button
                  type="button"
                  className={`ex-reaction-pill-btn ${data.reactions?.mine === 'LOVE' ? 'is-active' : ''}`}
                  disabled={busy}
                  onClick={() =>
                    action(() => api.post(`/content/videos/${id}/reactions`, { reactionType: 'LOVE' }))
                  }
                >
                  <Heart size={15} fill={data.reactions?.mine === 'LOVE' ? 'currentColor' : 'none'} />
                  <span>{data.reactions?.LOVE || 0}</span>
                </button>
              </div>
            </div>

            {v.description && <p className="ex-video-desc-text">{v.description}</p>}

            {/* Brightness Slider */}
            <div className="ex-brightness-toolbar">
              <label className="ex-brightness-control">
                <span>Brightness</span>
                <input
                  aria-label="Brightness"
                  type="range"
                  min="40"
                  max="160"
                  value={brightness}
                  onChange={(e) => setBrightness(+e.target.value)}
                />
              </label>
              {v.allowDownload && !youtubeId && safe && (
                <a className="ex-btn ghost text-xs" href={v.videoUrl} target="_blank" rel="noreferrer">
                  Open video file
                </a>
              )}
            </div>
          </div>

          {/* My Notes Section matching Image 1 */}
          <section className="ex-card ex-player-card">
            <h3 className="ex-section-title">My notes</h3>
            <form
              className="ex-toolbar ex-note-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await action(() =>
                    api.post(
                      `/content/videos/${id}/personal-notes`,
                      { seconds: Math.floor(position), text: note },
                      { timeout: 30000 },
                    ),
                  )
                ) {
                  setNote('');
                }
              }}
            >
              <input
                className="ex-input ex-grow"
                placeholder="Write a note for this moment…"
                value={note}
                required
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="ex-btn" disabled={busy}>
                <Plus size={16} />
                <span>Add note</span>
              </button>
            </form>
            {data.notes?.map((n: R) => (
              <div className="ex-row" key={n.id}>
                <button type="button" className="ex-chip" onClick={() => seek(n.seconds)}>
                  {time(n.seconds)}
                </button>
                <span className="ex-grow">{n.text}</span>
                <IconButton
                  title="Delete personal note"
                  disabled={busy}
                  onClick={() =>
                    action(() => api.delete(`/content/videos/${id}/personal-notes/${n.id}`, { data: {} }))
                  }
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            ))}
          </section>

          {/* Comments Section */}
          <section className="ex-card ex-player-card">
            <h3 className="ex-section-title">Comments</h3>
            {reply && (
              <p className="ex-muted">
                Replying to {reply.author}{' '}
                <button type="button" onClick={() => setReply(null)}>
                  × Cancel
                </button>
              </p>
            )}
            <form
              className="ex-toolbar"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await action(() =>
                    api.post(
                      `/content/videos/${id}/comments`,
                      { content: comment, ...(reply ? { parentId: reply.id } : {}) },
                      { timeout: 30000 },
                    ),
                  )
                ) {
                  setComment('');
                  setReply(null);
                }
              }}
            >
              <input
                className="ex-input ex-grow"
                placeholder="Add a comment…"
                value={comment}
                required
                maxLength={2000}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="ex-btn" disabled={busy}>
                Post
              </button>
            </form>
            {commentTree()}
            {!data.comments?.length && <p className="ex-muted">No comments yet.</p>}
          </section>
        </div>

        {/* Right Column: "Course videos" Sidebar matching Image 1 and Image 2 */}
        <aside className="ex-card ex-course-videos-modern">
          <h3 className="ex-course-sidebar-title">Course videos</h3>

          <div className="ex-course-search-wrap">
            <Search size={16} />
            <input
              className="ex-input"
              aria-label="Search course videos"
              placeholder="Search subject, lesson, video…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ex-course-scroll-container">
            {Array.from(new Set(playlist.map((r: R) => r.lesson?.name || 'Lessons'))).map((lessonName: string) => {
              const lessonVideos = playlist.filter((r: R) => (r.lesson?.name || 'Lessons') === lessonName);

              return (
                <details key={lessonName} open className="ex-course-accordion">
                  <summary className="ex-course-accordion-summary">
                    <span className="ex-accordion-label">▾ {lessonName}</span>
                    <span className="ex-accordion-count">({lessonVideos.length})</span>
                  </summary>

                  <div className="ex-course-playlist-cards">
                    {lessonVideos.map((r: R) => {
                      const isActive = r.id === id;
                      const isCompleted = r.watchProgress?.[0]?.isCompleted;

                      return (
                        <Link
                          key={r.id}
                          href={`/videos/${r.id}`}
                          className={`ex-playlist-card-item ${isActive ? 'is-active' : ''}`}
                        >
                          <div className="ex-playlist-icon-col">
                            {isCompleted ? (
                              <span className="ex-icon-circle watched" title="Completed">
                                <Check size={14} strokeWidth={2.5} />
                              </span>
                            ) : (
                              <span className="ex-icon-circle unplayed" title="Play video">
                                <Play size={13} fill="currentColor" />
                              </span>
                            )}
                          </div>

                          <div className="ex-playlist-info-col">
                            <h4 className="ex-playlist-card-title" title={r.title}>
                              {r.title}
                            </h4>
                            <span className="ex-playlist-card-duration">
                              {time(r.durationSeconds)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </details>
              );
            })}

            {!playlist.length && (
              <p className="ex-muted text-center py-4">No course videos match your search.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
