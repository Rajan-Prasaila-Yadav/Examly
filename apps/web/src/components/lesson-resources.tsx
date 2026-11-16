'use client';
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Folder, FileText, ArrowLeft, Plus, Trash2 } from 'lucide-react';

type Resource = { id: string; parentId: string | null; isFolder: boolean; title: string; fileUrl?: string; fileType?: string };
export default function LessonResources({ lessonId, resources, onChange }: { lessonId: string; resources: Resource[]; onChange: () => Promise<void> }) {
  const { can } = useAuth();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isFolder, setIsFolder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setFolderId(null); setEditing(false); setError(''); }, [lessonId]);
  useEffect(() => { if (folderId && !resources.some(item => item.id === folderId)) setFolderId(null); }, [resources, folderId]);
  const folder = resources.find(item => item.id === folderId);
  const visible = resources.filter(item => (item.parentId || null) === folderId);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.post(`/lessons/${lessonId}/resources`, { title: title.trim(), isFolder, parentId: folderId, ...(!isFolder ? { fileUrl: url.trim() } : {}) });
      setEditing(false); setTitle(''); setUrl(''); await onChange();
    } catch (e: any) { setError(e.response?.data?.message || 'Unable to save resource. Please retry.'); }
    finally { setBusy(false); }
  };
  const remove = async (item: Resource) => {
    if (!window.confirm(item.isFolder ? `Remove "${item.title}" and everything inside it?` : `Remove "${item.title}"?`)) return;
    setBusy(true); setError('');
    try { await api.delete(`/lessons/resources/${item.id}`); await onChange(); }
    catch (e: any) { setError(e.response?.data?.message || 'Unable to remove resource. Please retry.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Lesson resources">
    <div className="ex-toolbar ex-mb">
      {folder && <button className="ex-btn ghost" onClick={() => setFolderId(folder.parentId || null)}><ArrowLeft size={16} />Back</button>}
      <h2>{folder?.title || 'Resources'}</h2>
      {can('resources', 'create') && <button className="ex-btn" disabled={busy} onClick={() => { setEditing(true); setError(''); }}><Plus size={16} />Add resource</button>}
    </div>
    {error && <p role="alert" className="ex-error">{error}</p>}
    {editing && <form onSubmit={save} className="ex-card ex-mb" style={{ padding: 20 }}>
      <label className="ex-field">Name<input className="ex-input" required maxLength={250} value={title} onChange={e => setTitle(e.target.value)} disabled={busy} /></label>
      <label className="ex-check ex-mb"><input type="checkbox" checked={isFolder} onChange={e => setIsFolder(e.target.checked)} disabled={busy} />Folder</label>
      {!isFolder && <label className="ex-field">File or resource URL<input className="ex-input" type="url" required pattern="https?://.*" value={url} onChange={e => setUrl(e.target.value)} disabled={busy} placeholder="https://" /></label>}
      <div className="ex-toolbar"><button className="ex-btn" disabled={busy}>{busy ? 'Saving…' : 'Save resource'}</button><button type="button" className="ex-btn ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div>
    </form>}
    {!visible.length && <p className="ex-card ex-empty">No resources in this folder yet.</p>}
    {visible.map(item => <article className="ex-card ex-toolbar ex-mb" style={{ padding: 16 }} key={item.id}>
      {item.isFolder ? <Folder size={20} /> : <FileText size={20} />}
      {item.isFolder ? <button className="ex-btn ghost" onClick={() => setFolderId(item.id)}>{item.title}</button> : item.fileUrl && /^https?:\/\//i.test(item.fileUrl) ? <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">{item.title}</a> : <span>{item.title} — file unavailable</span>}
      {can('resources', 'delete') && <button className="ex-btn ghost" disabled={busy} aria-label={`Remove ${item.title}`} onClick={() => void remove(item)}><Trash2 size={16} /></button>}
    </article>)}
  </section>;
}
