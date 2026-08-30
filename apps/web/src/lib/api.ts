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
const CACHE_TTL_MS = 25 * 1000; // 25 seconds fast cache

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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
      const url = response.config.url || '';
      if (url.includes('/batches')) invalidateApiCache('/batches');
      if (url.includes('/students')) invalidateApiCache('/students');
      if (url.includes('/teachers')) invalidateApiCache('/teachers');
      if (url.includes('/tests')) invalidateApiCache('/tests');
      if (url.includes('/curriculum') || url.includes('/subjects') || url.includes('/lessons')) {
        invalidateApiCache('/curriculum');
        invalidateApiCache('/subjects');
        invalidateApiCache('/lessons');
      }
      if (url.includes('/users')) invalidateApiCache('/users');
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
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
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
    const cacheKey = `GET:${url}:${JSON.stringify(config?.params || {})}:${token}`;

    if (!config?.bypassCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        // Trigger background revalidation if older than 5s
        if (Date.now() - cached.timestamp > 5000) {
          axiosInstance
            .get<T>(url, config)
            .then((fresh) => {
              memoryCache.set(cacheKey, {
                data: fresh.data,
                status: fresh.status,
                statusText: fresh.statusText,
                headers: fresh.headers,
                config: fresh.config,
                timestamp: Date.now(),
              });
            })
            .catch(() => {});
        }

        return Promise.resolve({
          data: cached.data as T,
          status: cached.status,
          statusText: cached.statusText,
          headers: cached.headers,
          config: cached.config,
        } as AxiosResponse<T>);
      }

      // Deduplicate simultaneous inflight requests
      const inflight = inflightRequests.get(cacheKey);
      if (inflight) {
        return inflight as Promise<AxiosResponse<T>>;
      }
    }

    const requestPromise = axiosInstance
      .get<T>(url, config)
      .then((res: AxiosResponse<T>) => {
        memoryCache.set(cacheKey, {
          data: res.data,
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
          config: res.config,
          timestamp: Date.now(),
        });
        inflightRequests.delete(cacheKey);
        return res;
      })
      .catch((err) => {
        inflightRequests.delete(cacheKey);
        throw err;
      });

    inflightRequests.set(cacheKey, requestPromise as Promise<AxiosResponse<any>>);
    return requestPromise;
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
};
