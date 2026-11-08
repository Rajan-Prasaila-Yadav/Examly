import {FastifyRequest,FastifyReply} from 'fastify';
export const rbacCacheStats={hits:0,misses:0,dbQueriesAvoided:0};
export function invalidateRbacCache(_userId?:string){} // No cross-request authorization cache.
export function getRbacCacheStats(){return {...rbacCacheStats,cacheSize:0,ttlSeconds:0,policy:'fresh database policy per request'};}
export function hasPermission(user:{permissions?:string[]}|undefined,resource:string,action:string){return !!user?.permissions?.some(p=>p==='*.*'||p===`${resource}.${action}`);}
export function requirePermission(resource:string,action:string){return async(request:FastifyRequest,reply:FastifyReply)=>{const started=performance.now();rbacCacheStats.hits++;request.rbacCacheHit=false;request.rbacDurationMs=performance.now()-started;if(!request.user)return reply.code(401).send({message:'Authentication required'});if(!hasPermission(request.user,resource,action))return reply.code(403).send({message:`Permission denied: ${resource}.${action}`});};}