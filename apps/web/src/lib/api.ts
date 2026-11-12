// apps/web/src/lib/api.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').trim();
export const API_BASE_URL = rawUrl.endsWith('/api/v1')
  ? rawUrl
  : rawUrl.endsWith('/')
  ? `${rawUrl}api/v1`
  : `${rawUrl}/api/v1`;

// ── In-Memory Fast Cache with SWR & Inflight Request Deduplication ──
interface CacheEntry {
  data: any;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<AxiosResponse<any>>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fast navigation cache
let cacheGeneration=0;
let refreshRequest:Promise<any>|null=null;
const SNAPSHOT_KEY='examly.navigation.v1';
let verifiedScope='';
let scopeResolved=false;
let resolveScope:()=>void;
const scopeReady=new Promise<void>(resolve=>{resolveScope=resolve;});
const persistable=(url:string)=>{
  if(!url || url.includes('/picker/') || url.includes('/storage/presigned')) return false;
  return /^\/(batches|content|tests|users|dashboard|subjects|lessons|videos|notes|analytics|auth\/me)(\/|\?|$)/.test(url);
};
function persistSnapshots(){
 if(!verifiedScope||typeof window==='undefined')return;
 try{
   const entries=[...memoryCache.entries()]
     .filter(([key])=>key.endsWith(':'+verifiedScope)&&persistable(key.split(':')[1]))
     .slice(-100)
     .map(([key,r])=>[key,{data:r.data,status:r.status,statusText:r.statusText,headers:{},config:{},timestamp:r.timestamp}]);
   const text=JSON.stringify({scope:verifiedScope,savedAt:Date.now(),entries});
   if(text.length<500000)localStorage.setItem(SNAPSHOT_KEY,text);
 }catch{}
}
export function getCached<T = any>(url: string, params?: any): T | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('examly_access_token') || '';
  const cacheKey = `GET:${url}:${JSON.stringify(params || {})}:${verifiedScope || token}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS * 2)) {
    return cached.data as T;
  }
  return null;
}
export function setCached<T = any>(url: string, data: T, params?: any): void {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('examly_access_token') || '';
  const cacheKey = `GET:${url}:${JSON.stringify(params || {})}:${verifiedScope || token}`;
  memoryCache.set(cacheKey, {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    timestamp: Date.now()
  });
  if (persistable(url)) persistSnapshots();
}
export function setApiCacheScope(userId?:string,version?:string){
 const next=userId&&version?`${userId}@${version}`:'';
 const changed=!!verifiedScope&&verifiedScope!==next;
 if(next!==verifiedScope){cacheGeneration++;memoryCache.clear();inflightRequests.clear();verifiedScope=next;
  try{const saved=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null');if(next&&saved?.scope===next&&Date.now()-saved.savedAt<86400000){for(const [key,value] of saved.entries||[])memoryCache.set(key,{...value,timestamp:Date.now()});}else localStorage.removeItem(SNAPSHOT_KEY);}catch{}
 }
 scopeResolved=true;resolveScope();
 if(changed&&typeof window!=='undefined')window.dispatchEvent(new Event('examly-data-changed'));
}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key==='examly.navigation.invalidate'){invalidateApiCache();window.dispatchEvent(new Event('examly-permissions-changed'));window.dispatchEvent(new Event('examly-data-changed'));}});


export function invalidateApiCache(pattern?: string) {
  cacheGeneration++;
  inflightRequests.clear();
  if (!pattern) {
    memoryCache.clear();
    try{localStorage.removeItem(SNAPSHOT_KEY);}catch{}
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
  persistSnapshots();
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('examly_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    // Invalidate cache on mutations
    const method = response.config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const url=response.config.url||'';
      // Playback telemetry must not evict unrelated page data every few seconds.
      if (/\/(progress|open|reactions|comments|personal-notes)(\/|$)/.test(url)) {
        invalidateApiCache(url.replace(/\/(progress|open|reactions|comments|personal-notes).*$/,''));
      } else {
        // Writes can affect counts, pickers, reports and enrollment across pages.
        invalidateApiCache();
        if(typeof window!=='undefined'){try{localStorage.setItem('examly.navigation.invalidate',String(Date.now())+Math.random());}catch{}window.dispatchEvent(new Event('examly-permissions-changed'));}
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('examly_refresh_token');
        if (refreshToken) {
          try {
            if(!refreshRequest)refreshRequest=axios.post(`${API_BASE_URL}/auth/refresh`,{refreshToken},{timeout:30000}).finally(()=>{refreshRequest=null;});
            const {data}=await refreshRequest;
            localStorage.setItem('examly_access_token', data.accessToken);
            localStorage.setItem('examly_refresh_token', data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            invalidateApiCache();
            return axiosInstance(originalRequest);
          } catch (refreshErr) {
            localStorage.removeItem('examly_access_token');
            localStorage.removeItem('examly_refresh_token');
            invalidateApiCache();
            window.location.href = '/login';
          }
        } else {
          invalidateApiCache();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// Wrapper with instant SWR caching & inflight deduplication
export const api = {
  ...axiosInstance,

  get: async <T = any>(
    url: string,
    config?: AxiosRequestConfig & { bypassCache?: boolean },
  ): Promise<AxiosResponse<T>> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('examly_access_token') || '' : '';
    if(token&&!scopeResolved&&persistable(url)&&typeof window!=='undefined'&&localStorage.getItem('examly_user'))await scopeReady;
    const cacheKey = `GET:${url}:${JSON.stringify(config?.params || {})}:${verifiedScope||token}`;

    if (!config?.bypassCache) {
      const cached=memoryCache.get(cacheKey);
      if(cached && Date.now()-cached.timestamp<CACHE_TTL_MS) return cached as AxiosResponse<T>;
    }
    // Strict Mode, parallel panels and forced reloads share the same in-flight read.
    const existing=inflightRequests.get(cacheKey);
    if(existing)return existing as Promise<AxiosResponse<T>>;
    const generation=cacheGeneration;
    const promise=axiosInstance.get<T>(url,config).then(res=>{
      // A read started before a write/logout must never repopulate the cache.
      if(generation===cacheGeneration){
        if(memoryCache.size>=200)memoryCache.delete(memoryCache.keys().next().value!);
        memoryCache.set(cacheKey,{...res,timestamp:Date.now()});
        if(persistable(url))persistSnapshots();
      }
      return res;
    }).finally(()=>{if(inflightRequests.get(cacheKey)===promise)inflightRequests.delete(cacheKey);});
    inflightRequests.set(cacheKey,promise);
    return promise;
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache(url);
    return axiosInstance.post<T>(url, data, config);
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache(url);
    return axiosInstance.put<T>(url, data, config);
  },

  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache(url);
    return axiosInstance.patch<T>(url, data, config);
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache(url);
    return axiosInstance.delete<T>(url, config);
  },

  invalidateCache: invalidateApiCache,
  getCached,
  setCached,
};

export default api;

