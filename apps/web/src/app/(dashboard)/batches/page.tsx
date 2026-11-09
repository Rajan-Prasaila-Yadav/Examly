'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Download, Filter, LayoutGrid, List, Trash2, ArrowLeft, ArrowRight, BookOpen, Check, GraduationCap, Loader2, Pencil, Plus, RefreshCw, Search, X, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

type Institute = { id: string; name: string };
type Batch = { id: string; instituteId: string; institute?: Institute; name: string; code: string; description?: string; imageUrl?: string; priceNpr: number; status: string; startDate?: string; endDate?: string; tests?: {id:string}[]; subjects?: { id: string; lessons?: {_count:{notes:number;videos:number}}[] }[]; _count?: { students: number; faculty?: number } };
type Options = { institutes: Institute[]; permissions: { create: boolean; update: boolean; delete: boolean } };
type Form = { name: string; code: string; instituteId: string; description: string; fee: string; priceNpr: string; startDate: string; endDate: string; imageUrl: string };
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 disabled:bg-slate-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50';
const blank = (instituteId: string): Form => ({ name: '', code: '', instituteId, description: '', fee: '', priceNpr: '', startDate: '', endDate: '', imageUrl:'' });
const feeLabel = (b: Batch) => b.priceNpr === 0 ? 'Free' : `NPR ${b.priceNpr.toLocaleString('en-NP')}`;

