import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Sends HttpOnly cookies on every request
});

// Tell the backend which branch a group_admin is currently viewing, so
// branch-scoped endpoints (students, attendance, timetable, ...) resolve
// against that branch instead of returning empty (group_admin has no fixed branchId).
api.interceptors.request.use((config) => {
  const { user, activeBranch } = useAuthStore.getState();
  if (user?.role === 'group_admin' && activeBranch?.id) {
    config.headers.set('X-Branch-Id', activeBranch.id);
  }
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: () => void; reject: (e: Error) => void }[] = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
};

// Auto-refresh on 401 using cookie-based refresh token
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err) => {
    const original = err.config;

    // Don't retry for the refresh endpoint itself, or already-retried requests
    if (
      err.response?.status !== 401 ||
      original._retry ||
      (original.url as string | undefined)?.includes('/auth/refresh')
    ) {
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve: () => resolve(api(original)), reject });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Refresh token is in an HttpOnly cookie — no body needed
      await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      processQueue(null);
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr as Error);
      localStorage.removeItem('edustack_auth');
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
