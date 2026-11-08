export const PERMISSION_CATALOG:Record<string,{label:string;actions:string[]}>= {
 batches:{label:'Batches & enrollment',actions:['read','create','update','delete','export']},
 subjects:{label:'Subjects & curriculum',actions:['read','create','update','delete']},
 lessons:{label:'Lessons',actions:['read','create','update','delete']},
 videos:{label:'Videos',actions:['read','create','update','delete','publish']},
 notes:{label:'Notes',actions:['read','create','update','delete']},
 resources:{label:'Files & folders',actions:['read','create','update','delete']},
 tests:{label:'Tests & publishing',actions:['read','create','update','delete','publish','take']},
 questions:{label:'Question bank',actions:['read','create','update','delete']},
 attempts:{label:'Test attempts',actions:['read']},results:{label:'Results',actions:['read','export']},analytics:{label:'Analytics',actions:['read']},
 students:{label:'Student records',actions:['read','create','update','delete']},teachers:{label:'Teacher records',actions:['read','create','update','delete']},
 comments:{label:'Comments',actions:['read','create','update','delete','moderate']},reactions:{label:'Reactions',actions:['read','create','delete']},
 community:{label:'Community',actions:['read','create','update','delete','publish']},chat:{label:'Chat',actions:['read','create']},
 storage:{label:'File uploads',actions:['upload']},exports:{label:'Data exports',actions:['create']},roles:{label:'Roles & permissions',actions:['read','update']},settings:{label:'Institute settings',actions:['manage']},system:{label:'Audit & system',actions:['read']}
};
export const ALL_PERMISSIONS=Object.entries(PERMISSION_CATALOG).flatMap(([r,v])=>v.actions.map(a=>`${r}.${a}`));
export const ROLE_DEFAULTS:Record<string,string[]>={
 SUPER_ADMIN:['*.*'],ADMIN:ALL_PERMISSIONS.filter(p=>p!=='tests.take'),
 TEACHER:['batches.read','subjects.read','subjects.create','subjects.update','lessons.read','lessons.create','lessons.update','videos.read','videos.create','videos.update','videos.delete','videos.publish','notes.read','notes.create','notes.update','notes.delete','resources.read','resources.create','resources.update','resources.delete','tests.read','tests.create','tests.update','tests.publish','tests.delete','questions.read','questions.create','questions.update','questions.delete','attempts.read','results.read','results.export','analytics.read','students.read','comments.read','comments.create','comments.update','comments.delete','comments.moderate','reactions.read','reactions.create','reactions.delete','community.read','community.create','chat.read','chat.create','storage.upload'],
 STUDENT:['batches.read','subjects.read','lessons.read','videos.read','notes.read','resources.read','tests.read','tests.take','attempts.read','results.read','comments.read','comments.create','comments.update','comments.delete','reactions.read','reactions.create','reactions.delete','community.read','chat.read','chat.create','storage.upload'],
 EMPLOYEE:['batches.read','subjects.read','lessons.read','videos.read','notes.read','resources.read','tests.read','students.read','students.update','teachers.read','community.read','chat.read','chat.create','storage.upload']
};
const expand=(resource:string,action:string)=>ALL_PERMISSIONS.filter(p=>{const[r,a]=p.split('.');return(resource==='*'||r===resource)&&(action==='*'||a===action);});
export function rolePermissions(role:any):string[]{
 if(role.code==='SUPER_ADMIN')return ['*.*'];
 const result=new Set<string>(role.permissionsConfigured?[]:ROLE_DEFAULTS[role.code]||[]);
 for(const p of role.permissions||[])for(const key of expand(p.resource,p.action))result.add(key);
 return [...result].sort();
}
export function effectivePermissions(role:any,grants:any[]=[]):string[]{
 if(role.code==='SUPER_ADMIN')return ['*.*'];const result=new Set(rolePermissions(role));
 for(const g of grants.filter(g=>g.effect!=='DENY'))for(const key of expand(g.resource,g.action))result.add(key);
 for(const g of grants.filter(g=>g.effect==='DENY'))for(const key of expand(g.resource,g.action))result.delete(key);
 // Administrative access is never delegated through a checkbox or user override.
 if(role.code!=='ADMIN'){result.delete('roles.read');result.delete('roles.update');result.delete('settings.manage');result.delete('system.read');}
 return [...result].sort();
}
