// apps/mobile/src/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const FALLBACK_ENDPOINTS = [
  (process.env as any).EXPO_PUBLIC_API_URL || 'https://examly-pi.vercel.app',
  'https://examly-pi.vercel.app',
  'http://10.255.75.94:4000',
  'http://127.0.0.1:4000',
];

let currentBaseUrl = FALLBACK_ENDPOINTS[0];

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

// Interceptor for network fallback and 401 token expiry handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If network error occurred (e.g. 127.0.0.1 unreachable because USB cable disconnected)
    if (!error.response && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const currentIndex = FALLBACK_ENDPOINTS.indexOf(currentBaseUrl);
      const nextIndex = (currentIndex + 1) % FALLBACK_ENDPOINTS.length;
      if (nextIndex !== currentIndex) {
        currentBaseUrl = FALLBACK_ENDPOINTS[nextIndex];
        apiClient.defaults.baseURL = currentBaseUrl;
        originalRequest.baseURL = currentBaseUrl;
        console.log(`[apiClient] Switching base URL to ${currentBaseUrl} and retrying...`);
        return apiClient(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('examly_token');
        await SecureStore.deleteItemAsync('examly_user');
      } catch {}
    }
    return Promise.reject(error);
  }
);
