import {FastifyPluginAsync} from 'fastify';
import {z} from 'zod';
import {requirePermission} from '../plugins/rbac.plugin';
const fail=(message:string,statusCode=400):never=>{throw Object.assign(new Error(message),{statusCode});};
const http=z.string().url().refine(s=>/^https?:\/\//i.test(s),'Use an HTTP or HTTPS URL');
const state=z.enum(['ACTIVE','HIDDEN','DELETED']);
const subjectSchema=z.object({name:z.string().trim().min(1).max(100),code:z.string().trim().max(30).optional(),description:z.string().max(2000).optional(),iconUrl:z.string().max(200).optional(),instituteId:z.string().optional(),status:state.optional()});
const lessonSchema=z.object({name:z.string().trim().min(1).max(100),description:z.string().max(2000).optional(),status:state.optional()});
const videoSchema=z.object({title:z.string().trim().min(1).max(200),description:z.string().max(4000).optional(),videoUrl:http,provider:z.enum(['YOUTUBE','DIRECT_MP4','CLOUDFLARE_STREAM','MUX']),durationSeconds:z.number().int().min(0).optional(),subtitleUrl:http.nullable().optional(),allowDownload:z.boolean().optional(),watermark:z.boolean().optional(),status:state.optional()});
const noteSchema=z.object({title:z.string().trim().min(1).max(200),fileUrl:http,fileSizeBytes:z.number().int().min(0).max(20*1024*1024).optional(),description:z.string().max(4000).optional(),allowDownload:z.boolean().optional(),status:state.optional()});

export const contentRoutes:FastifyPluginAsync=async app=>{
 const db=app.prisma;
 const gate=(resource:string,action='read')=>({preHandler:[app.authenticate,requirePermission(resource,action)]});
 const scope=async(u:any)=>{
  if(u.roleCode==='STUDENT'){const p=await db.studentProfile.findUnique({where:{userId:u.userId},select:{batchId:true}});return {status:'ACTIVE',batchId:p?.batchId||'__none__',batch:{instituteId:u.instituteId||'__none__',status:'ACTIVE'}};}
  if(u.roleCode==='TEACHER')return {status:{not:'DELETED'},OR:[{batchId:null,instituteId:u.instituteId||'__none__'},{batch:{instituteId:u.instituteId||'__none__',status:'ACTIVE',faculty:{some:{userId:u.userId}}}}]};
  return {status:{not:'DELETED'},...(u.roleCode==='SUPER_ADMIN'?{}:{OR:[{instituteId:u.instituteId||'__none__'},{batch:{instituteId:u.instituteId||'__none__',status:{not:'DELETED'}}}]})};
 };
 const subjectAccess=async(id:string,u:any)=>{const s=await db.subject.findFirst({where:{id,...await scope(u)} as any});if(!s)return fail('Subject not found',404);return s;};
 const lessonAccess=async(id:string,u:any)=>{const l=await db.lesson.findFirst({where:{id,status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}}});if(!l)return fail('Lesson not found',404);await subjectAccess(l.subjectId,u);return l;};
 const videoAccess=async(id:string,u:any)=>{const v=await db.video.findFirst({where:{id,status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}}});if(!v)return fail('Video not found',404);await lessonAccess(v.lessonId,u);return v;};
 const noteAccess=async(id:string,u:any)=>{const n=await db.note.findFirst({where:{id,status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}}});if(!n)return fail('Note not found',404);await lessonAccess(n.lessonId,u);return n;};
 const parse=(schema:any,body:unknown)=>{const p=schema.safeParse(body);if(!p.success)return fail('Check the required fields, URL and file size');return p.data;};
 app.get('/api/v1/content/subjects',gate('subjects'),async request=>db.subject.findMany({where:await scope(request.user) as any,include:{batch:{select:{id:true,name:true}},_count:{select:{lessons:{where:{status:{not:'DELETED'}}}}}},orderBy:{name:'asc'}}));
 app.post('/api/v1/content/subjects',gate('subjects','create'),async(request,reply)=>{
  const p=parse(subjectSchema,request.body);const u=request.user!;const instituteId=u.roleCode==='SUPER_ADMIN'?(p.instituteId||u.instituteId):u.instituteId;if(!instituteId)return fail('Choose an institute');
  if(!await db.institute.findFirst({where:{id:instituteId,status:'ACTIVE'}}))return fail('Institute unavailable');
  return reply.code(201).send(await db.subject.create({data:{...p,instituteId,batchId:null,status:'ACTIVE'}}));
 });
 app.get('/api/v1/content/subjects/:id',gate('subjects'),async request=>{
  const {id}=request.params as any;const s=await subjectAccess(id,request.user);const visible:any={status:request.user!.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}};
  const [lessons,tests]=await Promise.all([db.lesson.findMany({where:{subjectId:id,...visible},include:{_count:{select:{videos:{where:visible},notes:{where:visible},tests:{where:visible}}}},orderBy:{sortOrder:'asc'}}),db.test.findMany({where:{subjectId:id,...visible,...(request.user!.roleCode==='STUDENT'?{isPublished:true}:{})},select:{id:true,title:true,testType:true,testStatus:true,durationMinutes:true,totalMarks:true,status:true}})]);return {...s,lessons,tests};
 });
 app.put('/api/v1/content/subjects/:id',gate('subjects','update'),async request=>{const {id}=request.params as any;await subjectAccess(id,request.user);const p=parse(subjectSchema.omit({instituteId:true}).partial(),request.body);return db.subject.update({where:{id},data:p});});
 app.post('/api/v1/content/subjects/:id/lessons',gate('lessons','create'),async(request,reply)=>{const {id}=request.params as any;await subjectAccess(id,request.user);const p=parse(lessonSchema,request.body);return reply.code(201).send(await db.lesson.create({data:{...p,subjectId:id}}));});
 app.get('/api/v1/content/lessons/:id',gate('lessons'),async request=>{
  const {id}=request.params as any;const l=await lessonAccess(id,request.user);const visible:any={status:request.user!.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}};
  return db.lesson.findUnique({where:{id:l.id},include:{subject:{include:{batch:{select:{id:true,name:true}}}},videos:{where:visible,orderBy:{sortOrder:'asc'}},notes:{where:visible,orderBy:{sortOrder:'asc'}},tests:{where:{...visible,...(request.user!.roleCode==='STUDENT'?{isPublished:true}:{})},select:{id:true,title:true,testType:true,testStatus:true,durationMinutes:true,totalMarks:true,status:true}}}});
 });
 app.put('/api/v1/content/lessons/:id',gate('lessons','update'),async request=>{const {id}=request.params as any;await lessonAccess(id,request.user);return db.lesson.update({where:{id},data:parse(lessonSchema.partial(),request.body)});});
 for(const kind of ['videos','notes'] as const){
  app.get(`/api/v1/content/${kind}`,gate(kind),async request=>{const where:any={status:request.user!.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'},lesson:{status:request.user!.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'},subject:await scope(request.user)}};const include={lesson:{include:{subject:{include:{batch:{select:{id:true,name:true}}}}}}};return kind==='videos'?db.video.findMany({where,include,orderBy:{createdAt:'desc'}}):db.note.findMany({where,include,orderBy:{createdAt:'desc'}});});
  app.post(`/api/v1/content/lessons/:id/${kind}`,gate(kind,'create'),async(request,reply)=>{const {id}=request.params as any;await lessonAccess(id,request.user);const p=parse(kind==='videos'?videoSchema:noteSchema,request.body);return reply.code(201).send(kind==='videos'?await db.video.create({data:{...p,lessonId:id}}):await db.note.create({data:{...p,lessonId:id}}));});
  app.put(`/api/v1/content/${kind}/:id`,gate(kind,'update'),async request=>{const {id}=request.params as any;if(kind==='videos')await videoAccess(id,request.user);else await noteAccess(id,request.user);const p=parse((kind==='videos'?videoSchema:noteSchema).partial(),request.body);return kind==='videos'?db.video.update({where:{id},data:p}):db.note.update({where:{id},data:p});});
 }
 app.get('/api/v1/content/videos/:id',gate('videos'),async request=>{
  const {id}=request.params as any,u=request.user!;const video=await videoAccess(id,u);const lesson=await db.lesson.findUnique({where:{id:video.lessonId},include:{subject:{include:{batch:{select:{id:true,name:true}}}}}});
  const [playlist,notes,progress,comments,reactions]=await Promise.all([
   db.video.findMany({where:{lesson:{subjectId:lesson!.subjectId,status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}},status:u.roleCode==='STUDENT'?'ACTIVE':{not:'DELETED'}},select:{id:true,title:true,durationSeconds:true,lesson:{select:{name:true}},watchProgress:{where:{userId:u.userId},select:{isCompleted:true}}},orderBy:{sortOrder:'asc'}}),
   db.videoPersonalNote.findMany({where:{videoId:id,userId:u.userId},orderBy:{seconds:'asc'}}),db.videoWatchProgress.findUnique({where:{userId_videoId:{videoId:id,userId:u.userId}}}),
   db.videoComment.findMany({where:{videoId:id},orderBy:{createdAt:'asc'},take:200}),db.videoReaction.findMany({where:{videoId:id},select:{userId:true,reactionType:true}})
  ]);
  const authors=await db.user.findMany({where:{id:{in:[...new Set(comments.map(c=>c.userId))]}},select:{id:true,fullName:true}});
  return {video,lesson,playlist,notes,progress,comments:comments.map(c=>({...c,author:authors.find(a=>a.id===c.userId)?.fullName||'User'})),reactions:{LIKE:reactions.filter(r=>r.reactionType==='LIKE').length,LOVE:reactions.filter(r=>r.reactionType==='LOVE').length,mine:reactions.find(r=>r.userId===u.userId)?.reactionType||null}};
 });
 app.post('/api/v1/content/videos/:id/personal-notes',gate('videos'),async(request,reply)=>{const {id}=request.params as any;await videoAccess(id,request.user);const p=parse(z.object({seconds:z.number().int().nonnegative(),text:z.string().trim().min(1).max(2000)}),request.body);return reply.code(201).send(await db.videoPersonalNote.create({data:{...p,videoId:id,userId:request.user!.userId}}));});
 app.delete('/api/v1/content/videos/:id/personal-notes/:noteId',gate('videos'),async request=>{const {id,noteId}=request.params as any;await videoAccess(id,request.user);await db.videoPersonalNote.deleteMany({where:{id:noteId,videoId:id,userId:request.user!.userId}});return {success:true};});
 app.post('/api/v1/content/videos/:id/progress',gate('videos'),async request=>{const {id}=request.params as any;await videoAccess(id,request.user);const p=parse(z.object({progressSeconds:z.number().int().min(0),durationSeconds:z.number().int().positive()}),request.body);const data={...p,progressSeconds:Math.min(p.progressSeconds,p.durationSeconds),isCompleted:p.progressSeconds/p.durationSeconds>=.95};return db.videoWatchProgress.upsert({where:{userId_videoId:{userId:request.user!.userId,videoId:id}},create:{...data,userId:request.user!.userId,videoId:id},update:data});});
 app.post('/api/v1/content/videos/:id/comments',gate('comments','create'),async(request,reply)=>{const {id}=request.params as any;await videoAccess(id,request.user);const p=parse(z.object({content:z.string().trim().min(1).max(2000),parentId:z.string().optional()}),request.body);if(p.parentId&&!await db.videoComment.findFirst({where:{id:p.parentId,videoId:id}}))return fail('Reply target not found');return reply.code(201).send(await db.videoComment.create({data:{...p,videoId:id,userId:request.user!.userId}}));});
 app.post('/api/v1/content/videos/:id/reactions',gate('reactions','create'),async request=>{const {id}=request.params as any;await videoAccess(id,request.user);const p=parse(z.object({reactionType:z.enum(['LIKE','LOVE'])}),request.body);const where={videoId_userId:{videoId:id,userId:request.user!.userId}};const existing=await db.videoReaction.findUnique({where});if(existing?.reactionType===p.reactionType)await db.videoReaction.delete({where});else await db.videoReaction.upsert({where,create:{...where.videoId_userId,...p},update:p});return {success:true};});
 app.get('/api/v1/content/notes/:id',gate('notes'),async request=>{const {id}=request.params as any;const note=await noteAccess(id,request.user);const lesson=await db.lesson.findUnique({where:{id:note.lessonId},include:{subject:true}});return {note,lesson};});
 app.post('/api/v1/content/notes/:id/open',gate('notes'),async request=>{const {id}=request.params as any;await noteAccess(id,request.user);await db.noteOpen.upsert({where:{noteId_userId:{noteId:id,userId:request.user!.userId}},create:{noteId:id,userId:request.user!.userId},update:{count:{increment:1}}});return {success:true};});
};
