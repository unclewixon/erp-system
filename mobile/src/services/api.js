import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Use deployed server URL for production, localhost for development
const API_URL = __DEV__
  ? 'http://localhost:5001/api'  // Development
  : 'http://165.232.32.182/api'; // Production (DigitalOcean)

// For testing on physical device, use your machine's IP or deployed server:
// const API_URL = 'http://165.232.32.182/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Employee APIs
export const employeeAPI = {
  getDirectory: (params) => api.get('/employees/directory', { params }),
  getStats: () => api.get('/employees/stats'),
  getById: (id) => api.get(`/employees/${id}`),
};

// Branch APIs
export const branchAPI = {
  getAll: () => api.get('/branches'),
  getById: (id) => api.get(`/branches/${id}`),
};

// Attendance APIs
export const attendanceAPI = {
  clockIn: (data) => api.post('/attendance/clock-in', data),
  clockOut: (data) => api.post('/attendance/clock-out', data),
  getToday: () => api.get('/attendance/today'),
  getMy: (params) => api.get('/attendance/my', { params }),
  getSummary: (params) => api.get('/attendance/summary', { params }),
};

// Leave APIs
export const leaveAPI = {
  getTypes: () => api.get('/leaves/types'),
  getMyBalances: () => api.get('/leaves/balances/my'),
  getMyRequests: (params) => api.get('/leaves/requests/my', { params }),
  createRequest: (data) => api.post('/leaves/requests', data),
  cancelRequest: (id, data) => api.put(`/leaves/requests/${id}/cancel`, data),
  getHolidays: (params) => api.get('/leaves/holidays', { params }),
};

// Profile APIs
export const profileAPI = {
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  updateNotificationSettings: (data) => api.put('/auth/notification-settings', data),
};

// Notification APIs
export const notificationAPI = {
  registerDevice: (data) => api.post('/notifications/register-device', data),
  unregisterDevice: (token) => api.delete(`/notifications/unregister-device/${token}`),
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export default api;
