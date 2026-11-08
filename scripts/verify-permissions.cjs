const assert=require('node:assert/strict'),fs=require('node:fs');require('dotenv').config({path:'apps/api/.env'});const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();const base='http://localhost:4000/api/v1';let root;const users=[],roles=[],institutes=[];const stamp=Date.now();
async function call(method,path,body,token=root){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function ok(method,path,body,token=root){const r=await call(method,path,body,token);assert.ok(r.status<300,`${path}: ${r.status} ${JSON.stringify(r.data)}`);return r.data;}
(async()=>{try{
const password=fs.readFileSync('database/prisma/seed.ts','utf8').match(/bcrypt.hash\('([^']+)', 10\)/)[1];root=(await ok('POST','/auth/login',{identifier:'rajanprasaila@gmail.com',password},null)).accessToken;
const hash=await require('bcrypt').hash(password,10);
for(let i=0;i<2;i++){const inst=await db.institute.create({data:{name:'Disposable permissions QA',slug:`permissions-${stamp}-${i}`}});institutes.push(inst.id);}
for(const [i,code] of [[0,'TEACHER'],[0,'ADMIN'],[1,'TEACHER']]){const role=await db.role.create({data:{name:`QA ${code}`,code,instituteId:institutes[i]}});roles.push(role.id);const u=await db.user.create({data:{identifier:`PERM-${stamp}-${roles.length}`,fullName:'Disposable permissions user',instituteId:institutes[i],roleId:role.id,passwordHash:hash}});users.push(u);}
const matrix=await ok('GET',"/users/roles?instituteId="+institutes[0]);assert.ok(matrix.roles.length);assert.ok(matrix.catalog.subjects.actions.includes('read'));
const teacher=(await ok('POST','/auth/login',{identifier:users[0].identifier,password})).accessToken;const admin=(await ok('POST','/auth/login',{identifier:users[1].identifier,password})).accessToken;
assert.equal((await call('GET','/content/subjects',undefined,teacher)).status,200);
let saved=await ok('PUT',`/users/roles/${roles[0]}/matrix`,{instituteId:institutes[0],version:0,permissions:[]});assert.equal(saved.version,1);
assert.equal((await call('GET','/content/subjects',undefined,teacher)).status,403,'Empty policy denies on existing token');
assert.equal((await call('PUT',`/users/roles/${roles[0]}/matrix`,{instituteId:institutes[0],version:0,permissions:[]})).status,409);
saved=await ok('PUT',`/users/roles/${roles[0]}/matrix`,{instituteId:institutes[0],version:1,permissions:[{resource:'subjects',action:'read'}]});assert.equal((await call('GET','/content/subjects',undefined,teacher)).status,200);
await ok('PUT',`/users/${users[0].id}/permission-overrides`,{overrides:[{resource:'subjects',action:'read',effect:'DENY'}]});assert.equal((await call('GET','/content/subjects',undefined,teacher)).status,403);
await ok('PUT',`/users/${users[0].id}/permission-overrides`,{overrides:[]});assert.equal((await call('GET','/content/subjects',undefined,teacher)).status,200);
assert.equal((await call('GET',`/users/roles?instituteId=${institutes[1]}`,undefined,admin)).status,403);
assert.equal((await call('PUT',`/users/roles/${roles[2]}/matrix`,{instituteId:institutes[1],version:0,permissions:[]},admin)).status,403);
assert.equal((await call('PUT',`/users/roles/${roles[1]}/matrix`,{instituteId:institutes[0],version:0,permissions:[]},admin)).status,403);
assert.equal((await call('PUT',`/users/roles/${roles[0]}/matrix`,{instituteId:institutes[0],version:2,permissions:[{resource:'fake',action:'read'}]})).status,400);
const row=await db.role.findUnique({where:{id:roles[0]},include:{permissions:true}});assert.equal(row.permissionsConfigured,true);assert.equal(row.permissions.length,1);
assert.ok(await db.auditLog.count({where:{resourceId:roles[0],action:'ROLE_MATRIX_UPDATED'}}));
console.log('PASS: saved policies, immediate revoke/restore with same token, empty-policy deny, DENY overrides, stale-version conflict, institute isolation, protected admin, invalid permission rejection, audit persistence.');
}finally{await db.auditLog.deleteMany({where:{OR:[{resourceId:{in:[...roles,...users.map(u=>u.id)]}},{instituteId:{in:institutes}}]}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.role.deleteMany({where:{id:{in:roles}}});await db.institute.deleteMany({where:{id:{in:institutes}}});await db.$disconnect();console.log('Disposable verification records removed.');}})().catch(e=>{console.error(e);process.exitCode=1;});

