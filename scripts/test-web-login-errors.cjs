const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function setup(refreshToken){
 const handlers={},stored=new Map(refreshToken?[['examly_refresh_token',refreshToken],['examly_access_token','old-access']]:[]);
 let refreshCalls=0,retries=0;
 const instance=async()=>{retries++;return {status:200};};
 instance.interceptors={request:{use:fn=>handlers.request=fn},response:{use:(ok,fail)=>handlers.fail=fail}};
 const axios={create:()=>instance,post:async()=>{refreshCalls++;return {data:{accessToken:'new-access',refreshToken:'new-refresh'}};}};
 const window={location:{href:'/login'},addEventListener(){},dispatchEvent(){}};
 const code=ts.transpileModule(fs.readFileSync('apps/web/src/lib/api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports:{},require:name=>{assert.equal(name,'axios');return axios;},process:{env:{}},window,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},Event:class{},console});
 return {handlers,window,stored,counts:()=>({refreshCalls,retries})};
}
test('credential errors reach form unchanged without refresh or navigation',async()=>{
 for(const token of [null,'stale-refresh']){
  for(const url of ['/auth/login','/auth/google','/auth/register','/auth/reset-password','/auth/forgot-password','/auth/refresh','https://example.test/api/v1/auth/login?source=web']){
   const s=setup(token);s.window.location.href='/login?attempt=1';
   const error={config:{url,headers:{}},response:{status:401,data:{message:'Invalid identifier or password'}}};
   await assert.rejects(s.handlers.fail(error),e=>e===error);
   assert.equal(s.window.location.href,'/login?attempt=1');
   assert.deepEqual(s.counts(),{refreshCalls:0,retries:0});
   assert.equal(s.stored.get('examly_refresh_token'),token||undefined);
  }
 }
});
test('login omits stale bearer token while protected requests retain it',()=>{
 const s=setup('refresh');
 assert.equal(s.handlers.request({url:'/auth/login',headers:{}}).headers.Authorization,undefined);
 assert.equal(s.handlers.request({url:'/auth/me',headers:{}}).headers.Authorization,'Bearer old-access');
});
test('protected requests still renew session and retry after 401',async()=>{
 const s=setup('refresh');
 const result=await s.handlers.fail({config:{url:'/auth/me',headers:{}},response:{status:401}});
 assert.equal(result.status,200);
 assert.deepEqual(s.counts(),{refreshCalls:1,retries:1});
 assert.equal(s.stored.get('examly_access_token'),'new-access');
});