export default function BatchesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const student = user?.role === 'STUDENT', superAdmin = user?.role === 'SUPER_ADMIN';
  const [options, setOptions] = useState<Options | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [status, setStatus] = useState(''), [institute, setInstitute] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filtersOpen,setFiltersOpen] = useState(false), [feeFilter,setFeeFilter] = useState(''), [sort,setSort] = useState('');
  const [view,setView] = useState('table'), [page,setPage] = useState(1), [selected,setSelected] = useState<string[]>([]);
  const [exporting,setExporting] = useState(false), [confirmation,setConfirmation] = useState<{batch:Batch;action:'hide'|'delete'}|null>(null), [acting,setActing]=useState(false);
  const [modal, setModal] = useState<{ batch?: Batch } | null>(null);
  const [form, setForm] = useState<Form>(blank(''));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState('');
  const [uploading,setUploading]=useState(false);
  const confirmationDialog=useRef<HTMLDialogElement>(null);
  const dialog = useRef<HTMLDialogElement>(null), firstField = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null), submitting = useRef(false), requestVersion = useRef(0);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setOptions(null); setBatches([]); setInstitute(''); setModal(null); }, [user?.id]);
  const load = useCallback(async (force=false) => {
    if (!user) return;
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const [list, metadata] = await Promise.all([
        api.get<Batch[]>('/batches', { params: { search: query || undefined, status: status || undefined, instituteId: superAdmin ? institute || undefined : undefined }, bypassCache: force, timeout:30000 }),
        api.get<Options>('/batches/options', { bypassCache: force, timeout:30000 }),
      ]);
      if (version !== requestVersion.current) return;
      setBatches(list.data); setOptions(metadata.data);
    } catch (e: any) {
      if (version === requestVersion.current) { setBatches([]); setError(e.response?.status === 403 ? 'You do not have access to batches.' : 'We couldn’t load batches. Please try again.'); }
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [user?.id, query, status, institute, superAdmin]);
  useEffect(() => { load(retry>0); return () => { requestVersion.current++; }; }, [load, retry]);
  useEffect(() => {
    const refresh = () => { void load(true); };
    window.addEventListener('focus', refresh);
    window.addEventListener('examly-data-changed', refresh);
    window.addEventListener('examly-permissions-changed', refresh);
    return () => { window.removeEventListener('focus', refresh);window.removeEventListener('examly-data-changed', refresh); window.removeEventListener('examly-permissions-changed', refresh); };
  }, [load]);
  const close = () => { if (submitting.current||uploading) return; setModal(null); returnFocus.current?.focus(); };
  useEffect(() => { if (modal) firstField.current?.focus(); }, [modal]);
  useEffect(()=>{setPage(1);setSelected([]);},[query,status,institute,feeFilter]);
  useEffect(()=>{if(confirmation)confirmationDialog.current?.showModal();},[confirmation]);
  const open = (batch?: Batch) => {
    returnFocus.current = document.activeElement as HTMLElement;
    setErrors({}); setSaveError('');
    setForm(batch ? { name: batch.name, code: batch.code, instituteId: batch.instituteId, description: batch.description || '', fee: batch.priceNpr === 0 ? 'free' : 'paid', priceNpr: batch.priceNpr.toString(), startDate: batch.startDate?.slice(0,10) || '', endDate: batch.endDate?.slice(0,10) || '', imageUrl:batch.imageUrl||'' } : blank(institute || user?.instituteId || (options?.institutes.length === 1 ? options.institutes[0].id : '')));
    setModal({ batch });
  };
  const change = (key: keyof Form, value: string) => { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: '' })); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (submitting.current || uploading || !modal) return;
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Enter at least 2 characters.';
    if (form.code.trim().length < 2) next.code = 'Enter at least 2 characters.';
    if (!form.instituteId) next.instituteId = 'Select an institute.';
    if (!form.fee) next.fee = 'Choose free or paid.';
    if (form.fee === 'paid' && (!form.priceNpr || !Number.isInteger(Number(form.priceNpr)) || Number(form.priceNpr) <= 0 || Number(form.priceNpr) > 2147483647)) next.priceNpr = 'Enter a positive whole-number amount in NPR.';
    if (form.startDate && form.endDate && form.endDate < form.startDate) next.endDate = 'End date must be on or after start date.';
    setErrors(next); setSaveError(''); if (Object.keys(next).length) return;
    submitting.current = true; setSaving(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim(), instituteId: form.instituteId, description: form.description.trim(), bannerUrl:form.imageUrl, priceNpr: form.fee === 'free' ? 0 : Number(form.priceNpr), startDate: form.startDate ? `${form.startDate}T00:00:00.000Z` : null, endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : null };
      if (modal.batch) await api.put(`/batches/${modal.batch.id}`, payload); else await api.post('/batches', payload);
      api.invalidateCache('/batches'); toast.success(modal.batch ? 'Batch updated' : 'Batch created', form.name.trim());
      submitting.current = false; close(); await load(true);
    } catch (e: any) {
      const body = e.response?.data;
      const message = e.response?.status >= 500 ? 'Couldn’t save the batch. Your changes are still here; please retry.' : body?.message || 'Couldn’t save. Check your connection and retry.';
      if (body?.field) setErrors({ [body.field]: message });
      else if (body?.errors) setErrors(Object.fromEntries(Object.entries(body.errors).filter(([k]) => k !== '_errors').map(([k,v]: [string,any]) => [k, v._errors?.join(' ') || 'Check this value.'])));
      else setSaveError(message);
    } finally { submitting.current = false; setSaving(false); }
  };
  const feedback = (key: string) => errors[key] ? <p id={`${key}-error`} className="mt-1 text-xs text-red-700">{errors[key]}</p> : null;
  const props = (key: keyof Form) => ({ id: `batch-${key}`, 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `${key}-error` : undefined });
  const uploadImage=async(file?:File)=>{if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){setErrors(e=>({...e,imageUrl:'Choose a PNG, JPEG or WebP image up to 2 MB.'}));return;}setUploading(true);try{const toDataUrl=()=>new Promise<string>((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result as string);r.onerror=rej;r.readAsDataURL(file);});try{const {data}=await api.post('/storage/presigned-url',{folder:'images',fileName:file.name,contentType:file.type});if(!data.uploadUrl||data.publicUrl?.includes('pub-mock')||data.uploadUrl.includes('mock-upload'))throw new Error('Storage offline');const result=await fetch(data.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!result.ok)throw new Error('Upload failed');change('imageUrl',data.publicUrl);}catch{const dataUrl=await toDataUrl();change('imageUrl',dataUrl);}}catch(e:any){setErrors(v=>({...v,imageUrl:e.message||'Could not process image.'}));}finally{setUploading(false);}};
  const contentCount=(b:Batch,key:'notes'|'videos') => b.subjects?.some(s=>s.lessons===undefined) ? null : b.subjects?.reduce((n,s)=>n+(s.lessons||[]).reduce((m,l)=>m+l._count[key],0),0) ?? null;
  const filtered=batches.filter(b=>!feeFilter||(feeFilter==='free'?b.priceNpr===0:b.priceNpr>0)).sort((a,b)=>sort==='az'?a.name.localeCompare(b.name):sort==='za'?b.name.localeCompare(a.name):sort==='students'?(b._count?.students||0)-(a._count?.students||0):sort==='tests'?(b.tests?.length||0)-(a.tests?.length||0):0);
  const pages=Math.max(1,Math.ceil(filtered.length/10)), currentPage=Math.min(page,pages), visible=filtered.slice((currentPage-1)*10,currentPage*10);
  const exportRows=async(format:'xlsx'|'pdf')=>{setExporting(true);try{const response=await api.post('/batches/export',{format,ids:selected.length?selected:filtered.map(b=>b.id),search:query||undefined,status:status||undefined,instituteId:superAdmin?institute||undefined:undefined},{responseType:'blob'});const url=URL.createObjectURL(response.data as Blob);const a=document.createElement('a');a.href=url;a.download=`Examly-batches.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast.error('Export failed','Please retry.');}finally{setExporting(false);}};
  const confirmAction=async()=>{if(!confirmation||acting)return;setActing(true);try{if(confirmation.action==='delete')await api.delete(`/batches/${confirmation.batch.id}`, {data:{}});else await api.put(`/batches/${confirmation.batch.id}`,{status:confirmation.batch.status==='HIDDEN'?'ACTIVE':'HIDDEN'});setConfirmation(null);setSelected([]);api.invalidateCache('/batches');await load(true);toast.success('Batch updated','Changes saved.');}catch{toast.error('Couldn’t update batch','Please retry.');}finally{setActing(false);}};
  const actions=(b:Batch)=><div className="ex-actions"><Link className="ex-icon" href={`/batches/${b.id}`} title="View batch" aria-label={`View ${b.name}`}><Eye size={18}/></Link>{options?.permissions.update&&<><button className="ex-icon" title="Edit batch" aria-label={`Edit ${b.name}`} onClick={()=>open(b)}><Pencil size={18}/></button><button className="ex-icon" title={b.status==='HIDDEN'?'Show to enrolled students':'Hide from students'} aria-label={`${b.status==='HIDDEN'?'Show':'Hide'} ${b.name}`} onClick={()=>setConfirmation({batch:b,action:'hide'})}><EyeOff size={18}/></button></>}{options?.permissions.delete&&<button className="ex-icon" title="Delete batch" aria-label={`Delete ${b.name}`} onClick={()=>setConfirmation({batch:b,action:'delete'})}><Trash2 size={18}/></button>}</div>;
  const toggleSelected=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const filterCount=[status,institute,feeFilter].filter(Boolean).length;
  const clearFilters=()=>{setStatus('');setInstitute('');setFeeFilter('');};
  return <div className="batch-prototype">
    {!modal ? <>
      <header style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><h1>{student?'My ': 'Courses & '}<em>{student?'Courses':'Batches'}</em></h1><p className="sub">Open a batch to manage subjects, teachers, students and tests.</p></div>{options?.permissions.create&&<button className="ex-btn" style={{alignSelf:'flex-start'}} onClick={()=>open()}><Plus size={20}/>New batch</button>}</header>
      <section className="ex-card" aria-label="Batch directory">
        <div className="ex-toolbar"><div className="ex-search"><Search/><input className="ex-input" aria-label="Search batches" placeholder="Search batch name or code…" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="ex-btn ghost" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}><Filter size={20}/>Filters{filterCount>0&&<span className="ex-chip">{filterCount}</span>}</button><select className="ex-input" style={{width:'auto'}} aria-label="Sort batches" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="">Sort: Default</option><option value="az">Name (A–Z)</option><option value="za">Name (Z–A)</option><option value="students">Most students</option><option value="tests">Most tests</option></select>{options?.permissions.create&&<button className="ex-btn" style={{marginLeft:'auto'}} onClick={()=>open()}><Plus size={20}/>Create batch</button>}</div>
        {filtersOpen&&<div className="ex-filters">{!student&&<div><label htmlFor="filter-status">Status</label><select id="filter-status" className="ex-input" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All</option>{['ACTIVE','HIDDEN','BLOCKED','LOCKED'].map(s=><option key={s} value={s}>{s[0]+s.slice(1).toLowerCase()}</option>)}</select></div>}<div><label htmlFor="filter-fee">Fee</label><select id="filter-fee" className="ex-input" value={feeFilter} onChange={e=>setFeeFilter(e.target.value)}><option value="">All</option><option value="free">Free</option><option value="paid">Paid</option></select></div>{superAdmin&&<div><label htmlFor="filter-institute">Institute</label><select id="filter-institute" className="ex-input" value={institute} onChange={e=>setInstitute(e.target.value)}><option value="">All institutes</option>{options?.institutes.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></div>}<div style={{display:'flex',gap:8,alignItems:'end'}}><button className="ex-btn outline" onClick={clearFilters}>Clear all</button><button className="ex-btn ghost" onClick={()=>setFiltersOpen(false)}>Done</button></div></div>}
        <div className="ex-chips">{status&&<button className="ex-chip" onClick={()=>setStatus('')}>Status: {status.toLowerCase()}<X size={12}/></button>}{feeFilter&&<button className="ex-chip" onClick={()=>setFeeFilter('')}>Fee: {feeFilter}<X size={12}/></button>}{institute&&<button className="ex-chip" onClick={()=>setInstitute('')}>{options?.institutes.find(i=>i.id===institute)?.name}<X size={12}/></button>}</div>
        <div className="ex-toolbar" style={{justifyContent:'space-between',marginBottom:10}}><div className="ex-toolbar"><button className={`ex-icon ${view==='table'?'ex-chip':''}`} title="Table view" aria-label="Table view" aria-pressed={view==='table'} onClick={()=>setView('table')}><List size={18}/></button><button className={`ex-icon ${view==='cards'?'ex-chip':''}`} title="Card view" aria-label="Card view" aria-pressed={view==='cards'} onClick={()=>setView('cards')}><LayoutGrid size={18}/></button>{selected.length>0&&<span className="ex-chip">{selected.length} selected<button aria-label="Clear selection" onClick={()=>setSelected([])}><X size={14}/></button></span>}</div><div className="ex-toolbar"><button className="ex-icon" title="Refresh" aria-label="Refresh batches" disabled={loading} onClick={()=>setRetry(n=>n+1)}><RefreshCw size={18} className={loading?'animate-spin':''}/></button><button className="ex-btn ghost" disabled={exporting||loading||!filtered.length} onClick={()=>exportRows('xlsx')}><Download size={16}/>Excel</button><button className="ex-btn ghost" disabled={exporting||loading||!filtered.length} onClick={()=>exportRows('pdf')}><Download size={16}/>PDF</button></div></div>
        {loading?<div role="status" style={{padding:50,textAlign:'center'}}><Loader2 className="animate-spin inline-block" size={20}/> Loading batches…</div>:error?<div role="alert" style={{padding:40,textAlign:'center'}}><p>{error}</p><button className="ex-btn ghost" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>:!filtered.length?<div style={{padding:45,textAlign:'center'}}><BookOpen size={30} style={{margin:'0 auto 12px',color:'var(--mu)'}}/><h3>{query||filterCount?'No matching batches':'No batches yet'}</h3><p className="sub">{query||filterCount?'Try another search or clear the filters.':'Your batches will appear here once created.'}</p>{query||filterCount?<button className="ex-btn ghost" onClick={()=>{clearFilters();setSearch('');}}>Clear filters</button>:options?.permissions.create&&<button className="ex-btn" onClick={()=>open()}>Create batch</button>}</div>:view==='table'?<div className="ex-table-wrap"><table className="ex-table"><thead><tr><th style={{minWidth:0}}><input type="checkbox" aria-label="Select this page" checked={visible.length>0&&visible.every(b=>selected.includes(b.id))} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...visible.map(b=>b.id)])]:selected.filter(id=>!visible.some(b=>b.id===id)))}/></th><th>Batch</th><th>Subjects</th><th>Teachers</th>{!student&&<th>Students</th>}<th>Tests</th><th>Notes</th><th>Videos</th><th>Actions</th></tr></thead><tbody>{visible.map(b=><tr key={b.id}><td style={{minWidth:0}}><input type="checkbox" aria-label={`Select ${b.name}`} checked={selected.includes(b.id)} onChange={()=>toggleSelected(b.id)}/></td><td><Link href={`/batches/${b.id}`}><span className="ex-swatch"/ ><b>{b.name}</b></Link>{b.status!=='ACTIVE'&&<Status value={b.status}/>}<div className="ex-muted" style={{fontSize:11,marginLeft:44}}>{b.code}{superAdmin&&b.institute?` · ${b.institute.name}`:''}</div></td><td>{b.subjects?.length??'—'}</td><td>{b._count?.faculty??0}</td>{!student&&<td>{b._count?.students??'—'}</td>}<td>{b.tests?.length??'—'}</td><td>{contentCount(b,'notes')??'—'}</td><td>{contentCount(b,'videos')??'—'}</td><td>{actions(b)}</td></tr>)}</tbody></table></div>:<div className="ex-card-grid">{visible.map(b=><article className="ex-record-card" key={b.id}><Link href={`/batches/${b.id}`}><div className="ex-batch-cover">{b.imageUrl&&<img src={b.imageUrl} alt=""/>}</div></Link><div className="ex-record-body"><div style={{display:'flex',justifyContent:'space-between',gap:8}}><Link href={`/batches/${b.id}`} style={{fontWeight:800,fontSize:16}}>{b.name}</Link><input type="checkbox" aria-label={`Select ${b.name}`} checked={selected.includes(b.id)} onChange={()=>toggleSelected(b.id)}/></div><small className="ex-muted">{b._count?.students??'—'} students · {b.subjects?.length??'—'} subjects</small><div style={{margin:'10px 0',display:'flex',gap:8}}><Status value={b.status}/><span className="ex-chip">{feeLabel(b)}</span></div>{actions(b)}</div></article>)}</div>}
        {!loading&&!error&&<div className="ex-footer"><span>{filtered.length?`${(currentPage-1)*10+1}–${Math.min(currentPage*10,filtered.length)} of ${filtered.length}`:'0 batches'}</span><div style={{display:'flex',gap:10,alignItems:'center'}}><button className="ex-icon" aria-label="Previous page" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ArrowLeft size={16}/></button>Page {currentPage} of {pages}<button className="ex-icon" aria-label="Next page" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}><ArrowRight size={16}/></button></div></div>}
      </section>
    </>:<div className="ex-form"><button className="ex-icon" onClick={close} disabled={saving||uploading}><ArrowLeft size={16}/>Back to batches</button><h1>{modal.batch?'Edit':'Create'} <em>Batch</em></h1><p className="sub">{modal.batch?'Update your batch details.':'Set up your batch, then assign its curriculum and students.'}</p><form onSubmit={save} noValidate><fieldset disabled={saving||uploading} className="ex-card" style={{display:'grid',gap:16}}>{saveError&&<p role="alert" className="field-error">{saveError}</p>}
      <div><label htmlFor="batch-instituteId">Institute *</label><select {...props('instituteId')} className="ex-input" disabled={!!modal.batch||!superAdmin} value={form.instituteId} onChange={e=>change('instituteId',e.target.value)}><option value="">Select institute</option>{options?.institutes.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}{modal.batch&&!options?.institutes.some(i=>i.id===modal.batch?.instituteId)&&<option value={modal.batch.instituteId}>{modal.batch.institute?.name||'Current institute'}</option>}</select>{feedback('instituteId')}</div>
      <div><label htmlFor="batch-name">Batch name *</label><input ref={firstField} {...props('name')} className="ex-input" placeholder="Batch name" maxLength={100} value={form.name} onChange={e=>change('name',e.target.value)}/>{feedback('name')}</div>
      <div className="form-grid"><div><label htmlFor="batch-code">Batch code *</label><input {...props('code')} className="ex-input" placeholder="Batch code" maxLength={50} value={form.code} onChange={e=>change('code',e.target.value)}/>{feedback('code')}</div><fieldset><legend>Fee type *</legend><div className="ex-segments">{['free','paid'].map(v=><label className={form.fee===v?'selected':''} key={v}><input type="radio" name="fee" value={v} checked={form.fee===v} onChange={()=>change('fee',v)}/>{v==='free'?'Free':'Paid'}</label>)}</div>{feedback('fee')}</fieldset></div>
      {form.fee==='paid'&&<div><label htmlFor="batch-priceNpr">Batch fee (NPR)</label><input {...props('priceNpr')} className="ex-input" type="number" min="1" step="1" value={form.priceNpr} onChange={e=>change('priceNpr',e.target.value)}/>{feedback('priceNpr')}</div>}
      <div><label htmlFor="batch-description">Description</label><textarea {...props('description')} className="ex-input" placeholder="What this batch covers" rows={3} maxLength={2000} value={form.description} onChange={e=>change('description',e.target.value)}/>{feedback('description')}</div>
      <div><label htmlFor="batch-image">Batch image</label><label className="ex-upload" htmlFor="batch-image"><Download size={22}/><b>{uploading?"Uploading…":"Choose image"}</b><small>16:9 · 1280×720 px recommended · max 2 MB</small><input id="batch-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={saving||uploading} onChange={e=>uploadImage(e.target.files?.[0])}/></label>{form.imageUrl&&<div style={{marginTop:10}}><img src={form.imageUrl} alt="Batch banner preview" style={{maxHeight:150,borderRadius:14}}/><button type="button" className="ex-icon" onClick={()=>change("imageUrl","")}>Remove image</button></div>}{feedback("imageUrl")}</div>
      <div className="form-grid">{(['startDate','endDate'] as const).map(key=><div key={key}><label htmlFor={`batch-${key}`}>{key==='startDate'?'Start date':'End date'} (optional)</label><input {...props(key)} className="ex-input" type="date" value={form[key]} onChange={e=>change(key,e.target.value)}/>{feedback(key)}</div>)}</div>
    </fieldset><p className="sub" style={{marginTop:12}}>Next: add subjects, students and batch-level tests.</p><div className="form-footer"><button type="button" disabled={saving||uploading} className="ex-btn ghost" onClick={close}>Cancel</button><button type="submit" disabled={saving||uploading} className="ex-btn">{saving?<Loader2 className="animate-spin" size={18}/>:<Check size={18}/>} {saving?'Saving…':modal.batch?'Save changes':'Create batch'}</button></div></form></div>}
    {confirmation&&<dialog ref={confirmationDialog} onCancel={e=>{e.preventDefault();if(!acting)setConfirmation(null);}} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" style={{position:'fixed',inset:0,margin:'auto',zIndex:100,maxWidth:460,width:'calc(100% - 32px)',borderRadius:20,padding:24,background:'var(--card)',color:'var(--tx)',boxShadow:'0 0 0 100vmax #0008'}}><h3 id="confirm-title">{confirmation.action==='delete'?'Delete batch?':confirmation.batch.status==='HIDDEN'?'Show batch?':'Hide batch?'}</h3><p style={{marginBottom:20}}>{confirmation.batch.name}. {confirmation.action==='delete'?'This removes it from the batch directory. Its related records are retained.':confirmation.batch.status==='HIDDEN'?'Enrolled students will be able to see it again.':'Enrolled students will no longer see this batch in their list.'}</p><div className="form-footer" style={{display:'flex',gap:10,justifyContent:'end'}}><button className="ex-btn ghost" disabled={acting} onClick={()=>setConfirmation(null)}>Cancel</button><button className="ex-btn" disabled={acting} onClick={confirmAction}>{acting?'Saving…':'Confirm'}</button></div></dialog>}
  </div>;
}
function Status({value}:{value:string}) {return <span className={`ex-chip ${value==='ACTIVE'?'ok':value==='HIDDEN'?'wa':'bad'}`}>{value[0]+value.slice(1).toLowerCase()}</span>;}
