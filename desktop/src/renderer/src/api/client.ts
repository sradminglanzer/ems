import axios from 'axios';

const getApiBaseUrl = () => {
  return (
    localStorage.getItem('ems_api_url') ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000/api'
  );
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Update baseURL dynamically in case it changed in localStorage
  config.baseURL = getApiBaseUrl();

  const token = localStorage.getItem('ems_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const entityId =
    localStorage.getItem('ems_entity_id') ||
    import.meta.env.VITE_ENTITY_ID;
  if (entityId) {
    config.headers['x-entity-id'] = entityId;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      // Clear token on 401
      if (!window.location.hash.includes('login')) {
        localStorage.removeItem('ems_token');
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    return Promise.reject(err);
  }
);

// ── API Services ───────────────────────────────────────────────────────────────

export const AuthService = {
  login: (credentials: { contactNumber: string; mpin?: string; entityId?: string }) =>
    api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  getEntities: () => api.get('/auth/entities'),
};

export const DashboardService = {
  getStats: (academicYearId?: string) =>
    api.get('/dashboard/stats', { params: { academicYearId } }),
  getReports: (academicYearId?: string) =>
    api.get('/dashboard/reports', { params: { academicYearId } }),
  getFinancials: (params: { academicYearId?: string; startDate?: string; endDate?: string }) =>
    api.get('/dashboard/financials', { params }),
};

export const MemberService = {
  getAll: (params?: { search?: string; feeGroupId?: string; status?: string }) =>
    api.get('/members', { params }),
  getById: (id: string) => api.get(`/members/${id}`),
  getNextAdmissionNo: () => api.get('/members/next-admission-no'),
  getNextRollNo: (params: { feeGroupId: string; academicYearId?: string }) =>
    api.get('/members/next-roll-no', { params }),
  create: (data: any) => api.post('/members', data),
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
  delete: (id: string) => api.delete(`/members/${id}`),
  bulkImport: (students: any[]) => api.post('/members/bulk', { members: students }),
};

export const FeeService = {
  getGroups: () => api.get('/fee-groups'),
  createGroup: (data: any) => api.post('/fee-groups', data),
  updateGroup: (id: string, data: any) => api.put(`/fee-groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/fee-groups/${id}`),

  getStructures: () => api.get('/fee-structures'),
  createStructure: (data: any) => api.post('/fee-structures', data),
  updateStructure: (id: string, data: any) => api.put(`/fee-structures/${id}`, data),
  deleteStructure: (id: string) => api.delete(`/fee-structures/${id}`),

  getPayments: (params?: { memberId?: string; academicYearId?: string }) =>
    api.get('/fee-payments', { params }),
  createPayment: (paymentData: any) => api.post('/fee-payments', paymentData),
};

export const ExpenseService = {
  getAll: (params?: { startDate?: string; endDate?: string; category?: string; academicYearId?: string }) =>
    api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const AcademicYearService = {
  getAll: () => api.get('/academic-years'),
  create: (data: any) => api.post('/academic-years', data),
  update: (id: string, data: any) => api.put(`/academic-years/${id}`, data),
  delete: (id: string) => api.delete(`/academic-years/${id}`),
  setActive: (id: string) => api.put(`/academic-years/${id}`, { isActive: true }),
};

export const ReportService = {
  getSummary: (params?: { academicYearId?: string; startDate?: string; endDate?: string }) =>
    api.get('/reports/summary', { params }),
  getPayments: (params?: {
    academicYearId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/reports/payments', { params }),
  getPlansBreakdown: (params?: { academicYearId?: string; startDate?: string; endDate?: string }) =>
    api.get('/reports/plans-breakdown', { params }),
  getExpenseBreakdown: (params?: { academicYearId?: string; startDate?: string; endDate?: string }) =>
    api.get('/reports/expense-breakdown', { params }),
};

export const DiaryService = {
  getAll: (params?: { classId?: string; date?: string }) => api.get('/diary', { params }),
  create: (data: any) => api.post('/diary', data),
  delete: (id: string) => api.delete(`/diary/${id}`),
};

export const AttendanceService = {
  get: (params: { feeGroupId: string; date: string }) => api.get('/attendance', { params }),
  save: (data: { feeGroupId: string; date: string; records: any[] }) => api.post('/attendance', data),
  sendAlerts: (data: { feeGroupId: string; date: string }) => api.post('/attendance/send-alerts', data),
  getMemberAttendance: (memberId: string) => api.get(`/attendance/member/${memberId}`),
};

export const ExamService = {
  getAll: (params?: { feeGroupId?: string; academicYearId?: string }) => api.get('/exams', { params }),
  create: (data: any) => api.post('/exams', data),
  getResults: (examId: string) => api.get(`/exams/${examId}/results`),
  saveResults: (examId: string, data: any) => api.post(`/exams/${examId}/results`, data),
  getRankSheet: (examId: string) => api.get(`/exams/${examId}/rank-sheet`),
  publishResults: (examId: string) => api.post(`/exams/${examId}/publish-results`),
  notifyTimetable: (examId: string) => api.post(`/exams/${examId}/notify-timetable`),
  getMemberReportCard: (memberId: string, academicYearId?: string) =>
    api.get(`/exams/member/${memberId}/report-card`, { params: { academicYearId } }),
};

export const SubjectService = {
  getAll: (params?: { feeGroupId?: string }) => api.get('/subjects', { params }),
  create: (data: any) => api.post('/subjects', data),
  update: (id: string, data: any) => api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

export const StaffService = {
  getAll: () => api.get('/staff'),
  create: (data: any) => api.post('/staff', data),
  update: (id: string, data: any) => api.put(`/staff/${id}`, data),
  delete: (id: string) => api.delete(`/staff/${id}`),
};

export const EntitySettingsService = {
  get: () => api.get('/entity-settings'),
  update: (data: any) => api.put('/entity-settings', data),
};
