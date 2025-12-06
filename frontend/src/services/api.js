import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/password', data),
};

// Tenant APIs
export const tenantAPI = {
  getCurrent: () => api.get('/tenants/current'),
  updateCurrent: (data) => api.put('/tenants/current', data),
  getAll: (params) => api.get('/tenants', { params }),
  getById: (id) => api.get(`/tenants/${id}`),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  updateSubscription: (id, data) => api.put(`/tenants/${id}/subscription`, data),
  toggleStatus: (id) => api.put(`/tenants/${id}/toggle-status`),
  getStats: (id) => api.get(`/tenants/${id}/stats`),
};

// Branch APIs
export const branchAPI = {
  getAll: (params) => api.get('/branches', { params }),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  updateGeofence: (id, data) => api.put(`/branches/${id}/geofence`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

// Department APIs
export const departmentAPI = {
  getAll: (params) => api.get('/departments', { params }),
  getTree: () => api.get('/departments/tree'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Designation APIs
export const designationAPI = {
  getAll: (params) => api.get('/designations', { params }),
  getById: (id) => api.get(`/designations/${id}`),
  create: (data) => api.post('/designations', data),
  update: (id, data) => api.put(`/designations/${id}`, data),
  delete: (id) => api.delete(`/designations/${id}`),
};

// Employee APIs
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getDirectory: (params) => api.get('/employees/directory', { params }),
  getOrgChart: () => api.get('/employees/org-chart'),
  getStats: () => api.get('/employees/stats'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  updateStatus: (id, data) => api.put(`/employees/${id}/status`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Attendance APIs
export const attendanceAPI = {
  clockIn: (data) => api.post('/attendance/clock-in', data),
  clockOut: (data) => api.post('/attendance/clock-out', data),
  getToday: () => api.get('/attendance/today'),
  getMyHistory: (params) => api.get('/attendance/my-history', { params }),
  getAll: (params) => api.get('/attendance', { params }),
  getSummary: (params) => api.get('/attendance/summary', { params }),
  createManual: (data) => api.post('/attendance/manual', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
};

// Leave APIs
export const leaveAPI = {
  // Leave Types
  getTypes: () => api.get('/leaves/types'),
  createType: (data) => api.post('/leaves/types', data),
  updateType: (id, data) => api.put(`/leaves/types/${id}`, data),
  deleteType: (id) => api.delete(`/leaves/types/${id}`),

  // Leave Balances
  getMyBalances: (params) => api.get('/leaves/balances/my', { params }),
  getEmployeeBalances: (employeeId, params) => api.get(`/leaves/balances/${employeeId}`, { params }),
  allocateBalance: (data) => api.post('/leaves/balances/allocate', data),
  adjustBalance: (id, data) => api.put(`/leaves/balances/${id}/adjust`, data),

  // Leave Requests
  getMyRequests: (params) => api.get('/leaves/requests/my', { params }),
  getPendingRequests: (params) => api.get('/leaves/requests/pending', { params }),
  getAllRequests: (params) => api.get('/leaves/requests', { params }),
  createRequest: (data) => api.post('/leaves/requests', data),
  approveRequest: (id, data) => api.put(`/leaves/requests/${id}/approve`, data),
  rejectRequest: (id, data) => api.put(`/leaves/requests/${id}/reject`, data),
  cancelRequest: (id, data) => api.put(`/leaves/requests/${id}/cancel`, data),

  // Holidays
  getHolidays: (params) => api.get('/leaves/holidays', { params }),
  createHoliday: (data) => api.post('/leaves/holidays', data),
  updateHoliday: (id, data) => api.put(`/leaves/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/leaves/holidays/${id}`),
};

// Shift APIs
export const shiftAPI = {
  getAll: () => api.get('/shifts'),
  getById: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
};

// Payroll APIs
export const payrollAPI = {
  // Salary Grades
  getGrades: () => api.get('/payroll/grades'),
  createGrade: (data) => api.post('/payroll/grades', data),
  updateGrade: (id, data) => api.put(`/payroll/grades/${id}`, data),
  deleteGrade: (id) => api.delete(`/payroll/grades/${id}`),

  // Employee Salary
  getEmployeeSalary: (employeeId) => api.get(`/payroll/salary/${employeeId}`),
  getMySalary: () => api.get('/payroll/my-salary'),
  setEmployeeSalary: (employeeId, data) => api.post(`/payroll/salary/${employeeId}`, data),

  // Payroll
  getAll: (params) => api.get('/payroll', { params }),
  getById: (id) => api.get(`/payroll/${id}`),
  create: (data) => api.post('/payroll', data),
  process: (id) => api.post(`/payroll/${id}/process`),
  approve: (id) => api.post(`/payroll/${id}/approve`),
  pay: (id, data) => api.post(`/payroll/${id}/pay`, data),

  // Payslips
  getPayslips: (payrollId) => api.get(`/payroll/${payrollId}/payslips`),
  getMyPayslips: () => api.get('/payroll/payslips/my'),
  getPayslip: (id) => api.get(`/payroll/payslips/${id}`),
};

// Recruitment APIs
export const recruitmentAPI = {
  // Jobs
  getJobs: (params) => api.get('/recruitment/jobs', { params }),
  getJob: (id) => api.get(`/recruitment/jobs/${id}`),
  createJob: (data) => api.post('/recruitment/jobs', data),
  updateJob: (id, data) => api.put(`/recruitment/jobs/${id}`, data),
  publishJob: (id) => api.post(`/recruitment/jobs/${id}/publish`),
  closeJob: (id) => api.post(`/recruitment/jobs/${id}/close`),
  deleteJob: (id) => api.delete(`/recruitment/jobs/${id}`),

  // Applications
  getApplications: (params) => api.get('/recruitment/applications', { params }),
  getJobApplications: (jobId, params) => api.get(`/recruitment/jobs/${jobId}/applications`, { params }),
  getApplication: (id) => api.get(`/recruitment/applications/${id}`),
  createApplication: (data) => api.post('/recruitment/applications', data),
  updateApplicationStatus: (id, data) => api.put(`/recruitment/applications/${id}/status`, data),
  addApplicationNote: (id, data) => api.post(`/recruitment/applications/${id}/notes`, data),

  // Interviews
  getInterviews: () => api.get('/recruitment/interviews'),
  getApplicationInterviews: (appId) => api.get(`/recruitment/applications/${appId}/interviews`),
  scheduleInterview: (data) => api.post('/recruitment/interviews', data),
  updateInterview: (id, data) => api.put(`/recruitment/interviews/${id}`, data),
  submitFeedback: (id, data) => api.post(`/recruitment/interviews/${id}/feedback`, data),
  completeInterview: (id, data) => api.post(`/recruitment/interviews/${id}/complete`, data),

  // Offers
  getOffers: () => api.get('/recruitment/offers'),
  createOffer: (data) => api.post('/recruitment/offers', data),
  updateOfferStatus: (id, data) => api.put(`/recruitment/offers/${id}/status`, data),

  // Stats
  getStats: () => api.get('/recruitment/stats'),
};

// Performance APIs
export const performanceAPI = {
  // Goals
  getMyGoals: (params) => api.get('/performance/goals/my', { params }),
  getTeamGoals: () => api.get('/performance/goals/team'),
  getAllGoals: (params) => api.get('/performance/goals', { params }),
  getGoal: (id) => api.get(`/performance/goals/${id}`),
  createGoal: (data) => api.post('/performance/goals', data),
  updateGoal: (id, data) => api.put(`/performance/goals/${id}`, data),
  updateGoalProgress: (id, data) => api.put(`/performance/goals/${id}/progress`, data),
  addGoalComment: (id, data) => api.post(`/performance/goals/${id}/comments`, data),
  deleteGoal: (id) => api.delete(`/performance/goals/${id}`),

  // Review Cycles
  getCycles: (params) => api.get('/performance/cycles', { params }),
  getActiveCycle: () => api.get('/performance/cycles/active'),
  getCycle: (id) => api.get(`/performance/cycles/${id}`),
  createCycle: (data) => api.post('/performance/cycles', data),
  updateCycle: (id, data) => api.put(`/performance/cycles/${id}`, data),
  launchCycle: (id) => api.post(`/performance/cycles/${id}/launch`),

  // Reviews
  getMyReviews: (params) => api.get('/performance/reviews/my', { params }),
  getTeamReviews: (params) => api.get('/performance/reviews/team', { params }),
  getAllReviews: (params) => api.get('/performance/reviews', { params }),
  getReview: (id) => api.get(`/performance/reviews/${id}`),
  submitSelfReview: (id, data) => api.post(`/performance/reviews/${id}/self-review`, data),
  submitManagerReview: (id, data) => api.post(`/performance/reviews/${id}/manager-review`, data),
  calibrateReview: (id, data) => api.post(`/performance/reviews/${id}/calibrate`, data),
  acknowledgeReview: (id) => api.post(`/performance/reviews/${id}/acknowledge`),

  // Stats
  getStats: () => api.get('/performance/stats'),
};

// Training APIs
export const trainingAPI = {
  // Programs
  getPrograms: (params) => api.get('/training/programs', { params }),
  getProgram: (id) => api.get(`/training/programs/${id}`),
  createProgram: (data) => api.post('/training/programs', data),
  updateProgram: (id, data) => api.put(`/training/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/training/programs/${id}`),

  // Sessions
  getSessions: (params) => api.get('/training/sessions', { params }),
  getSession: (id) => api.get(`/training/sessions/${id}`),
  createSession: (data) => api.post('/training/sessions', data),
  updateSession: (id, data) => api.put(`/training/sessions/${id}`, data),
  cancelSession: (id) => api.post(`/training/sessions/${id}/cancel`),

  // Enrollments
  getMyEnrollments: () => api.get('/training/enrollments/my'),
  getSessionEnrollments: (sessionId) => api.get(`/training/sessions/${sessionId}/enrollments`),
  enroll: (sessionId) => api.post(`/training/sessions/${sessionId}/enroll`),
  enrollEmployees: (data) => api.post('/training/enrollments', data),
  cancelEnrollment: (id) => api.delete(`/training/enrollments/${id}`),
  markAttendance: (id, data) => api.post(`/training/enrollments/${id}/attendance`, data),
  completeEnrollment: (id, data) => api.post(`/training/enrollments/${id}/complete`, data),
  submitFeedback: (id, data) => api.post(`/training/enrollments/${id}/feedback`, data),

  // Skills
  getSkills: (params) => api.get('/training/skills', { params }),
  createSkill: (data) => api.post('/training/skills', data),
  updateSkill: (id, data) => api.put(`/training/skills/${id}`, data),

  // Employee Skills
  getMySkills: () => api.get('/training/employee-skills/my'),
  getEmployeeSkills: (employeeId) => api.get(`/training/employee-skills/${employeeId}`),
  addSkill: (data) => api.post('/training/employee-skills', data),
  verifySkill: (id, data) => api.post(`/training/employee-skills/${id}/verify`, data),
  removeSkill: (id) => api.delete(`/training/employee-skills/${id}`),

  // Stats
  getStats: () => api.get('/training/stats'),
};

export default api;
