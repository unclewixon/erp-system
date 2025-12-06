import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://localhost:5000/api'; // Change this to your server IP for real device testing

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

export default api;
