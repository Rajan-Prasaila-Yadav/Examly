import {FastifyInstance} from 'fastify';
import {requirePermission} from './rbac.plugin';
// Supplements route-specific guards; permission grants never bypass record ownership.
export function installRoutePolicy(app:FastifyInstance){
 app.addHook('onRoute',options=>{
  const url=options.url;if(!url.startsWith('/api/v1/')||url.startsWith('/api/v1/auth/')||!options.preHandler)return;
  const guard=async(req:any,reply:any)=>{
   if(!req.user)return;
   const u=req.user,p=req.params||{},body=req.body||{};
   const deny=()=>reply.code(404).send({message:'Record not found or inaccessible'});
   if(url.startsWith('/api/v1/videos/')){
    const resource=url.includes('/comments')?'comments':url.includes('/reactions')?'reactions':'videos';
    const action=req.method==='GET'||resource==='videos'?'read':req.method==='DELETE'?'delete':req.method==='PUT'?'update':'create';
    await requirePermission(resource,action)(req,reply);if(reply.sent)return;
   }
   if(url.startsWith('/api/v1/batches/:id/')){
    const kind=p.kind;
    if(['subjects','tests','students','teachers'].includes(kind)){
     const action=req.method==='GET'?'read':req.method==='POST'&&['subjects','tests'].includes(kind)?'create':'update';
     await requirePermission(kind,action)(req,reply);if(reply.sent)return;
    }
    if(url.includes('/subjects/:subjectId')){
     await requirePermission('subjects',body.status==='DELETED'?'delete':'update')(req,reply);if(reply.sent)return;
    }
   }
   if(url.startsWith('/api/v1/users/')&&url.endsWith('/360')&&u.roleCode!=='SUPER_ADMIN'){
    const target=await app.prisma.user.findFirst({where:{id:p.id,instituteId:u.instituteId||'__none__'}});
    const profile=target?null:await app.prisma.studentProfile.findFirst({where:{id:p.id,user:{instituteId:u.instituteId||'__none__'}}});
    if(!target&&!profile)return deny();
   }
   let resource=url.startsWith('/api/v1/content/')?url.split('/')[4]:url.split('/')[3];
   if(url.includes('/notes'))resource='notes';else if(url.includes('/videos')&&!url.includes('/personal-notes'))resource='videos';
   if(body.status==='DELETED'){await requirePermission(resource,'delete')(req,reply);if(reply.sent)return;}
   if(url.endsWith('/export')){await requirePermission(url.includes('/batches/')?'batches':'results','export')(req,reply);if(reply.sent)return;}
   if(url.includes('/workspace/export')){const kind=body.kind;const r=kind==='classes'?'batches':kind;await requirePermission(r,'read')(req,reply);if(reply.sent)return;}
   // New workspace/content routes already validate hierarchy. Guard legacy catalog routes too.
   if(!['subjects','lessons','videos'].includes(url.split('/')[3]))return;
   const student=u.roleCode==='STUDENT';const profile=student?await app.prisma.studentProfile.findUnique({where:{userId:u.userId},select:{batchId:true}}):null;
   const subjectAllowed=async(id:string)=>!!await app.prisma.subject.findFirst({where:{id,status:student?'ACTIVE':{not:'DELETED'},...(student?{batchId:profile?.batchId||'__none__',batch:{instituteId:u.instituteId,status:'ACTIVE'}}:u.roleCode==='SUPER_ADMIN'?{}:{OR:[{instituteId:u.instituteId||'__none__'},{batch:{instituteId:u.instituteId||'__none__',status:{not:'DELETED'}}}]})} as any});
   const lessonAllowed=async(id:string)=>{const l=await app.prisma.lesson.findFirst({where:{id,status:student?'ACTIVE':{not:'DELETED'}}});return !!l&&await subjectAllowed(l.subjectId);};
   let subjectId=body.subjectId||p.subjectId,lessonId=body.lessonId||p.lessonId;
   if(url==='/api/v1/subjects/:id')subjectId=p.id;
   if(url==='/api/v1/lessons/:id')lessonId=p.id;
   if(subjectId&&!await subjectAllowed(subjectId))return deny();
   if(lessonId&&!await lessonAllowed(lessonId))return deny();
   const batchId=body.batchId||p.batchId;
   if(batchId&&!await app.prisma.batch.findFirst({where:{id:batchId,status:student?'ACTIVE':{not:'DELETED'},...(u.roleCode==='SUPER_ADMIN'?{}:{instituteId:u.instituteId||'__none__'}),...(student?{students:{some:{userId:u.userId}}}:{})}}))return deny();
   let videoId=p.videoId;
   if(url.startsWith('/api/v1/videos/:id')||url.startsWith('/api/v1/lessons/videos/:id'))videoId=p.id;
   if(url.includes('/comments/:commentId')){const c=await app.prisma.videoComment.findUnique({where:{id:p.commentId}});if(!c)return deny();videoId=c.videoId;}
   if(videoId){const v=await app.prisma.video.findFirst({where:{id:videoId,status:student?'ACTIVE':{not:'DELETED'}}});if(!v||!await lessonAllowed(v.lessonId))return deny();}
   if(url.startsWith('/api/v1/lessons/notes/:id')){const n=await app.prisma.note.findUnique({where:{id:p.id}});if(!n||!await lessonAllowed(n.lessonId))return deny();}
   if(url.startsWith('/api/v1/lessons/resources/:id')){const r=await app.prisma.resourceNode.findUnique({where:{id:p.id}});if(!r||!await lessonAllowed(r.lessonId))return deny();}
  };
  const pre=options.preHandler;options.preHandler=[...(Array.isArray(pre)?pre:[pre]),guard];
 });
}
