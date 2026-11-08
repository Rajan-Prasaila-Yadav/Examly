import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requirePermission, hasPermission } from '../plugins/rbac.plugin';
import ExcelJS = require('exceljs');
import PdfPrinter = require('pdfmake');

const fail = (message: string, statusCode = 400): never => { throw Object.assign(new Error(message), { statusCode }); };
const idsSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100).transform(a => [...new Set(a)]) });
const person = { id:true, fullName:true, email:true, phone:true, avatarUrl:true, status:true, identifier:true } as const;
const classSchema = z.object({ id:z.string().optional(), subjectId:z.string(), teacherId:z.string(), topic:z.string().trim().min(1).max(300), date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v), startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), status:z.enum(['Created','Upcoming','Live','Completed','Cancelled']) }).refine(x=>x.endTime>x.startTime,{message:'End time must be after start time'});

export const batchWorkspaceRoutes: FastifyPluginAsync = async app => {
 const db=app.prisma;
 const access=async (request:any, write=false) => {
  const u=request.user; const id=request.params.id;
  const b=await db.batch.findFirst({where:{id,status:{not:'DELETED'},...(u.roleCode==='SUPER_ADMIN'?{}:{instituteId:u.instituteId||'__none__'})}});
  if(!b) return fail('Batch not found',404);
  if(u.roleCode==='TEACHER'&&write&&!await db.batchFaculty.findUnique({where:{batchId_userId:{batchId:id,userId:u.userId}}}))return fail('Batch not assigned',404);
  if(u.roleCode==='STUDENT') {
   if(write) return fail('Read-only access',403);
   const s=await db.studentProfile.findUnique({where:{userId:u.userId}});
   if(s?.batchId!==id || b.status!=='ACTIVE') return fail('Batch not found',404);
  }
  return b;
 };
 const read={preHandler:[app.authenticate,requirePermission('batches','read')]};
 const write={preHandler:[app.authenticate,requirePermission('batches','update')]};
 const copyTest=async(tx:any,source:any,batchId:string,subjectId:string|null=null,lessonId:string|null=null)=>{
  const {id,createdAt,updatedAt,sections,config,...fields}=source;
  return tx.test.create({data:{...fields,batchId,subjectId,lessonId,isPublished:false,testStatus:'DRAFT',
   ...(config?{config:{create:Object.fromEntries(Object.entries(config).filter(([k])=>!['id','testId'].includes(k)))}}:{}),
   sections:{create:sections.map((s:any)=>({name:s.name,sortOrder:s.sortOrder,questions:{create:s.questions.map((q:any)=>({questionType:q.questionType,contentHtml:q.contentHtml,marksPositive:q.marksPositive,marksNegative:q.marksNegative,diagramUrl:q.diagramUrl,sortOrder:q.sortOrder,options:{create:q.options.map(({id,questionId,...o}:any)=>o)},...(q.solution?{solution:{create:Object.fromEntries(Object.entries(q.solution).filter(([k])=>!['id','questionId'].includes(k)))}}:{})}))}}))}
  }});
 };
 const testInclude={config:true,sections:{include:{questions:{include:{options:true,solution:true}}}}} as const;
 app.get('/api/v1/batches/:id/workspace',read,async request=>{
  const batch=await access(request); const student=request.user!.roleCode==='STUDENT'; const manager=hasPermission(request.user,'batches','update')&&!student;
  const visible:any=student?{status:'ACTIVE'}:{status:{not:'DELETED'}};
  const subjects=await db.subject.findMany({where:{batchId:batch.id,...visible},orderBy:{sortOrder:'asc'},include:{lessons:{where:visible,orderBy:{sortOrder:'asc'},include:{videos:{where:visible,orderBy:{sortOrder:'asc'}},notes:{where:visible,orderBy:{sortOrder:'asc'}},_count:{select:{tests:{where:{status:{not:'DELETED'}}}}}}}}});
  const allSubIds=[...new Set([...subjects.map(s=>s.id),...subjects.map(s=>s.copiedFromId).filter((x):x is string=>Boolean(x))])];
  const allLesIds=[...new Set([...subjects.flatMap(s=>s.lessons.map(l=>l.id)),...subjects.flatMap(s=>s.lessons.map(l=>l.copiedFromId)).filter((x):x is string=>Boolean(x))])];
  const [faculty,students,tests,classes]=await Promise.all([
   db.batchFaculty.findMany({where:{batchId:batch.id,user:{status:{not:'DELETED'}}},include:{user:{select:{...person,teacherProfile:true}}}}),
   student?Promise.resolve([]):db.studentProfile.findMany({where:{batchId:batch.id,user:{status:{not:'DELETED'}}},include:{user:{select:person}}}),
   db.test.findMany({where:{OR:[{batchId:batch.id},...(allSubIds.length?[{subjectId:{in:allSubIds}}]:[]),...(allLesIds.length?[{lessonId:{in:allLesIds}}]:[])],...visible,...(student?{isPublished:true}:{})},select:{id:true,title:true,testType:true,status:true,testStatus:true,isPublished:true,subjectId:true,lessonId:true,startDateTime:true,endDateTime:true,durationMinutes:true,totalMarks:true,_count:{select:{attempts:true,sections:true}}},orderBy:{createdAt:'desc'}}),
   db.batchClass.findMany({where:{batchId:batch.id,...(!manager?{status:{not:'Created'}}:{})},include:{subject:{select:{id:true,name:true}},teacher:{select:{id:true,fullName:true}},attendance:{where:student?{userId:request.user!.userId}:{}}},orderBy:[{date:'asc'},{startTime:'asc'}]})
  ]);
  const studentCount=await db.studentProfile.count({where:{batchId:batch.id,user:{status:{not:'DELETED'}}}});
  const allowed=(r:string)=>hasPermission(request.user,r,'read');
  return {batch,subjects:allowed('subjects')?subjects.map(s=>({...s,lessons:allowed('lessons')?s.lessons.map(l=>({...l,videos:allowed('videos')?l.videos:[],notes:allowed('notes')?l.notes:[]})):[]})):[],teachers:allowed('teachers')?faculty.map(f=>({...f.user,subjectIds:f.subjectIds})):[],students:allowed('students')?students.map(s=>({...s.user,studentProfile:{id:s.id,batchId:s.batchId,rollNumber:s.rollNumber}})):[],tests:allowed('tests')?tests:[],classes:classes.map(c=>({...c,attendance:allowed('students')||student?c.attendance:[]})),studentCount,canManage:manager};
 });
 app.get('/api/v1/batches/:id/picker/:kind',write,async request=>{
  const b=await access(request,true); const {kind}=request.params as any;
  if(kind==='teachers')return db.user.findMany({where:{instituteId:b.instituteId,status:'ACTIVE',role:{code:'TEACHER'},batchFaculty:{none:{batchId:b.id}}},select:{...person,teacherProfile:true}});
  // Existing student access throughout Examly is based on a single primary batch.
  // Do not silently transfer students away from an existing enrollment.
  if(kind==='students')return db.user.findMany({where:{instituteId:b.instituteId,status:'ACTIVE',role:{code:'STUDENT'},studentProfile:{is:{batchId:null}}},select:person});
  if(kind==='subjects')return db.subject.findMany({where:{status:'ACTIVE',OR:[{batchId:null,instituteId:b.instituteId},{batch:{instituteId:b.instituteId,status:{not:'DELETED'}},batchId:{not:b.id}}]},include:{batch:{select:{name:true}},_count:{select:{lessons:true}}}});
  if(kind==='tests')return db.test.findMany({where:{instituteId:b.instituteId,status:'ACTIVE',OR:[{batchId:null},{batchId:{not:b.id}}]},select:{id:true,title:true,testType:true,testStatus:true}});
  return fail('Unknown picker',404);
 });
 app.post('/api/v1/batches/:id/assign/:kind',write,async request=>{
  const b=await access(request,true);const {kind}=request.params as any;const parsed=idsSchema.safeParse(request.body);if(!parsed.success)return fail('Select 1–100 records');const ids=parsed.data.ids;
  await db.$transaction(async tx=>{
   if(kind==='teachers'){
    const valid=await tx.user.count({where:{id:{in:ids},instituteId:b.instituteId,status:'ACTIVE',role:{code:'TEACHER'}}});if(valid!==ids.length)return fail('Select active teachers from this institute');
    await tx.batchFaculty.createMany({data:ids.map(userId=>({batchId:b.id,userId,subjectIds:[]})),skipDuplicates:true});
   }else if(kind==='students'){
    const result=await tx.studentProfile.updateMany({where:{userId:{in:ids},batchId:null,user:{instituteId:b.instituteId,status:'ACTIVE',role:{code:'STUDENT'}}},data:{batchId:b.id}});if(result.count!==ids.length)return fail('One or more students are already enrolled or unavailable',409);
   }else if(kind==='subjects'){
    const sources=await tx.subject.findMany({where:{id:{in:ids},status:'ACTIVE',OR:[{batchId:null,instituteId:b.instituteId},{batch:{instituteId:b.instituteId,status:{not:'DELETED'}},batchId:{not:b.id}}]},include:{lessons:{where:{status:{not:'DELETED'}},include:{videos:{where:{status:{not:'DELETED'}}},notes:{where:{status:{not:'DELETED'}}},resources:true}}}});if(sources.length!==ids.length)return fail('Subject unavailable');
    for(const source of sources){
     if(await tx.subject.findFirst({where:{batchId:b.id,copiedFromId:source.id,status:{not:'DELETED'}}}))return fail('This subject is already copied to the batch',409);
     const subject=await tx.subject.create({data:{batchId:b.id,instituteId:b.instituteId,code:source.code,description:source.description,name:source.name,iconUrl:source.iconUrl,copiedFromId:source.id,sortOrder:source.sortOrder}});
     const lessonMap=new Map<string,string>();
     for(const l of source.lessons){
      const lesson=await tx.lesson.create({data:{subjectId:subject.id,name:l.name,description:l.description,sortOrder:l.sortOrder,copiedFromId:l.id,status:l.status}});lessonMap.set(l.id,lesson.id);
      for(const {id,lessonId,createdAt,updatedAt,viewCount,...v} of l.videos)await tx.video.create({data:{...v,lessonId:lesson.id}});
      for(const {id,lessonId,createdAt,...n} of l.notes)await tx.note.create({data:{...n,lessonId:lesson.id}});
      const resourceMap=new Map<string,string>();
      for(const r of l.resources){const {id,parentId,lessonId,createdAt,...rest}=r;const nr=await tx.resourceNode.create({data:{...rest,lessonId:lesson.id}});resourceMap.set(id,nr.id);}
      for(const r of l.resources)if(r.parentId&&resourceMap.has(r.parentId))await tx.resourceNode.update({where:{id:resourceMap.get(r.id)!},data:{parentId:resourceMap.get(r.parentId)}});
     }
     const tests=await tx.test.findMany({where:{subjectId:source.id,status:{not:'DELETED'}},include:testInclude});
     for(const t of tests)await copyTest(tx,t,b.id,subject.id,t.lessonId?lessonMap.get(t.lessonId)||null:null);
    }
   }else if(kind==='tests'){
    const tests=await tx.test.findMany({where:{id:{in:ids},instituteId:b.instituteId,status:'ACTIVE'},include:testInclude});if(tests.length!==ids.length)return fail('Test unavailable');
    for(const t of tests)await copyTest(tx,t,b.id);
   }else return fail('Unknown assignment');
  },{timeout:60000});return {success:true};
 });
 app.put('/api/v1/batches/:id/faculty/:userId',write,async request=>{
  const b=await access(request,true);const {userId}=request.params as any;const p=z.object({subjectIds:z.array(z.string()).max(100)}).safeParse(request.body);if(!p.success)return fail('Invalid subjects');
  if(await db.subject.count({where:{id:{in:p.data.subjectIds},batchId:b.id,status:'ACTIVE'}})!==new Set(p.data.subjectIds).size)return fail('Select subjects in this batch');
  if(!await db.batchFaculty.findUnique({where:{batchId_userId:{batchId:b.id,userId}}}))return fail('Teacher not assigned',404);
  return db.batchFaculty.update({where:{batchId_userId:{batchId:b.id,userId}},data:p.data});
 });
 app.delete('/api/v1/batches/:id/assign/:kind/:recordId',write,async request=>{
  const b=await access(request,true);const {kind,recordId}=request.params as any;
  if(kind==='teachers'){
   if(await db.batchClass.count({where:{batchId:b.id,teacherId:recordId,status:{in:['Created','Upcoming','Live']}}}))return fail('Reassign or cancel this teacher’s scheduled classes first',409);
   await db.batchFaculty.deleteMany({where:{batchId:b.id,userId:recordId}});
  }else if(kind==='students')await db.studentProfile.updateMany({where:{batchId:b.id,userId:recordId},data:{batchId:null}});
  else return fail('Unknown assignment');return {success:true};
 });
 app.put('/api/v1/batches/:id/subjects/:subjectId',write,async request=>{
  const b=await access(request,true);const {subjectId}=request.params as any;const p=z.object({name:z.string().trim().min(1).max(100).optional(),status:z.enum(['ACTIVE','HIDDEN','DELETED']).optional()}).safeParse(request.body);if(!p.success)return fail('Invalid subject');
  const result=await db.subject.updateMany({where:{id:subjectId,batchId:b.id,status:{not:'DELETED'}},data:p.data});if(!result.count)return fail('Subject not found',404);return {success:true};
 });
 app.post('/api/v1/batches/:id/timetable',write,async request=>{
  const b=await access(request,true);const p=z.object({rows:z.array(classSchema).min(1).max(100),publish:z.boolean().optional()}).safeParse(request.body);if(!p.success)return fail('Check class dates, times and required fields');
  const rows=p.data.rows.map(r=>({...r,status:p.data.publish&&r.status==='Created'?'Upcoming':r.status}));
  const ids=rows.flatMap(r=>r.id?[r.id]:[]);if(new Set(ids).size!==ids.length)return fail('Duplicate class rows');
  await db.$transaction(async tx=>{
   // Serialize schedule writes per institute to prevent concurrent clash checks racing.
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${b.instituteId}))`;
   if(await tx.batchClass.count({where:{id:{in:ids},batchId:b.id}})!==ids.length)return fail('Class not found',404);
   for(const r of rows){
    if(!await tx.subject.findFirst({where:{id:r.subjectId,batchId:b.id,status:'ACTIVE'}}))return fail('Select an active subject in this batch');
    if(!await tx.batchFaculty.findFirst({where:{batchId:b.id,userId:r.teacherId,user:{status:'ACTIVE'}}}))return fail('Assign an active teacher to this batch first');
    if(r.status!=='Cancelled'){
     const clash=await tx.batchClass.findFirst({where:{id:{notIn:ids},date:r.date,status:{not:'Cancelled'},OR:[{batchId:b.id},{teacherId:r.teacherId}],startTime:{lt:r.endTime},endTime:{gt:r.startTime}}});
     if(clash||rows.some(o=>o!==r&&o.status!=='Cancelled'&&o.date===r.date&&o.startTime<r.endTime&&r.startTime<o.endTime))return fail('Timetable clash: batch or teacher already has a class at this time',409);
    }
   }
   for(const {id,...row} of rows){const data={...row,batchId:b.id,changedBy:request.user!.userId};if(id)await tx.batchClass.update({where:{id},data});else await tx.batchClass.create({data});}
  });return {success:true};
 });
 app.delete('/api/v1/batches/:id/timetable/:classId',write,async request=>{
  const b=await access(request,true);const {classId}=request.params as any;
  const result=await db.batchClass.deleteMany({where:{id:classId,batchId:b.id,status:'Created'}});if(!result.count)return fail('Only draft classes can be removed; cancel published classes instead',409);return {success:true};
 });
 app.put('/api/v1/batches/:id/timetable/:classId/attendance',write,async request=>{
  const b=await access(request,true);const {classId}=request.params as any;const p=z.object({rows:z.array(z.object({userId:z.string(),status:z.enum(['Present','Absent','Late'])})).max(2000)}).safeParse(request.body);if(!p.success)return fail('Invalid attendance');
  if(!await db.batchClass.findFirst({where:{id:classId,batchId:b.id,status:{in:['Live','Completed']}}}))return fail('Attendance is available for live or completed classes');
  const ids=[...new Set(p.data.rows.map(r=>r.userId))];if(await db.studentProfile.count({where:{batchId:b.id,userId:{in:ids},user:{status:{not:'DELETED'}}}})!==ids.length)return fail('Student not enrolled');
  await db.$transaction(p.data.rows.map(r=>db.classAttendance.upsert({where:{classId_userId:{classId,userId:r.userId}},create:{...r,classId,markedBy:request.user!.userId},update:{status:r.status,markedBy:request.user!.userId}})));return {success:true};
 });
 app.get('/api/v1/batches/:id/reports',read,async request=>{
  const b=await access(request);if(request.user!.roleCode==='STUDENT')return fail('Reports are restricted to staff',403);
  const attempts=await db.testAttempt.findMany({
   where:{test:{batchId:b.id,status:{not:'DELETED'}},submittedAt:{not:null},result:{isNot:null}},
   include:{result:true,student:{select:{id:true,fullName:true}},test:{select:{title:true}},
    answers:{select:{awardedMarks:true,question:{select:{id:true,sortOrder:true,marksPositive:true,section:{select:{name:true}}}}}}
   }
  });
  const bins=[0,0,0,0,0,0,0];const qs=new Map<string,any>();
  for(const a of attempts){const p=a.result!.percentage;bins[p<20?0:p<30?1:p<40?2:p<50?3:p<60?4:p<70?5:6]++;for(const x of a.answers){const q=qs.get(x.question.id)||{id:x.question.id,name:`Q${x.question.sortOrder+1} · ${x.question.section.name}`,correct:0,total:0};q.total++;if((x.awardedMarks??0)>=x.question.marksPositive)q.correct++;qs.set(q.id,q);}}
  const ranked=[...attempts].sort((a,b)=>b.result!.percentage-a.result!.percentage);const seen=new Set<string>();
  return {attempts:attempts.length,average:attempts.length?attempts.reduce((s,a)=>s+a.result!.percentage,0)/attempts.length:null,bins,toughest:[...qs.values()].map(q=>({...q,percentage:Math.round(q.correct/q.total*100)})).sort((a,b)=>a.percentage-b.percentage).slice(0,3),top:ranked.filter(a=>{if(seen.has(a.studentId))return false;seen.add(a.studentId);return true;}).slice(0,3).map(a=>({id:a.studentId,name:a.student.fullName,percentage:a.result!.percentage,test:a.test.title}))};
 });
 app.post('/api/v1/batches/:id/workspace/export',read,async(request,reply)=>{
  await access(request);const p=z.object({kind:z.enum(['subjects','teachers','students','tests','classes']),format:z.enum(['xlsx','pdf']),ids:z.array(z.string()).max(5000).optional()}).safeParse(request.body);if(!p.success)return fail('Invalid export');
  const {id}=request.params as any;const res=await app.inject({method:'GET',url:`/api/v1/batches/${id}/workspace`,headers:{authorization:request.headers.authorization!}});if(res.statusCode!==200)return reply.code(res.statusCode).send(res.json());const data=res.json();
  const rows=data[p.data.kind].filter((r:any)=>!p.data.ids||p.data.ids.includes(r.id));
  const headings=p.data.kind==='classes'?['Subject','Topic','Date','Start','End','Teacher','Status']:['Name','Status','Phone / Type'];
  const values=rows.map((r:any)=>p.data.kind==='classes'?[r.subject.name,r.topic,r.date,r.startTime,r.endTime,r.teacher.fullName,r.status]:[r.name||r.fullName||r.title,r.status,r.phone||r.testType||'']);
  reply.header('Content-Disposition',`attachment; filename="Examly-${p.data.kind}.${p.data.format}"`).header('Cache-Control','no-store');
  if(p.data.format==='xlsx'){const book=new ExcelJS.Workbook();const sheet=book.addWorksheet(p.data.kind);sheet.addRow(headings);sheet.addRows(values);sheet.columns.forEach(c=>c.width=28);sheet.getRow(1).font={bold:true};return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(Buffer.from(await book.xlsx.writeBuffer()));}
  const printer=new PdfPrinter({Helvetica:{normal:'Helvetica',bold:'Helvetica-Bold',italics:'Helvetica-Oblique',bolditalics:'Helvetica-BoldOblique'}});const doc=printer.createPdfKitDocument({pageOrientation:'landscape',defaultStyle:{font:'Helvetica',fontSize:10},content:[{text:`${data.batch.name} | ${p.data.kind}`,fontSize:20,margin:[0,0,0,16]},{table:{body:[headings,...values]},layout:'lightHorizontalLines'}]});const bytes=await new Promise<Buffer>((resolve,reject)=>{const chunks:Buffer[]=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);doc.end();});return reply.type('application/pdf').send(bytes);
 });
};

