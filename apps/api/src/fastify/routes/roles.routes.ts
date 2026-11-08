import {FastifyPluginAsync} from 'fastify';
import {z} from 'zod';
import {PERMISSION_CATALOG,ALL_PERMISSIONS,rolePermissions,effectivePermissions,ROLE_DEFAULTS} from '../plugins/permission-catalog';
import {requirePermission} from '../plugins/rbac.plugin';
const fail=(message:string,statusCode=400):never=>{throw Object.assign(new Error(message),{statusCode});};
const permission=z.object({resource:z.string(),action:z.string()}).refine(p=>ALL_PERMISSIONS.includes(`${p.resource}.${p.action}`),'Unknown permission');
export const rolesRoutes:FastifyPluginAsync=async app=>{
 const db=app.prisma;
 const manager=async(req:any)=>{if(!['ADMIN','SUPER_ADMIN'].includes(req.user.roleCode))fail('Only administrators can manage permissions',403);};
 const scope=(req:any,requested?:string)=>{if(req.user.roleCode!=='SUPER_ADMIN'){if(requested&&requested!==req.user.instituteId)fail('Institute not accessible',403);return req.user.instituteId;}return requested||req.user.instituteId||null;};
 const read={preHandler:[app.authenticate,requirePermission('roles','read'),manager]};
 const write={preHandler:[app.authenticate,requirePermission('roles','update'),manager]};
 const audit=(tx:any,req:any,action:string,id:string,instituteId:string|null,details:any)=>tx.auditLog.create({data:{userId:req.user.userId,instituteId,action,resourceType:'RolePermissions',resourceId:id,detailsJson:JSON.stringify(details),ipAddress:req.ip}});
 app.get('/api/v1/auth/permissions',{preHandler:[app.authenticate]},async req=>({userId:req.user!.userId,cacheVersion:req.user!.cacheVersion,roleId:req.user!.roleId,role:req.user!.roleCode,instituteId:req.user!.instituteId,permissions:req.user!.permissions,catalog:PERMISSION_CATALOG}));
 app.get('/api/v1/users/roles',read,async req=>{
  const instituteId=scope(req,(req.query as any).instituteId);
  const [roles,institutes]=await Promise.all([db.role.findMany({where:{OR:[{instituteId:null},...(instituteId?[{instituteId}]:[])]},include:{permissions:true},orderBy:{code:'asc'}}),db.institute.findMany({where:{status:'ACTIVE',...(req.user!.roleCode==='SUPER_ADMIN'?{}:{id:instituteId||'__none__'})},select:{id:true,name:true}})]);
  const codes=['SUPER_ADMIN','ADMIN','TEACHER','STUDENT','EMPLOYEE'];
  const rows=await Promise.all(codes.map(async code=>{const role=roles.find(r=>r.code===code&&r.instituteId===instituteId)||roles.find(r=>r.code===code&&!r.instituteId);if(!role)return null;const allowed=rolePermissions(role);return {id:role.id,name:role.name,code:role.code,instituteId:role.instituteId,scopeInstituteId:instituteId,inherited:!role.instituteId&&!!instituteId,configured:role.permissionsConfigured,version:role.permissionsVersion,editable:code!=='SUPER_ADMIN'&&(req.user!.roleCode==='SUPER_ADMIN'||!['SUPER_ADMIN','ADMIN'].includes(code)),permissions:allowed.includes('*.*')?ALL_PERMISSIONS:allowed,defaults:ROLE_DEFAULTS[code],members:await db.user.count({where:{roleId:role.id,...(instituteId?{instituteId}:{}),status:{not:'DELETED'}}})};}));
  return {roles:rows.filter(Boolean),institutes,instituteId,catalog:PERMISSION_CATALOG};
 });
 const update=async(req:any)=>{
  const p=z.object({permissions:z.array(permission).max(200),instituteId:z.string().nullable().optional(),version:z.number().int().min(0)}).safeParse(req.body);if(!p.success)return fail('Invalid matrix or missing policy version');
  const source=await db.role.findUnique({where:{id:req.params.id},include:{permissions:true}});if(!source)return fail('Role not found',404);
  if(source.code==='SUPER_ADMIN'||(req.user.roleCode!=='SUPER_ADMIN'&&source.code==='ADMIN'))return fail('This role is protected',403);
  const instituteId=scope(req,p.data.instituteId||undefined);
  if(source.instituteId&&source.instituteId!==instituteId)return fail('Role is outside the selected institute',403);
  if(!instituteId)return fail('Select an institute before saving');
  if(!await db.institute.findFirst({where:{id:instituteId,status:'ACTIVE'}}))return fail('Institute unavailable');
  const keys=[...new Set(p.data.permissions.map(p=>`${p.resource}.${p.action}`))];
  if(source.code!=='ADMIN'&&keys.some(k=>['roles.read','roles.update','settings.manage','system.read'].includes(k)))return fail('Administrative permissions are reserved for administrators');
  if(req.user.roleCode!=='SUPER_ADMIN'&&keys.some(k=>!req.user.permissions.includes(k)))return fail('You cannot grant permissions you do not have',403);
  const saved=await db.$transaction(async tx=>{
   let role=source;
   if(source.permissionsVersion!==p.data.version)return fail('This policy changed. Reload before saving.',409);
   if(!source.instituteId){
    const local=await tx.role.findUnique({where:{instituteId_code:{instituteId,code:source.code}}});if(local)return fail('An institute policy was created. Reload before saving.',409);
    role=await tx.role.create({data:{name:source.name,code:source.code,instituteId,description:source.description,permissionsConfigured:true,permissionsVersion:1},include:{permissions:true}});
    await tx.user.updateMany({where:{instituteId,roleId:source.id},data:{roleId:role.id}});
   }else{
    const changed=await tx.role.updateMany({where:{id:source.id,permissionsVersion:p.data.version},data:{permissionsConfigured:true,permissionsVersion:{increment:1}}});if(!changed.count)return fail('This policy changed. Reload before saving.',409);
   }
   await tx.rolePermission.deleteMany({where:{roleId:role.id}});
   if(keys.length)await tx.rolePermission.createMany({data:keys.map(key=>{const [resource,action]=key.split('.');return {roleId:role.id,resource,action,scope:'INSTITUTE' as const};})});
   await audit(tx,req,'ROLE_MATRIX_UPDATED',role.id,instituteId,{before:rolePermissions(source),after:keys,previousRoleId:source.id});
   return {id:role.id,version:role.permissionsVersion+(source.instituteId?1:0),permissions:keys};
  },{timeout:30000});return saved;
 };
 app.put('/api/v1/users/roles/:id/matrix',write,update);
 app.put('/api/v1/users/roles/:id/permissions',write,update);
 app.get('/api/v1/users/roles/:id/members',read,async req=>{
  const instituteId=scope(req,(req.query as any).instituteId);const {id}=req.params as any;
  return db.user.findMany({where:{roleId:id,instituteId:instituteId||'__none__',status:{not:'DELETED'}},select:{id:true,fullName:true,identifier:true,status:true,permissionGrants:true},orderBy:{fullName:'asc'},take:500});
 });
 app.put('/api/v1/users/:id/permission-overrides',write,async req=>{
  const {id}=req.params as any;const p=z.object({overrides:z.array(permission.and(z.object({effect:z.enum(['ALLOW','DENY'])}))).max(200)}).safeParse(req.body);if(!p.success)return fail('Invalid overrides');
  const target=await db.user.findUnique({where:{id},include:{role:{include:{permissions:true}},permissionGrants:true}});if(!target)return fail('User not found',404);
  if(id===req.user!.userId||target.role.code==='SUPER_ADMIN'||(req.user!.roleCode!=='SUPER_ADMIN'&&(target.instituteId!==req.user!.instituteId||target.role.code==='ADMIN')))return fail('This user is protected or outside your institute',403);
  if(p.data.overrides.some(p=>['roles','settings','system'].includes(p.resource)))return fail('Administrative permissions cannot be overridden');
  if(req.user!.roleCode!=='SUPER_ADMIN'&&p.data.overrides.some(p=>p.effect==='ALLOW'&&!req.user!.permissions.includes(`${p.resource}.${p.action}`)))return fail('You cannot grant permissions you do not have',403);
  if(new Set(p.data.overrides.map(p=>`${p.resource}.${p.action}`)).size!==p.data.overrides.length)return fail('Duplicate override');
  await db.$transaction(async tx=>{await tx.permissionGrant.deleteMany({where:{userId:id}});if(p.data.overrides.length)await tx.permissionGrant.createMany({data:p.data.overrides.map(p=>({...p,userId:id,scope:'INSTITUTE'}))});await audit(tx,req,'USER_PERMISSIONS_UPDATED',id,target.instituteId,{before:target.permissionGrants,after:p.data.overrides});},{timeout:30000});
  return {permissions:effectivePermissions(target.role,p.data.overrides)};
 });
};
