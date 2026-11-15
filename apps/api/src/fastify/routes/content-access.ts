import { PrismaClient } from '@prisma/client';

// Shared hierarchy checks for content and saved learning material.
export function contentAccess(db: PrismaClient) {
 const fail=(message:string,statusCode=404):never=>{throw Object.assign(new Error(message),{statusCode});};
 const scope=async(u:any)=>{
  if(u.roleCode==='STUDENT'){const p=await db.studentProfile.findUnique({where:{userId:u.userId},select:{batchId:true}});return {status:'ACTIVE',batchId:p?.batchId||'__none__',batch:{instituteId:u.instituteId||'__none__',status:'ACTIVE'}};}
  if(u.roleCode==='TEACHER')return {status:{not:'DELETED'},OR:[{batchId:null,instituteId:u.instituteId||'__none__'},{batch:{instituteId:u.instituteId||'__none__',status:'ACTIVE',faculty:{some:{userId:u.userId}}}}]};
  return {status:{not:'DELETED'},...(u.roleCode==='SUPER_ADMIN'?{}:{OR:[{instituteId:u.instituteId||'__none__'},{batch:{instituteId:u.instituteId||'__none__',status:{not:'DELETED'}}}]})};
 };
 const subjectAccess=async(id:string,u:any)=>{const s=await db.subject.findFirst({where:{id,...await scope(u)} as any});if(!s)return fail('Subject not found',404);return s;};
 const lessonAccess=async(id:string,u:any)=>{const l=await db.lesson.findFirst({where:{id,status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}}});if(!l)return fail('Lesson not found',404);await subjectAccess(l.subjectId,u);return l;};
 const videoAccess=async(id:string,u:any)=>{const v=await db.video.findFirst({where:{id,status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}}});if(!v)return fail('Video not found',404);await lessonAccess(v.lessonId,u);return v;};
 const noteAccess=async(id:string,u:any)=>{const n=await db.note.findFirst({where:{id,status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}}});if(!n)return fail('Note not found',404);await lessonAccess(n.lessonId,u);return n;};
 return { scope, subjectAccess, lessonAccess, videoAccess, noteAccess };
}
