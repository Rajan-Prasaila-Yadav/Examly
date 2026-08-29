// apps/web/src/lib/api.ts
import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('examly_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('examly_refresh_token');
        if (refreshToken) {
          try {
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            localStorage.setItem('examly_access_token', data.accessToken);
            localStorage.setItem('examly_refresh_token', data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(originalRequest);
          } catch (refreshErr) {
            localStorage.removeItem('examly_access_token');
            localStorage.removeItem('examly_refresh_token');
            window.location.href = '/login';
          }
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);
