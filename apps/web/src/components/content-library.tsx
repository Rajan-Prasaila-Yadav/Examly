'use client';
import React,{useEffect,useRef,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import Link from 'next/link';
import {api,invalidateApiCache} from '@/lib/api';
import {useAuth} from '@/lib/auth-context';
import VideoCollection from './video-collection';
import {DataTable,IconButton,Modal} from './batch-workspace';
import {Plus,Pencil,Archive,Trash2,Upload,ArrowLeft,FileText,BookOpen,Copy,Maximize,Download,Search} from 'lucide-react';
type R=Record<string,any>;
const config={timeout:30000} as any;
const message=(e:any)=>e.response?.data?.message||e.message||'Unable to save';
const status=(s:string)=>s==='ACTIVE'?'Published':s==='HIDDEN'?'Draft / hidden':s;
const bytes=(n:number)=>n?`${(n/1024/1024).toFixed(1)} MB`:'—';
const title=(r:R)=>r.name||r.title;
export default function ContentLibrary({view}:{view:'subjects'|'subject'|'lesson'|'videos'|'notes'}){
 const params=useParams();const id=params.id as string;const router=useRouter();const {user}=useAuth();const role=typeof user?.role==='object'?(user.role as any)?.code:user?.role;const manage=['ADMIN','SUPER_ADMIN','TEACHER'].includes(role||'');
 const path=view==='subject'?`/content/subjects/${id}`:view==='lesson'?`/content/lessons/${id}`:`/content/${view}`;
 const initialCached = typeof window !== 'undefined' ? api.getCached<any>(path) : null;
 const [rows,setRows]=useState<R[]>(()=>Array.isArray(initialCached)?initialCached:[]);
 const [data,setData]=useState<R|null>(()=>Array.isArray(initialCached)?null:initialCached);
 const [loading,setLoading]=useState(!initialCached);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[tab,setTab]=useState('Lessons');
 const [modal,setModal]=useState<R|null>(null),[form,setForm]=useState<R>({}),[busy,setBusy]=useState(false),[formError,setFormError]=useState(''),[library,setLibrary]=useState<R[]>([]),[lessons,setLessons]=useState<R[]>([]),[institutes,setInstitutes]=useState<R[]>([]),[batches,setBatches]=useState<R[]>([]),[selectedBatches,setSelectedBatches]=useState<string[]>([]),[scope,setScope]=useState(user?.role==='STUDENT'?'batch':'main');
 const [file,setFile]=useState<File|null>(null),[subtitle,setSubtitle]=useState<File|null>(null),[progress,setProgress]=useState(0);const uploadRef=useRef<XMLHttpRequest|null>(null);const version=useRef(0);
 const load=async()=>{const v=++version.current;setError('');try{const r=await api.get(path,config);if(v!==version.current)return;if(Array.isArray(r.data))setRows(r.data);else setData(r.data);}catch(e){if(v===version.current&&!rows.length&&!data)setError(message(e));}finally{if(v===version.current)setLoading(false);}};
 useEffect(()=>{const cached=api.getCached<any>(path);if(cached){if(Array.isArray(cached))setRows(cached);else setData(cached);setLoading(false);}else setLoading(true);setTab(view==='lesson'?'Videos':'Lessons');if(user?.role==='STUDENT')setScope('batch');load();const changed=()=>{invalidateApiCache(path);void load();};window.addEventListener('examly-data-changed',changed);return()=>{version.current++;window.removeEventListener('examly-data-changed',changed);};},[id,view,user?.id]);
 const close=()=>{if(!busy)setModal(null);};
 const open=async(kind:string,record:R={})=>{setFormError('');setFile(null);setSubtitle(null);setProgress(0);setModal({kind,record});setForm({name:'',code:'',description:'',iconUrl:'📚',title:'',videoUrl:'',fileUrl:'',provider:'YOUTUBE',allowDownload:false,watermark:true,status:'ACTIVE',subjectId:view==='subject'?id:view==='lesson'?data?.subjectId:'',lessonId:view==='lesson'?id:'',...record});
  if(kind==='subjects'&&!record.id){try{const r=await api.get('/batches/options',config);setInstitutes(r.data.institutes);if(r.data.institutes.length===1)setForm(f=>({...f,instituteId:r.data.institutes[0].id}));}catch(e){setFormError(message(e));}}
  if(['videos','notes'].includes(kind)){try{const r=await api.get('/content/subjects',config);setLibrary(r.data);const sub=view==='lesson'?data?.subjectId:record.lesson?.subjectId;if(sub){const s=await api.get(`/content/subjects/${sub}`,config);setLessons(s.data.lessons);setForm(f=>({...f,subjectId:sub,lessonId:record.lessonId||id}));}}catch(e){setFormError(message(e));}}
 };
 const chooseSubject=async(subjectId:string)=>{setForm(f=>({...f,subjectId,lessonId:''}));setLessons([]);try{const r=await api.get(`/content/subjects/${subjectId}`,config);setLessons(r.data.lessons);}catch(e){setFormError(message(e));}};
 const upload=async(file:File,folder:string)=>{
  const mime=file.type||(file.name.endsWith('.vtt')?'text/vtt':'application/octet-stream');const allowed=folder==='videos'?['video/mp4','video/webm']:folder==='notes'?['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation']:['text/vtt'];const limit=folder==='videos'?2*1024**3:folder==='notes'?20*1024**2:2*1024**2;
  if(!allowed.includes(mime)||file.size>limit||file.size===0)throw new Error('Choose a supported, non-empty file within the displayed size limit.');
  const signed=await api.post('/storage/presigned-url',{folder,fileName:file.name,contentType:mime,size:file.size},{timeout:30000});
  await new Promise<void>((resolve,reject)=>{const x=new XMLHttpRequest();uploadRef.current=x;x.open('PUT',signed.data.uploadUrl);x.setRequestHeader('Content-Type',mime);x.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.round(e.loaded/e.total*100));};x.onload=()=>x.status>=200&&x.status<300?resolve():reject(new Error(`Upload failed (${x.status}). Check the storage bucket and CORS settings.`));x.onerror=()=>reject(new Error('Upload failed. Check your connection and storage CORS settings.'));x.onabort=()=>reject(new Error('Upload cancelled'));x.send(file);});return signed.data.publicUrl;
 };
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(!modal)return;setBusy(true);setFormError('');try{
  const kind=modal.kind,record=modal.record;let payload:R;
  if(kind==='subjects')payload={name:form.name,code:form.code,description:form.description,iconUrl:form.iconUrl,...(!record.id?{instituteId:form.instituteId}:{})};
  else if(kind==='lessons')payload={name:form.name,description:form.description,status:form.status};
  else {if(!form.lessonId)throw new Error('Select a lesson');const url=file?await upload(file,kind):kind==='videos'?form.videoUrl:form.fileUrl;if(!url)throw new Error('Choose a file or enter its URL');payload={title:form.title,description:form.description,allowDownload:form.allowDownload,status:form.status,...(kind==='videos'?{videoUrl:url,provider:file?'DIRECT_MP4':form.provider,watermark:form.watermark,subtitleUrl:subtitle?await upload(subtitle,'general'):form.subtitleUrl||null}:{fileUrl:url,fileSizeBytes:file?.size??form.fileSizeBytes??0})};}
  const target=record.id?`/content/${kind}/${record.id}`:kind==='subjects'?'/content/subjects':kind==='lessons'?`/content/subjects/${id}/lessons`:`/content/lessons/${form.lessonId}/${kind}`;
  if(record.id)await api.put(target,payload,{timeout:30000});else await api.post(target,payload,{timeout:30000});
  invalidateApiCache();setModal(null);setNotice('Saved successfully');await load();
 }catch(e){setFormError(message(e));}finally{setBusy(false);uploadRef.current=null;}};
 const setStatus=(kind:string,r:R,next:string)=>{setFormError('');setModal({kind:'confirm',record:r,target:kind,next});};
 const confirm=async()=>{if(!modal)return;setBusy(true);try{await api.put(`/content/${modal.target}/${modal.record.id}`,{status:modal.next},{timeout:30000});invalidateApiCache();setModal(null);setNotice('Changes saved');await load();}catch(e){setFormError(message(e));}finally{setBusy(false);}};
 const assign=async(r:R)=>{setModal({kind:'assign',record:r});setSelectedBatches([]);setFormError('');setBusy(true);try{const res=await api.get('/batches',config);setBatches(res.data.filter((b:R)=>b.instituteId===r.instituteId&&b.id!==r.batchId));}catch(e){setFormError(message(e));}finally{setBusy(false);}};
 const doAssign=async()=>{setBusy(true);const done:string[]=[];try{for(const batchId of selectedBatches){await api.post(`/batches/${batchId}/assign/subjects`,{ids:[modal!.record.id]},{timeout:90000});done.push(batchId);}setModal(null);setNotice(`Copied to ${done.length} batches`);}catch(e){setSelectedBatches(selectedBatches.filter(id=>!done.includes(id)));setFormError(`${done.length} batches completed. ${message(e)}`);}finally{setBusy(false);}};
 const actions=(kind:string)=>(r:R)=><>{manage&&<><IconButton title={'Edit '+title(r)} onClick={()=>open(kind,r)}><Pencil size={17}/></IconButton>{kind==='subjects'&&<IconButton title="Copy to batches" onClick={()=>assign(r)}><Copy size={17}/></IconButton>}<IconButton title={r.status==='ACTIVE'?'Archive':'Publish'} onClick={()=>setStatus(kind,r,r.status==='ACTIVE'?'HIDDEN':'ACTIVE')}><Archive size={17}/></IconButton><IconButton title={'Delete '+title(r)} onClick={()=>setStatus(kind,r,'DELETED')}><Trash2 size={17}/></IconButton></>}</>;
 const tests=(records:R[])=><DataTable rows={records} columns={[{label:'Test',render:r=><b>{r.title}</b>},{label:'Type',render:r=>r.testType},{label:'Status',render:r=>r.testStatus},{label:'Minutes',render:r=>r.durationMinutes},{label:'Marks',render:r=>r.totalMarks}]} onOpen={r=>router.push(`/tests/${r.id}`)}/>;
 const NotesCollection = ({ items, onOpen, act }: { items: R[]; onOpen: (r: R) => void; act?: (r: R) => React.ReactNode }) => {
   const [q, setQ] = useState('');
   const [subj, setSubj] = useState('ALL');
   const subjs = Array.from(new Set(items.map((r) => r.lesson?.subject?.name || r.subjectName).filter(Boolean)));
   const filtered = items.filter((r) => {
     const s = r.lesson?.subject?.name || r.subjectName || '';
     if (subj !== 'ALL' && s !== subj) return false;
     if (q.trim()) {
       const term = q.toLowerCase();
       const m = [r.title, r.lesson?.name, s, r.description].filter(Boolean).some((x) => x.toLowerCase().includes(term));
       if (!m) return false;
     }
     return true;
   });

   return (
     <div className="space-y-4">
       <div className="ex-filters-tray">
         <div className="ex-search-box">
           <Search size={16} className="text-slate-400 shrink-0" />
           <input
             type="text"
             placeholder="Search notes, subjects, topics…"
             value={q}
             onChange={(e) => setQ(e.target.value)}
           />
         </div>
         {subjs.length > 1 && (
           <select className="ex-filter-select" value={subj} onChange={(e) => setSubj(e.target.value)}>
             <option value="ALL">All Subjects ({subjs.length})</option>
             {subjs.map((s) => (
               <option key={s} value={s}>{s}</option>
             ))}
           </select>
         )}
       </div>

       <div className="text-xs font-semibold text-slate-500">{filtered.length} notes available</div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
         {filtered.map((r) => {
           const sName = r.lesson?.subject?.name || r.subjectName;
           const lName = r.lesson?.name || r.lessonName;
           return (
             <div
               key={r.id}
               className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group cursor-pointer"
               onClick={() => onOpen(r)}
             >
               <div className="flex items-start gap-3">
                 <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                   <FileText size={20} />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                     {r.title}
                   </h4>
                   {(sName || lName) && (
                     <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                       {sName ? `${sName} › ` : ''}{lName || ''}
                     </p>
                   )}
                 </div>
               </div>

               <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                 <div className="flex items-center gap-2">
                   <span className="font-mono font-medium">{bytes(r.fileSizeBytes)}</span>
                   <span className={`px-2 py-0.5 rounded-full font-bold ${r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                     {status(r.status)}
                   </span>
                 </div>
                 <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                   {act && act(r)}
                 </div>
               </div>
             </div>
           );
         })}
       </div>
       {filtered.length === 0 && (
         <div className="text-center py-10 text-xs text-slate-400">No notes found matching your filters.</div>
       )}
     </div>
   );
 };

 const media=(kind:string,records:R[])=>kind==='videos'?<VideoCollection rows={records.map(r=>({...r,lessonName:r.lesson?.name||data?.name,subjectName:r.lesson?.subject?.name||data?.subject?.name}))} onOpen={r=>router.push(`/videos/${r.id}`)} actions={actions(kind)}/>:<NotesCollection items={records.map(r=>({...r,lessonName:r.lesson?.name||data?.name,subjectName:r.lesson?.subject?.name||data?.subject?.name}))} onOpen={r=>router.push(`/${kind}/${r.id}`)} act={actions(kind)}/>;
 const input=(name:string,key:string,type='text',required=false)=><label className="ex-field">{name}<input className="ex-input" type={type} required={required} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>;
 return <div className="batch-prototype ex-workspace">
 <header className="ex-workspace-head"><div>{(view==='subject'||view==='lesson')&&<Link className="ex-back" href={view==='lesson'?`/subjects/${data?.subjectId}`:'/subjects'}><ArrowLeft size={16}/>{view==='lesson'?data?.subject?.name||'Subject':'Main subjects'}</Link>}<h1>{view==='subjects'?<>Main <em>Subjects</em></>:view==='videos'?<>Video <em>Library</em></>:view==='notes'?<>Notes <em>Library</em></>:<em>{data?.name||'Loading…'}</em>}</h1><p className="sub">{view==='subjects'?'Build once, copy into any batch. Main stays untouched.':view==='videos'?'Search, filter and open any video.':view==='notes'?'PDF and document notes with open tracking.':data?.description|| (view==='subject'?`${data?.code||''} · ${data?.batchId?'Batch curriculum':'Main library'}`:'Videos, notes and lesson tests.')}</p></div>{manage&&['subjects','videos','notes'].includes(view)&&<button className="ex-btn" onClick={()=>open(view)}>{view==='subjects'?<Plus size={17}/>:<Upload size={17}/>} {view==='subjects'?'Add subject':view==='videos'?'Upload video':'Upload notes'}</button>}</header>
 {notice&&<p role="status" className="ex-notice">{notice}</p>}{error&&<p role="alert" className="ex-error">{error}<button className="ex-btn ghost" onClick={load}>Retry</button></p>}
 {loading?<div className="ex-card ex-empty" role="status">Loading content…</div>:<>
 {view==='subjects'&&<><nav className="ex-tabs" aria-label="Library scope"><button className={scope==='main'?'on':''} onClick={()=>setScope('main')}>Main library</button><button className={scope==='batch'?'on':''} onClick={()=>setScope('batch')}>Batch copies</button></nav><DataTable key={scope} rows={rows.filter(r=>scope==='main'?!r.batchId:!!r.batchId)} placeholder="Search subject name or code…" columns={[{label:'Subject',render:r=><b>{r.iconUrl&&!r.iconUrl.startsWith('http')?r.iconUrl:'📚'} {r.name}</b>},{label:'Code',render:r=>r.code||'—'},{label:'Lessons',render:r=>r._count.lessons},{label:'Location',render:r=><span className="ex-chip">{r.batch?.name||'Main library'}</span>},{label:'Status',render:r=><span className="ex-chip">{status(r.status)}</span>}]} onOpen={r=>router.push(`/subjects/${r.id}`)} actions={actions('subjects')}/></>}
 {(view==='videos'||view==='notes')&&media(view,rows)}
 {view==='subject'&&data&&<><nav className="ex-tabs">{['Lessons','Subject Tests'].map(t=><button className={tab===t?'on':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</nav>{tab==='Lessons'?<>{manage&&<div className="ex-right ex-mb"><button className="ex-btn" onClick={()=>open('lessons')}><Plus size={17}/>Add lesson</button></div>}<DataTable rows={data.lessons} placeholder="Search lesson…" columns={[{label:'Lesson',render:r=><b>{r.name}</b>},{label:'Videos',render:r=>r._count.videos},{label:'Notes',render:r=>r._count.notes},{label:'Tests',render:r=>r._count.tests},{label:'Status',render:r=><span className="ex-chip">{status(r.status)}</span>}]} onOpen={r=>router.push(`/lessons/${r.id}`)} actions={actions('lessons')}/></>:<>{manage&&<div className="ex-right ex-mb"><Link className="ex-btn" href={`/tests/create?subjectId=${id}&scope=SUBJECT_LEVEL`}><Plus size={17}/>Create subject test</Link></div>}{tests(data.tests)}</>}</>}
 {view==='lesson'&&data&&<>{manage&&<div className="ex-toolbar ex-mb"><button className="ex-btn" onClick={()=>open('videos')}><Upload size={17}/>Video</button><button className="ex-btn ghost" onClick={()=>open('notes')}><Upload size={17}/>Notes</button><Link className="ex-btn outline" href={`/tests/create?lessonId=${id}&scope=LESSON_LEVEL`}><Plus size={17}/>Lesson test</Link></div>}<nav className="ex-tabs">{['Videos','Notes','Tests'].map(t=><button className={tab===t?'on':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</nav>{tab==='Tests'?tests(data.tests):media(tab.toLowerCase(),data[tab.toLowerCase()])}</>}
 </>}
 {modal&&<Modal title={modal.kind==='confirm'?(modal.next==='DELETED'?'Delete record?':'Change visibility?'):modal.kind==='assign'?'Copy subject to batches':`${modal.record.id?'Edit':modal.kind==='subjects'||modal.kind==='lessons'?'Add':'Upload'} ${modal.kind==='subjects'?'subject':modal.kind==='lessons'?'lesson':modal.kind==='videos'?'video':'notes'}`} onClose={close}>
 {formError&&<p role="alert" className="ex-error">{formError}</p>}
 {modal.kind==='confirm'?<><p>{title(modal.record)} will be {modal.next==='DELETED'?'marked deleted':modal.next==='HIDDEN'?'hidden from students':'published'}. Existing source copies are not changed.</p><footer className="ex-modal-footer"><button className="ex-btn ghost" onClick={close} disabled={busy}>Cancel</button><button className="ex-btn" onClick={confirm} disabled={busy}>Confirm</button></footer></>:modal.kind==='assign'?<><p className="sub">Creates independent copies of lessons, media and tests. Tests start as drafts.</p><div className="ex-picker-list">{batches.map(b=><label className="ex-row" key={b.id}><input type="checkbox" checked={selectedBatches.includes(b.id)} onChange={e=>setSelectedBatches(e.target.checked?[...selectedBatches,b.id]:selectedBatches.filter(v=>v!==b.id))}/>{b.name}</label>)}</div><footer className="ex-modal-footer"><button className="ex-btn ghost" disabled={busy} onClick={close}>Cancel</button><button className="ex-btn" disabled={busy||!selectedBatches.length} onClick={doAssign}>Copy to {selectedBatches.length} batches</button></footer></>:<form onSubmit={save}>
 {['subjects','lessons'].includes(modal.kind)?<>{input('Name','name','text',true)}{modal.kind==='subjects'&&<>{input('Code','code')}<label className="ex-field">Icon<div className="ex-toolbar">{['📚','⚛️','🧪','🧬','📖','📐','💻'].map(icon=><button type="button" className={'ex-btn '+(form.iconUrl===icon?'':'ghost')} key={icon} onClick={()=>setForm({...form,iconUrl:icon})}>{icon}</button>)}</div></label>{!modal.record.id&&<label className="ex-field">Institute<select className="ex-input" required value={form.instituteId||''} onChange={e=>setForm({...form,instituteId:e.target.value})}><option value="">Choose institute</option>{institutes.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>}</>}</>:<>{input('Title','title','text',true)}<div className="ex-two"><label className="ex-field">Subject<select className="ex-input" required disabled={view==='lesson'||!!modal.record.id} value={form.subjectId||''} onChange={e=>chooseSubject(e.target.value)}><option value="">Choose subject</option>{library.map(s=><option key={s.id} value={s.id}>{s.name} · {s.batch?.name||'Main library'}</option>)}</select></label><label className="ex-field">Lesson<select className="ex-input" required disabled={view==='lesson'||!!modal.record.id} value={form.lessonId||''} onChange={e=>setForm({...form,lessonId:e.target.value})}><option value="">Choose lesson</option>{lessons.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label></div><label className="ex-upload"><Upload size={24}/><b>{modal.kind==='videos'?'Video file':'Notes file'}</b><small>{modal.kind==='videos'?'MP4 / WebM · up to 2 GB':'PDF / DOCX / PPTX · up to 20 MB'}</small><input type="file" accept={modal.kind==='videos'?'.mp4,.webm':'.pdf,.docx,.pptx'} disabled={busy} onChange={e=>setFile(e.target.files?.[0]||null)}/></label><p className="ex-muted ex-mb">Or use an existing {modal.kind==='videos'?'video':'document'} URL.</p>{input('URL',modal.kind==='videos'?'videoUrl':'fileUrl','url')}{modal.kind==='videos'&&<><label className="ex-field">Provider<select className="ex-input" value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})}><option value="YOUTUBE">YouTube</option><option value="DIRECT_MP4">Direct MP4 / WebM</option></select></label><label className="ex-field">Subtitles (optional WebVTT)<input className="ex-input" type="file" accept=".vtt" onChange={e=>setSubtitle(e.target.files?.[0]||null)}/></label><label className="ex-check ex-mb"><input type="checkbox" checked={form.watermark} onChange={e=>setForm({...form,watermark:e.target.checked})}/>Watermark student name</label></>}<label className="ex-check ex-mb"><input type="checkbox" checked={form.allowDownload} onChange={e=>setForm({...form,allowDownload:e.target.checked})}/>Allow download</label><label className="ex-field">Visibility<select className="ex-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="ACTIVE">Published</option><option value="HIDDEN">Draft / hidden</option></select></label></>}
 <label className="ex-field">Description<textarea rows={3} className="ex-input" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label>{busy&&file&&<p role="status">Upload: {progress}%</p>}<footer className="ex-modal-footer"><button type="button" className="ex-btn ghost" onClick={()=>busy?uploadRef.current?.abort():close()}>{busy?'Cancel upload':'Cancel'}</button><button className="ex-btn" disabled={busy}>{busy?'Saving…':'Save'}</button></footer></form>}
 </Modal>}
 </div>;
}

export function NotesViewer(){
 const {id}=useParams() as {id:string};const [data,setData]=useState<R|null>(null),[error,setError]=useState('');const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{let live=true;api.get(`/content/notes/${id}`,config).then(r=>{if(live){setData(r.data);api.post(`/content/notes/${id}/open`,{}).catch(()=>{});}}).catch(e=>{if(live)setError(message(e));});return()=>{live=false;};},[id]);
 const fileUrl=data?.note?.fileUrl;const safe=/^https?:\/\//i.test(fileUrl||'');const pdf=fileUrl&&new URL(fileUrl).pathname.toLowerCase().endsWith('.pdf');
 return <div className="batch-prototype ex-workspace"><Link className="ex-back" href={data?`/lessons/${data.note.lessonId}`:'/notes'}><ArrowLeft size={16}/>Back to lesson</Link><header className="ex-workspace-head"><div><h1><em>{data?.note.title||'Notes'}</em></h1><p className="sub">{data?.lesson.subject.name} › {data?.lesson.name} · {bytes(data?.note.fileSizeBytes||0)}</p></div><div className="ex-toolbar"><button className="ex-btn ghost" onClick={()=>ref.current?.requestFullscreen().catch(()=>setError('Fullscreen is not available in this browser.'))}><Maximize size={17}/>Full view</button>{data?.note.allowDownload&&safe&&<a className="ex-btn" href={fileUrl} target="_blank" rel="noreferrer"><Download size={17}/>Open / download</a>}</div></header>{error&&<p role="alert" className="ex-error">{error}</p>}<div className="ex-document" ref={ref}>{!data?<p role="status">Loading document…</p>:safe&&pdf?<iframe title={data.note.title} src={fileUrl+'#toolbar=1&view=FitH'}/>:<div className="ex-empty"><FileText size={40}/><h3>{data.note.title}</h3><p>Preview is available for PDF documents. Open this file in your document viewer.</p>{safe&&data.note.allowDownload&&<a className="ex-btn" href={fileUrl} target="_blank" rel="noreferrer">Open document</a>}</div>}</div><p className="sub">{data?.note.description}</p></div>;
}
