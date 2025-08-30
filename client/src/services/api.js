import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          const response = await axios.post(
            `${baseURL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const { token: newToken } = response.data;
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', newToken);
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
    updateProfile: '/auth/profile',
    changePassword: '/auth/change-password',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
  },
  symptoms: {
    check: '/symptoms/check',
    history: '/symptoms/history',
    stats: '/symptoms/stats/overview',
    search: '/symptoms/search',
    get: (id) => `/symptoms/${id}`,
    update: (id) => `/symptoms/${id}`,
    delete: (id) => `/symptoms/${id}`,
  },
  chat: {
    start: '/chat/start',
    history: '/chat/history',
    stats: '/chat/stats/overview',
    search: '/chat/search',
    get: (sessionId) => `/chat/${sessionId}`,
    sendMessage: (sessionId) => `/chat/${sessionId}/message`,
    update: (sessionId) => `/chat/${sessionId}`,
    delete: (sessionId) => `/chat/${sessionId}`,
  },
  appointments: {
    list: '/appointments',
    search: '/appointments/search',
    create: '/appointments',
    get: (id) => `/appointments/${id}`,
    update: (id) => `/appointments/${id}`,
    delete: (id) => `/appointments/${id}`,
    stats: '/appointments/stats/overview',
  },
  healthTips: {
    list: '/health-tips',
    get: (id) => `/health-tips/${id}`,
    daily: '/health-tips/daily',
  },
  medications: {
    list: '/medications',
    create: '/medications',
    get: (id) => `/medications/${id}`,
    update: (id) => `/medications/${id}`,
    delete: (id) => `/medications/${id}`,
    reminders: '/medications/reminders',
  },
  users: {
    profile: '/users/profile',
    updateProfile: '/users/profile',
    healthProfile: '/users/health-profile',
  },
};
