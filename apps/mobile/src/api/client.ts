// apps/mobile/src/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const configuredApiUrl = (process.env as any).EXPO_PUBLIC_API_URL || 'https://examly-pi.vercel.app';
if (!/^https?:\/\//i.test(configuredApiUrl)) {
  throw new Error('EXPO_PUBLIC_API_URL must be an HTTP or HTTPS API URL.');
}
const currentBaseUrl = configuredApiUrl.replace(/\/$/, '');
let refreshInFlight: Promise<string | null> | null = null;

const clearSession = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync('examly_token'),
    SecureStore.deleteItemAsync('examly_refresh_token'),
    SecureStore.deleteItemAsync('examly_user'),
  ]);
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await SecureStore.getItemAsync('examly_refresh_token');
      if (!refreshToken) return null;
      try {
        const response = await axios.post(`${currentBaseUrl}/api/v1/auth/refresh`, { refreshToken }, { timeout: 10_000 });
        const accessToken = response.data?.accessToken || response.data?.token;
        const rotatedRefreshToken = response.data?.refreshToken;
        if (!accessToken || !rotatedRefreshToken) throw new Error('Invalid refresh response');
        await SecureStore.setItemAsync('examly_token', accessToken);
        await SecureStore.setItemAsync('examly_refresh_token', rotatedRefreshToken);
        return accessToken as string;
      } catch {
        await clearSession();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
};

export const apiClient = axios.create({
  baseURL: currentBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor to automatically attach JWT token from SecureStore
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('examly_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Could not read JWT token from SecureStore:', error);
  }
  return config;
});

// Refresh expired short-lived access tokens once, then retry the original API call.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !String(originalRequest.url).includes('/auth/refresh')) {
      originalRequest._retry = true;
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      }
    }
    if (error.response?.status === 401) {
      await clearSession();
    }
    return Promise.reject(error);
  }
);
