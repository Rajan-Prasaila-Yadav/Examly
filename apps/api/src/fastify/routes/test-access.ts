import {FastifyInstance} from 'fastify';
export function resultVisible(test:any,manual=false){const mode=test.config?.publishMode||'IMMEDIATE';return mode==='IMMEDIATE'||(mode==='AFTER_TEST_END'&&Date.now()>=+new Date(test.endDateTime))||(mode==='SCHEDULED'&&test.config?.publishDateTime&&Date.now()>=+new Date(test.config.publishDateTime))||(mode==='MANUAL_BY_ADMIN'&&manual);}
export function installTestAccess(app:FastifyInstance){
 app.addHook('onRoute',options=>{
  const url=options.url;if(!url.startsWith('/api/v1/tests'))return;
  const guard=async(request:any,reply:any)=>{
   const u=request.user,p=request.params||{};if(!u)return reply.code(401).send({message:'Sign in required'});
   let id=p.id,attempt:any;
   if(p.attemptId){attempt=await app.prisma.testAttempt.findUnique({where:{id:p.attemptId},select:{testId:true,studentId:true,result:{select:{publishedAt:true}}}});id=attempt?.testId;if(u.roleCode==='STUDENT'&&attempt?.studentId!==u.userId)return reply.code(404).send({message:'Attempt not found'});}
   else if(url.includes('/questions/:id'))id=(await app.prisma.question.findUnique({where:{id},select:{section:{select:{testId:true}}}}))?.section.testId;
   else if(url.includes('/sections/:id'))id=(await app.prisma.section.findUnique({where:{id},select:{testId:true}}))?.testId;
   if(!p.id&&!p.attemptId)return;
   if(!id)return reply.code(404).send({message:'Test not found'});
   let test=await app.prisma.test.findFirst({where:{id,status:{not:'DELETED'},...(u.roleCode==='SUPER_ADMIN'?{}:{instituteId:u.instituteId||'__none__'})},include:{config:true,_count:{select:{attempts:true}}}});
   if(!test)return reply.code(404).send({message:'Test not found'});
   if(u.roleCode==='TEACHER'&&test.instituteId!==u.instituteId&&u.roleCode!=='SUPER_ADMIN')return reply.code(404).send({message:'Test not found'});
   if(test.testStatus==='SCHEDULED'&&test.publishAt&&+test.publishAt<=Date.now()){await app.prisma.test.update({where:{id},data:{testStatus:'LIVE',isPublished:true}});test={...test,testStatus:'LIVE',isPublished:true};}
   request.examlyTest=test;
   if(u.roleCode==='STUDENT'){
    const profile=await app.prisma.studentProfile.findUnique({where:{userId:u.userId},select:{batchId:true,batch:{select:{status:true}}}});
    if(test.status!=='ACTIVE'||!test.isPublished)return reply.code(404).send({message:'Test not available for this enrollment'});
    if(test.batchId&&profile?.batchId&&test.batchId!==profile.batchId){
      const match=await app.prisma.subject.findFirst({where:{batchId:profile.batchId,OR:[{id:test.subjectId||'__none__'},{copiedFromId:test.subjectId||'__none__'}]}});
      if(!match)return reply.code(404).send({message:'Test not available for this enrollment'});
    }
    if((url.endsWith('/result')||url.endsWith('/leaderboard'))&&!attempt?.result&&!resultVisible(test,!!attempt?.result?.publishedAt))return reply.code(403).send({message:'Results have not been released yet'});
    if(url==='/api/v1/tests/:id'&&Date.now()<+test.startDateTime)return reply.code(403).send({message:'Test has not started yet'});
   }else if(request.method!=='GET'&&test._count.attempts&&(/\/questions|\/sections/.test(url)||request.method==='PUT'&&url==='/api/v1/tests/:id'))return reply.code(409).send({message:'Questions and scoring settings are locked after attempts begin'});
  };
  const pre=options.preHandler;options.preHandler=[...(Array.isArray(pre)?pre:pre?[pre]:[]),guard];
 });
 app.addHook('onSend',async(request:any,reply,payload)=>{
  const test=request.examlyTest;
  if(request.method!=='GET'&&test&&reply.statusCode<300){app.cache.invalidateTag('tests');app.cache.invalidate(`test:detail:${test.id}:true`);app.cache.invalidate(`test:detail:${test.id}:false`);}
  if(request.user?.roleCode==='STUDENT'&&test&&request.routeOptions.url.endsWith('/submit')&&test.config?.publishMode==='MANUAL_BY_ADMIN'&&typeof payload==='string'){
   const body=JSON.parse(payload);if(body.result&&!body.result.publishedAt){delete body.result;body.resultsPending=true;return JSON.stringify(body);}
  }
  return payload;
 });
}
