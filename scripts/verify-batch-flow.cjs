// Explicit integration check. Creates one disposable batch and removes only that record.
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('dotenv').config({path: 'apps/api/.env'});
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
const base = process.env.EXAMLY_TEST_API || 'http://localhost:4000/api/v1';
const created = [];
async function call(method, path, body, token) {
  const response = await fetch(base + path, {method, headers: {'Content-Type':'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, body: body ? JSON.stringify(body) : undefined});
  return {status: response.status, data: await response.json()};
}
(async () => {
  try {
    const password = process.env.EXAMLY_TEST_PASSWORD || fs.readFileSync('database/prisma/seed.ts','utf8').match(/bcrypt.hash\('([^']+)', 10\)/)[1];
    const login = await call('POST','/auth/login',{identifier: process.env.EXAMLY_TEST_USER || 'rajanprasaila@gmail.com',password});
    assert.equal(login.status,200,'Super Admin login');
    const token = login.data.accessToken;
    assert.equal((await call('GET','/batches')).status,401);
    const options = await call('GET','/batches/options',null,token);
    assert.equal(options.status,200); assert.equal(options.data.permissions.create,true);
    const instituteId = options.data.institutes[0].id;
    const code = `QA-${Date.now()}`;
    const payload = {name:'Disposable batch verification',code,instituteId,priceNpr:1234,startDate:'2026-11-01T00:00:00.000Z',endDate:'2026-12-01T00:00:00.000Z'};
    assert.equal((await call('POST','/batches',{...payload,priceNpr:-1},token)).status,400);
    assert.equal((await call('POST','/batches',{...payload,priceNpr:1.5},token)).status,400);
    assert.equal((await call('POST','/batches',{...payload,endDate:'2026-01-01'},token)).status,400);
    const result = await call('POST','/batches',payload,token);
    assert.equal(result.status,201,JSON.stringify(result.data)); created.push(result.data.id);
    const id = result.data.id;
    assert.equal(result.data.priceNpr,1234);
    assert.equal((await db.batch.findUnique({where:{id}})).priceNpr,1234);
    assert.equal((await call('POST','/batches',{...payload,code:code.toLowerCase()},token)).status,409);
    const updated = await call('PUT',`/batches/${id}`,{name:'Disposable updated batch',priceNpr:4321,startDate:null,endDate:null},token);
    assert.equal(updated.status,200); assert.equal(updated.data.priceNpr,4321); assert.equal(updated.data.startDate,null);
    const reloaded = await call('GET',`/batches/${id}`,null,token);
    assert.equal(reloaded.data.name,'Disposable updated batch'); assert.equal(reloaded.data.priceNpr,4321); assert.equal(reloaded.data.endDate,null);
    const listed = await call('GET',`/batches?search=${code}&instituteId=${instituteId}`,null,token);
    assert.equal(listed.data.length,1); assert.equal(listed.data[0].priceNpr,4321);
    assert.equal((await call('GET',`/batches?search=${code}&status=HIDDEN`,null,token)).data.length,0);
    assert.equal((await call('PUT',`/batches/${id}`,{instituteId:'unrelated-institute'},token)).status,400);
    const admin = await call('POST','/auth/login',{identifier:'ADM-001',password});
    assert.equal(admin.status,200,'Institute Admin login');
    assert.equal((await call('POST','/batches',{...payload,instituteId:'unrelated-institute'},admin.data.accessToken)).status,400);
    // Legacy detail form still sends priceNpr; old clients using price remain supported.
    assert.equal((await call('PUT',`/batches/${id}`,{price:0},token)).data.priceNpr,0);
    for (const format of ['xlsx','pdf']) {
      const response = await fetch(base+'/batches/export',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({format,ids:[id]})});
      assert.equal(response.status,200,'Export '+format);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(format==='pdf') assert.equal(bytes.subarray(0,4).toString(),'%PDF');
      else {const ExcelJS=require('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);assert.equal(book.worksheets[0].getCell('A2').value,'Disposable updated batch');}
    }
    assert.equal((await call('PUT',`/batches/${id}`,{status:'HIDDEN'},token)).data.status,'HIDDEN');
    assert.equal((await call('GET',`/batches?search=${code}&status=HIDDEN`,null,token)).data.length,1);
    assert.equal((await call('PUT',`/batches/${id}`,{status:'ACTIVE'},token)).data.status,'ACTIVE');
    assert.equal((await call('DELETE',`/batches/${id}`,{},token)).status,200);
    assert.equal((await call('GET',`/batches/${id}`,null,token)).status,404);
    assert.equal((await db.batch.findUnique({where:{id}})).status,'DELETED');
    console.log('PASS: XLSX workbook contents, PDF signature, hide/show persistence and soft deletion.');
    console.log('PASS: auth, scoped options, create, persisted fee, edit, cleared dates, reload, search, filters, duplicate code, validation and institute guards.');
  } finally {
    for (const id of created) await db.batch.delete({where:{id}});
    await db.$disconnect();
    console.log(`Removed ${created.length} disposable verification batch(es).`);
  }
})().catch(e=>{ console.error(e.message);process.exitCode=1; });
