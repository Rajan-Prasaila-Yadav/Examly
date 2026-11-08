const assert=require('node:assert/strict'),fs=require('node:fs');
require('dotenv').config({path:'apps/api/.env'});
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
const batches=[],users=[];const stamp=Date.now();let token;
async function call(method,path,body,auth=token){const r=await fetch('http://localhost:4000/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function ok(method,path,body){const r=await call(method,path,body);assert.ok(r.status<300,`${method} ${path}: ${r.status} ${JSON.stringify(r.data)}`);return r.data;}
(async()=>{try{
 const password=fs.readFileSync('database/prisma/seed.ts','utf8').match(/bcrypt.hash\('([^']+)', 10\)/)[1];
 const login=await call('POST','/auth/login',{identifier:'rajanprasaila@gmail.com',password});assert.equal(login.status,200);token=login.data.accessToken;
 const instituteId=(await ok('GET','/batches/options')).institutes[0].id;
 for(let i=0;i<2;i++){const b=await ok('POST','/batches',{instituteId,name:'Disposable workspace '+i,code:`WS-${stamp}-${i}`});batches.push(b.id);}
 const [sourceId,batchId]=batches,base=`/batches/${batchId}`;
 const roles=await db.role.findMany({where:{code:{in:['TEACHER','STUDENT']}}});
 for(const code of ['TEACHER','STUDENT']){const u=await db.user.create({data:{identifier:`WS-${stamp}-${code}`,fullName:'Disposable '+code,instituteId,roleId:roles.find(r=>r.code===code).id,...(code==='STUDENT'?{studentProfile:{create:{rollNumber:`WS-${stamp}`}}}:{teacherProfile:{create:{facultyCode:`WS-${stamp}`,designation:'Verification',specialization:[],assignedBatchIds:[]}}})}});users.push(u.id);}
 const [teacherId,studentId]=users;
 assert.equal((await ok('GET',base+'/workspace')).teachers.length,0,'No institute-wide teacher fallback');
 await ok('POST',base+'/assign/teachers',{ids:[teacherId]});await ok('POST',base+'/assign/students',{ids:[studentId]});
 assert.equal((await call('POST',`/batches/${sourceId}/assign/students`,{ids:[studentId]})).status,409,'Do not silently transfer students');
 const source=await db.subject.create({data:{batchId:sourceId,name:'Disposable Physics',lessons:{create:{name:'Motion',videos:{create:{title:'Video',videoUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}},notes:{create:{title:'Notes',fileUrl:'https://example.com/verification.pdf'}}}}},include:{lessons:true}});
 await ok('POST',base+'/assign/subjects',{ids:[source.id]});let workspace=await ok('GET',base+'/workspace');const subject=workspace.subjects[0];assert.notEqual(subject.id,source.id);assert.equal(subject.lessons[0].videos.length,1);assert.equal(subject.lessons[0].notes.length,1);
 await ok('PUT',base+`/subjects/${subject.id}`,{name:'Batch-only name'});assert.equal((await db.subject.findUnique({where:{id:source.id}})).name,'Disposable Physics');
 await ok('PUT',base+`/faculty/${teacherId}`,{subjectIds:[subject.id]});
 assert.equal((await call('PUT',base+`/faculty/${teacherId}`,{subjectIds:[source.id]})).status,400);
 const row={subjectId:subject.id,teacherId,topic:'Motion',date:'2035-01-10',startTime:'08:00',endTime:'09:00',status:'Created'};
 await ok('POST',base+'/timetable',{rows:[row]});workspace=await ok('GET',base+'/workspace');const cls=workspace.classes[0];assert.equal(cls.status,'Created');
 assert.equal((await call('POST',base+'/timetable',{rows:[{...row,startTime:'08:30',endTime:'09:30'}]})).status,409,'Reject overlaps');
 assert.equal((await call('POST',base+'/timetable',{rows:[{...row,date:'2035-02-31'}]})).status,400,'Reject invalid dates');
 await ok('POST',base+'/timetable',{rows:[{...row,id:cls.id}],publish:true});assert.equal((await db.batchClass.findUnique({where:{id:cls.id}})).status,'Upcoming');
 await ok('POST',base+'/timetable',{rows:[{...row,id:cls.id,status:'Completed'}]});
 await ok('PUT',base+`/timetable/${cls.id}/attendance`,{rows:[{userId:studentId,status:'Present'}]});assert.equal((await db.classAttendance.findUnique({where:{classId_userId:{classId:cls.id,userId:studentId}}})).status,'Present');
 assert.equal((await call('PUT',base+`/timetable/${cls.id}/attendance`,{rows:[{userId:teacherId,status:'Present'}]})).status,400);
 assert.equal((await call('DELETE',base+`/timetable/${cls.id}`,{})).status,409,'Published class retained');
 const test=await db.test.create({data:{instituteId,batchId:sourceId,title:'Disposable test',startDateTime:new Date(),endDateTime:new Date(Date.now()+3600000),durationMinutes:30,totalMarks:4,passMarks:2,sections:{create:{name:'Physics',questions:{create:{contentHtml:'Verification question',options:{create:{optionLabel:'A',contentHtml:'Answer',isCorrect:true}}}}}}}});
 await ok('POST',base+'/assign/tests',{ids:[test.id]});workspace=await ok('GET',base+'/workspace');assert.equal(workspace.tests.length,1);assert.equal(workspace.tests[0].isPublished,false);assert.equal((await db.question.count({where:{section:{testId:workspace.tests[0].id}}})),1);
 const reports=await ok('GET',base+'/reports');assert.equal(reports.attempts,0);assert.deepEqual(reports.bins,[0,0,0,0,0,0,0]);
 const foreign=await call('GET','/batches/nonexistent/workspace');assert.equal(foreign.status,404);
 assert.equal((await call('GET',base+'/workspace',undefined,null)).status,401);
 for(const format of ['xlsx','pdf']){const r=await fetch('http://localhost:4000/api/v1'+base+'/workspace/export',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({kind:'classes',format})});assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>100);}
 await ok('DELETE',base+`/assign/students/${studentId}`,{});assert.equal((await db.studentProfile.findUnique({where:{userId:studentId}})).batchId,null);
 console.log('PASS: assignments, enrollment guard, independent curriculum copies, faculty subjects, class persistence, clash/date validation, publish, attendance, reports, test copying, exports, authentication.');
}finally{
 await db.classAttendance.deleteMany({where:{class:{batchId:{in:batches}}}});await db.batchClass.deleteMany({where:{batchId:{in:batches}}});
 await db.test.deleteMany({where:{batchId:{in:batches}}});await db.user.deleteMany({where:{id:{in:users}}});await db.batch.deleteMany({where:{id:{in:batches}}});await db.$disconnect();console.log('Removed disposable workspace verification records.');
}})().catch(e=>{console.error(e);process.exitCode=1;});
