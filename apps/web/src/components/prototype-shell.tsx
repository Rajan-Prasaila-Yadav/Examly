'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, BookOpen, FileCheck2, Users, Video, MessageSquare, ShieldCheck, PanelLeft, Sun, Moon, LogOut, ChevronRight, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const names: Record<string,string> = { batches:'Batches',curriculum:'Subjects',tests:'Tests',students:'Students',teachers:'Teachers',videos:'Videos',notes:'Notes',subjects:'Subjects',lessons:'Lessons',community:'Community',settings:'Settings',builder:'Builder' };
export function PrototypeShell({children}:{children:React.ReactNode}) {
  const {user,logout,can}=useAuth(); const path=usePathname();
  const [collapsed,setCollapsed]=useState(false),[width,setWidth]=useState(248),[theme,setTheme]=useState('light');
  const [ready,setReady]=useState(false); const drag=useRef(false);
  useEffect(()=>{try {setCollapsed(localStorage.getItem('examly.sidebar.collapsed')==='true');setWidth(Math.max(190,Math.min(360,Number(localStorage.getItem('examly.sidebar.width'))||248)));const t=localStorage.getItem('examly.theme')||'light';setTheme(t);document.documentElement.classList.toggle('dark',t==='dark');}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready){try{localStorage.setItem('examly.sidebar.collapsed',String(collapsed));localStorage.setItem('examly.sidebar.width',String(width));localStorage.setItem('examly.theme',theme);document.documentElement.classList.toggle('dark',theme==='dark');}catch{}}},[ready,collapsed,width,theme]);
  const student=user?.role==='STUDENT', manager=user?.role==='ADMIN'||user?.role==='SUPER_ADMIN';
  const menu=[{href:'/',name:student?'Home':'Dashboard',icon:Home,show:true},{href:'/batches',name:student?'My Courses':'Batches',icon:Layers,show:true},{href:'/curriculum',name:'Subjects',icon:BookOpen,show:true},{href:'/videos',name:'Videos',icon:Video,show:true},{href:'/notes',name:'Notes',icon:BookOpen,show:true},{href:student?'/tests':'/tests/builder',name:'Tests',icon:FileCheck2,show:true},{href:'/teachers',name:'Teachers',icon:Users,show:!student},{href:'/students',name:'Students',icon:Users,show:!student},{href:'/community',name:'Community',icon:MessageSquare,show:true},{href:'/settings/roles',name:'Roles & permissions',icon:ShieldCheck,show:manager}].filter(x=>x.show && (x.href==='/' || can(x.href==='/settings/roles'?'roles':x.href==='/curriculum'?'subjects':x.href.split('/')[1])));
  const parts=path.split('/').filter(Boolean);
  return <div className={`ex-shell ${theme==='dark'?'dark':''}`} data-theme={theme} style={{'--sidebar-width':`${collapsed?76:width}px`} as React.CSSProperties}>
    <aside className={`ex-side ${collapsed?'is-collapsed':''}`}>
      <div className="ex-brand-row"><Link href="/" className="ex-logo" aria-label="Examly home">exam<b>ly</b></Link><button className="ex-toggle" onClick={()=>setCollapsed(!collapsed)} title={collapsed?'Expand sidebar':'Collapse sidebar'} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}><PanelLeft size={20}/></button></div>
      <div className="ex-role"><small>You’re signed in as</small><div>{user?.role?.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())||'Loading…'}</div></div>
      <nav aria-label="Main navigation">{menu.map(item=>{const Icon=item.icon;const active=path===item.href||(item.href!=='/'&&path.startsWith(item.href.split('/').slice(0,2).join('/')));return <Link key={item.href} href={item.href} title={item.name} aria-current={active?'page':undefined} className={`ex-nav ${active?'on':''}`}><Icon size={20}/><span>{item.name}</span></Link>;})}</nav>
      <div className="ex-side-bottom"><button className="ex-nav" onClick={logout} title="Sign out"><LogOut size={20}/><span>Sign out</span></button></div>
    </aside>
    <div className="ex-resize" role="separator" aria-label="Resize sidebar" aria-orientation="vertical" aria-valuemin={190} aria-valuemax={360} aria-valuenow={width} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setCollapsed(false);setWidth(v=>Math.max(190,Math.min(360,v+(e.key==='ArrowRight'?10:-10))));}}} onPointerDown={e=>{drag.current=true;e.currentTarget.setPointerCapture(e.pointerId);setCollapsed(false);}} onPointerMove={e=>{if(drag.current)setWidth(Math.max(190,Math.min(360,e.clientX-14)));}} onPointerUp={()=>{drag.current=false;}} onPointerCancel={()=>{drag.current=false;}}/>
    <div className="ex-main"><header className="ex-top"><nav className="ex-crumb" aria-label="Breadcrumb">{parts.length===0?<b>Dashboard</b>:parts.map((p,i)=><React.Fragment key={i}>{i>0&&<ChevronRight size={14}/>} {i===parts.length-1?<b>{names[p]||'Details'}</b>:<Link href={'/'+parts.slice(0,i+1).join('/')}>{names[p]||'Details'}</Link>}</React.Fragment>)}</nav><button className="ex-icon" title={theme==='light'?'Switch to dark mode':'Switch to light mode'} aria-label={theme==='light'?'Switch to dark mode':'Switch to light mode'} onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={20}/>:<Sun size={20}/>}</button><Link className="ex-icon" href="/settings" title="Profile settings" aria-label="Profile settings"><Settings size={20}/></Link><Link className="ex-avatar" href={student&&user?.id?`/students/${user.id}`:'/settings'} title={user?.fullName||'Profile'}>{user?.avatarUrl?<img src={user.avatarUrl} alt=""/>:user?.fullName?.[0]||'U'}</Link></header><main className={"ex-page"+(path.startsWith('/tests')?' ex-test-page':'')}>{children}</main></div>
  </div>;
}

