const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
process.env.TS_NODE_PROJECT=require('node:path').join(__dirname,'../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify=require('fastify');
const {authRoutes}=require('../apps/api/src/fastify/routes/auth.routes.ts');
const {sendPasswordRecovery}=require('../apps/api/src/fastify/routes/password-recovery.ts');
const user={id:'fixture-user',email:'fixture@example.invalid',status:'ACTIVE'};
const config={apiKey:'isolated-test-key',from:'Examly <test@example.invalid>',origin:'https://example.invalid'};

test('recovery sends an expiring hashed link without using Redis and awaits provider',async()=>{
 const old=global.fetch;let record,mail,completed=false;
 const app={prisma:{passwordResetToken:{create:async({data})=>(record={id:'reset-1',...data}),updateMany:async()=>assert.fail('unexpected invalidation')}},log:{info(){},error(){}}};
 global.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');mail=JSON.parse(options.body);assert.equal(options.headers['Idempotency-Key'],'password-reset/reset-1');completed=true;return {ok:true,json:async()=>({id:'mail-1'})};};
 try{
  assert.equal(await sendPasswordRecovery(app,user,config,'127.0.0.1'),'mail-1');
  assert.equal(completed,true);assert.deepEqual(mail.to,[user.email]);
  const link=new URL(mail.text.match(/https:\/\/\S+/)[0]);
  assert.equal(link.origin,config.origin);assert.equal(link.pathname,'/forgot-password');
  const raw=link.searchParams.get('token');assert.equal(raw.length,64);
  assert.equal(record.tokenHash,crypto.createHash('sha256').update(raw).digest('hex'));
  assert.equal(JSON.stringify(record).includes(raw),false);
  assert.ok(record.expiresAt-Date.now()>3500000);
 }finally{global.fetch=old;}
});

test('provider rejection invalidates only the new link and does not log reset secrets',async()=>{
 const old=global.fetch;let invalidated;const logs=[];
 global.fetch=async()=>({ok:false,status:403,json:async()=>({name:'validation_error',message:'private provider detail'})});
 try{
  const app={prisma:{passwordResetToken:{create:async()=>({id:'new-link'}),updateMany:async x=>{invalidated=x;return {count:1};}}},log:{info:x=>logs.push(x),error:x=>logs.push(x)}};
  await assert.rejects(sendPasswordRecovery(app,user,config,'127.0.0.1'));
  assert.deepEqual(invalidated.where,{id:'new-link',isConsumed:false});
  assert.equal(JSON.stringify(logs).includes('private provider detail'),false);
 }finally{global.fetch=old;}
});

test('recovery accepts valid requests with Redis unavailable and normalizes email',async()=>{
 const previous={...process.env};const oldFetch=global.fetch;
 process.env.RESEND_API_KEY=config.apiKey;process.env.MAIL_FROM_ADDRESS=config.from;process.env.FRONTEND_URL=config.origin;
 let lookedUp;const app=Fastify();app.decorate('authenticate',async()=>{});app.decorate('backgroundJobsAvailable',false);
 app.decorate('prisma',{user:{findFirst:async({where})=>{lookedUp=where.email;return null;}}});
 global.fetch=async()=>assert.fail('No mail for missing user');
 try{await app.register(authRoutes);const r=await app.inject({method:'POST',url:'/api/v1/auth/forgot-password',payload:{email:'  Nobody@Example.invalid  '}});assert.equal(r.statusCode,200);assert.equal(lookedUp,'nobody@example.invalid');}
 finally{await app.close();global.fetch=oldFetch;for(const k of ['RESEND_API_KEY','MAIL_FROM_ADDRESS','FRONTEND_URL'])if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
});

async function resetApp({consumed=false,expired=false,claimCount=1}={}){
 const raw='a'.repeat(64);const record={id:'r1',userId:user.id,user,isConsumed:consumed,expiresAt:new Date(Date.now()+(expired?-1000:3600000))};
 let changed=false,revoked=false,otherLinks=false,transactions=0,passwordHash;
 const app=Fastify();app.decorate('authenticate',async()=>{});
 app.decorate('prisma',{passwordResetToken:{findUnique:async({where})=>{assert.equal(where.tokenHash,crypto.createHash('sha256').update(raw).digest('hex'));return record;}},$transaction:async fn=>{
 transactions++;try{await fn({user:{updateMany:async({data})=>{passwordHash=data.passwordHash;changed=true;return {count:1};}},passwordResetToken:{updateMany:async({where})=>{if(where.id){assert.equal(where.isConsumed,false);assert.ok(where.expiresAt.gt instanceof Date);return {count:claimCount};}otherLinks=true;return {count:1};}},userSession:{updateMany:async()=>{revoked=true;return {count:1};}}});}catch(e){changed=false;throw e;}
 }});await app.register(authRoutes);return {app,raw,state:()=>({changed,revoked,otherLinks,transactions,passwordHash})};
}
test('valid reset changes password, invalidates other links and revokes sessions',async()=>{
 const s=await resetApp();try{const r=await s.app.inject({method:'POST',url:'/api/v1/auth/reset-password',payload:{token:s.raw,newPassword:'fixture-only-password'}});assert.equal(r.statusCode,200);assert.equal(s.state().revoked,true);assert.equal(s.state().otherLinks,true);assert.equal(await bcrypt.compare('fixture-only-password',s.state().passwordHash),true);}finally{await s.app.close();}
});
test('used or expired reset links cannot change passwords',async()=>{
 for(const opts of [{consumed:true},{expired:true}]){const s=await resetApp(opts);try{const r=await s.app.inject({method:'POST',url:'/api/v1/auth/reset-password',payload:{token:s.raw,newPassword:'fixture-only-password'}});assert.equal(r.statusCode,400);assert.equal(s.state().transactions,0);}finally{await s.app.close();}}
});
test('a concurrent reset losing the single-use claim rolls back password change',async()=>{
 const s=await resetApp({claimCount:0});try{const r=await s.app.inject({method:'POST',url:'/api/v1/auth/reset-password',payload:{token:s.raw,newPassword:'fixture-only-password'}});assert.equal(r.statusCode,400);assert.equal(s.state().changed,false);assert.equal(s.state().revoked,false);}finally{await s.app.close();}
});

test('Gmail provider uses TLS and the configured app password, not Redis',async()=>{
 const nodemailer=require('nodemailer');const old=nodemailer.createTransport;let options,closed=false;
 nodemailer.createTransport=opts=>{options=opts;return {sendMail:async mail=>{assert.deepEqual(mail.to,[user.email]);return {accepted:[user.email],rejected:[],messageId:'smtp-fixture'};},close:()=>{closed=true;}};};
 try{
  const app={prisma:{passwordResetToken:{create:async()=>({id:'smtp-link'}),updateMany:async()=>assert.fail('Unexpected invalidation')}},log:{info(){},error(){}}};
  const result=await sendPasswordRecovery(app,user,{...config,gmail:{user:'sender@gmail.com',pass:'fixture-app-pass'}},'127.0.0.1');
  assert.equal(result,'smtp-fixture');assert.equal(options.secure,true);assert.equal(options.port,465);assert.equal(options.host,'smtp.gmail.com');assert.equal(closed,true);
 }finally{nodemailer.createTransport=old;}
});

test('production configuration rejects sandbox sender and validates Gmail settings',()=>{
 const {recoveryConfiguration}=require('../apps/api/src/fastify/routes/password-recovery.ts');
 const keys=['NODE_ENV','FRONTEND_URL','MAIL_PROVIDER','GMAIL_USER','GMAIL_APP_PASSWORD','RESEND_API_KEY','MAIL_FROM_ADDRESS'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.NODE_ENV='production';process.env.FRONTEND_URL='https://example.invalid';process.env.MAIL_PROVIDER='resend';process.env.RESEND_API_KEY='fixture';process.env.MAIL_FROM_ADDRESS='Examly <onboarding@resend.dev>';
  assert.equal(recoveryConfiguration(),null);
  process.env.MAIL_PROVIDER='gmail';process.env.GMAIL_USER='sender@gmail.com';process.env.GMAIL_APP_PASSWORD='abcd efgh ijkl mnop';
  assert.equal(recoveryConfiguration().gmail.pass,'abcdefghijklmnop');
  assert.equal(recoveryConfiguration().from,'Examly <sender@gmail.com>');
  delete process.env.GMAIL_APP_PASSWORD;assert.equal(recoveryConfiguration(),null);
 }finally{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});
