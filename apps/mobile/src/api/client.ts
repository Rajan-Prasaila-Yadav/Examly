// apps/mobile/src/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// For physical Android devices connected over USB/WiFi:
// In development, you can use your computer's local network IP or port-forwarded localhost (via `adb reverse tcp:4000 tcp:4000`)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://127.0.0.1:4000' : 'http://localhost:4000');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

// Interceptor for 401 token expiry handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('examly_token');
        await SecureStore.deleteItemAsync('examly_user');
      } catch {}
    }
    return Promise.reject(error);
  }
);
