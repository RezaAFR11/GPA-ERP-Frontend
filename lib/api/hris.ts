import type {
  Applicant,
  ApplicantCreate,
  AttendanceRecord,
  AttendanceSummaryItem,
  BulkAccountResponse,
  DataChangeRequestCreate,
  Department,
  DepartmentCreate,
  DepartmentNode,
  Employee,
  EmployeeCreate,
  EmployeeDataChangeRequest,
  EmployeeDocument,
  HireResult,
  HolidayCalendar,
  HolidayCalendarCreate,
  HrisDashboardStats,
  Interview,
  JobGrade,
  JobGradeCreate,
  JobPosting,
  JobPostingCreate,
  LeaveBalance,
  LeaveCalendarItem,
  LeaveDurationPreview,
  LeaveRequest,
  LeaveRequestCreate,
  LeaveType,
  LeaveTypeCreate,
  MessageResponse,
  MyAttendanceResponse,
  MyDocumentItem,
  MyLeaveBalance,
  MyLeaveRequest,
  MyPayslipDetail,
  MyPayslipSummary,
  MyProfile,
  OnboardingTask,
  OvertimeRequest,
  OvertimeRequestCreate,
  PaginatedResponse,
  PayrollPeriod,
  PayrollRun,
  PayslipSlip,
  SalaryAssignment,
  SalaryAssignmentCreate,
  SalaryComponent,
  SalaryComponentCreate,
  UserSummary,
  WorkGroup,
  WorkGroupCreate,
  WorkLocation,
} from "../types";
import { api, type TableSortParams } from "./client";

// ─── HRIS — Departments ────────────────────────────────────────────────────────

export const hrisDepartmentsApi = {
  list:   (activeOnly = true) =>
    api.get<Department[]>("/hris/departments", { params: { active_only: activeOnly } }),
  tree:   () => api.get<DepartmentNode[]>("/hris/departments/tree"),
  create: (data: DepartmentCreate) => api.post<Department>("/hris/departments", data),
  update: (id: number, data: Partial<DepartmentCreate>) =>
    api.patch<Department>(`/hris/departments/${id}`, data),
};

// ─── HRIS — Job Grades ─────────────────────────────────────────────────────────

export const hrisJobGradesApi = {
  list:   (activeOnly = true) =>
    api.get<JobGrade[]>("/hris/job-grades", { params: { active_only: activeOnly } }),
  create: (data: JobGradeCreate) => api.post<JobGrade>("/hris/job-grades", data),
  update: (id: number, data: Partial<JobGradeCreate>) =>
    api.patch<JobGrade>(`/hris/job-grades/${id}`, data),
};

// ─── HRIS — Employees ─────────────────────────────────────────────────────────

export const hrisEmployeesApi = {
  list: (params?: {
    search?: string; dept_id?: number; tipe?: string; status?: string;
    skip?: number; limit?: number;
  } & TableSortParams) => api.get<PaginatedResponse<Employee>>("/hris/employees", { params }),
  get:    (id: number) => api.get<Employee>(`/hris/employees/${id}`),
  create: (data: EmployeeCreate) => api.post<Employee>("/hris/employees", data),
  update: (id: number, data: Partial<EmployeeCreate>) =>
    api.patch<Employee>(`/hris/employees/${id}`, data),
  uploadPhoto: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ url: string }>(`/hris/employees/${id}/photo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadDocument: (id: number, docType: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    return api.post<EmployeeDocument>(
      `/hris/employees/${id}/documents?doc_type=${encodeURIComponent(docType)}`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },
  bulkCreateAccounts: (items: { employee_id: number; role_name: string }[]) =>
    api.post<BulkAccountResponse>("/hris/employees/bulk-create-accounts", items),
  createFromUser: (userId: number) =>
    api.post<Employee>(`/hris/employees/from-user/${userId}`),
  linkableUsers: () =>
    api.get<UserSummary[]>("/hris/employees/linkable-users"),
  linkUser: (empId: number, userId: number) =>
    api.post<Employee>(`/hris/employees/${empId}/link-user/${userId}`),
};

// ─── HRIS H2 — Absensi & Cuti ─────────────────────────────────────────────────

export const hrisAttendanceApi = {
  list: (params?: {
    employee_id?: number; date_from?: string; date_to?: string;
    dept_id?: number; work_group_id?: number;
    skip?: number; limit?: number;
  }) => api.get<PaginatedResponse<AttendanceRecord>>("/hris/attendance", { params }),

  summary: (params: { year: number; month: number; dept_id?: number }) =>
    api.get<AttendanceSummaryItem[]>("/hris/attendance/summary", { params }),

  manualCreate: (data: {
    employee_id: number; date: string;
    clock_in?: string; clock_out?: string;
    note?: string;
  }) => api.post<AttendanceRecord>("/hris/attendance", data),

  clockIn: (payload: {
    employee_id?: number; latitude?: number; longitude?: number;
    accuracy?: number; note?: string; selfie?: File;
  }) => {
    const fd = new FormData();
    if (payload.employee_id != null) fd.append("employee_id", String(payload.employee_id));
    if (payload.latitude  != null) fd.append("latitude",  String(payload.latitude));
    if (payload.longitude != null) fd.append("longitude", String(payload.longitude));
    if (payload.accuracy  != null) fd.append("accuracy",  String(payload.accuracy));
    if (payload.note)              fd.append("note",      payload.note);
    if (payload.selfie)            fd.append("selfie",    payload.selfie);
    fd.append("timezone_offset_minutes", String(new Date().getTimezoneOffset()));
    return api.post<AttendanceRecord>("/hris/attendance/clock-in", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  clockOut: (params?: {
    employee_id?: number; note?: string;
  }) => api.post<AttendanceRecord>("/hris/attendance/clock-out", null, {
    params: { ...params, timezone_offset_minutes: new Date().getTimezoneOffset() },
  }),

  export: (params?: {
    date_from?: string; date_to?: string; dept_id?: number;
    employee_id?: number; fmt?: "xlsx" | "csv";
  }) => api.get("/hris/attendance/export", {
    params: { ...params, timezone_offset_minutes: new Date().getTimezoneOffset() },
    responseType: "blob",
  }),
};

// ─── HRIS — Work Locations ─────────────────────────────────────────────────────

export const hrisWorkLocationApi = {
  list: (active_only = true) =>
    api.get<WorkLocation[]>("/hris/work-locations", { params: { active_only } }),

  create: (data: {
    name: string; location_type: string;
    latitude: number; longitude: number;
    radius_meters: number; timezone_name: string; is_active?: boolean;
  }) => api.post<WorkLocation>("/hris/work-locations", data),

  update: (id: number, data: Partial<{
    name: string; location_type: string;
    latitude: number; longitude: number;
    radius_meters: number; timezone_name: string; is_active: boolean;
  }>) => api.patch<WorkLocation>(`/hris/work-locations/${id}`, data),

  assignToEmployee: (employeeId: number, workLocationId: number | null) =>
    api.patch(`/hris/employees/${employeeId}/work-location`, null, {
      params: { work_location_id: workLocationId },
    }),
};

// ─── HRIS — Work Groups ────────────────────────────────────────────────────────

export const hrisWorkGroupsApi = {
  list: (params?: { role?: string; is_active?: boolean }) =>
    api.get<WorkGroup[]>("/hris/work-groups", { params }),

  create: (data: WorkGroupCreate) =>
    api.post<WorkGroup>("/hris/work-groups", data),

  update: (id: number, data: { name?: string; description?: string | null; is_active?: boolean }) =>
    api.patch<WorkGroup>(`/hris/work-groups/${id}`, data),

  assignEmployee: (employeeId: number, workGroupId: number | null) =>
    api.patch(`/hris/employees/${employeeId}/work-group`, null, {
      params: { work_group_id: workGroupId },
    }),
};

export const hrisLeaveApi = {
  listTypes: () => api.get<LeaveType[]>("/hris/leave-types"),
  createType: (data: LeaveTypeCreate) => api.post<LeaveType>("/hris/leave-types", data),

  getBalances: (employeeId: number) =>
    api.get<LeaveBalance[]>(`/hris/leave-balance/${employeeId}`),

  seedBalances: () => api.post<{ seeded: number }>("/hris/leave-balance/seed"),

  listRequests: (params?: {
    employee_id?: number; status?: string; skip?: number; limit?: number;
  }) => api.get<PaginatedResponse<LeaveRequest>>("/hris/leave-requests", { params }),

  create: (data: LeaveRequestCreate) =>
    api.post<LeaveRequest>("/hris/leave-requests", data),

  previewDuration: (startDate: string, endDate: string) =>
    api.get<LeaveDurationPreview>("/hris/leave-requests/duration-preview", {
      params: { start_date: startDate, end_date: endDate },
    }),

  uploadDoctorCertificate: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ file_url: string }>("/hris/leave-requests/doctor-certificate", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  discardDoctorCertificate: (fileUrl: string) =>
    api.delete<MessageResponse>("/hris/leave-requests/doctor-certificate", {
      params: { file_url: fileUrl },
    }),

  approve: (id: number, note?: string) =>
    api.post<LeaveRequest>(`/hris/leave-requests/${id}/approve`, { note }),

  reject: (id: number, note?: string) =>
    api.post<LeaveRequest>(`/hris/leave-requests/${id}/reject`, { note }),
};

// ─── HRIS H3 — Payroll ────────────────────────────────────────────────────────

export const hrisSalaryApi = {
  listComponents: () => api.get<SalaryComponent[]>("/hris/salary-components"),
  createComponent: (data: SalaryComponentCreate) =>
    api.post<SalaryComponent>("/hris/salary-components", data),

  listAssignments: (employee_id?: number) =>
    api.get<SalaryAssignment[]>("/hris/salary-assignments", { params: { employee_id } }),
  createAssignment: (data: SalaryAssignmentCreate) =>
    api.post<SalaryAssignment>("/hris/salary-assignments", data),
  deleteAssignment: (id: number) =>
    api.delete(`/hris/salary-assignments/${id}`),
};

export const hrisPayrollApi = {
  listPeriods: () => api.get<PayrollPeriod[]>("/hris/payroll/periods"),
  createPeriod: (year: number, month: number) =>
    api.post<PayrollPeriod>("/hris/payroll/periods", { year, month }),
  lockPeriod: (id: number) =>
    api.post<PayrollPeriod>(`/hris/payroll/periods/${id}/lock`),
  unlockPeriod: (id: number) =>
    api.post<PayrollPeriod>(`/hris/payroll/periods/${id}/unlock`),
  calculate: (id: number, pph21_method?: string, include_thr?: boolean) =>
    api.post<PayrollRun[]>(`/hris/payroll/periods/${id}/calculate`, null, {
      params: { pph21_method, include_thr },
    }),

  listRuns: (params?: { period_id?: number; employee_id?: number }) =>
    api.get<PayrollRun[]>("/hris/payroll/runs", { params }),
  adjustRun: (id: number, data: Partial<{ gross_salary: number; thr_amount: number; pph21_method: string; cost_centre_id: number }>) =>
    api.patch<PayrollRun>(`/hris/payroll/runs/${id}`, data),
  getSlip: (id: number) =>
    api.get<PayslipSlip>(`/hris/payroll/runs/${id}/slip`),
  downloadSlipPdf: (id: number) =>
    api.get<Blob>(`/hris/payroll/runs/${id}/slip.pdf`, { responseType: "blob" }),
  postPeriod: (id: number) =>
    api.post<PayrollPeriod>(`/hris/payroll/periods/${id}/post`),
  exportBankCsv: (id: number, bank?: string) =>
    api.get<Blob>(`/hris/payroll/periods/${id}/export/bank`, {
      params: { bank },
      responseType: "blob",
    }),
  exportBpjs: (id: number) =>
    api.get<Blob>(`/hris/payroll/periods/${id}/export/bpjs`, { responseType: "blob" }),
  exportForm1721: (employeeId: number, year?: number) =>
    api.get<Blob>(`/hris/payroll/employees/${employeeId}/form-1721`, {
      params: { year },
      responseType: "blob",
    }),
};

// ─── HRIS H4 — Recruitment ────────────────────────────────────────────────────

export const hrisRecruitmentApi = {
  listPostings: (params?: { status?: string; dept_id?: number }) =>
    api.get<JobPosting[]>("/hris/job-postings", { params }),
  createPosting: (data: JobPostingCreate) =>
    api.post<JobPosting>("/hris/job-postings", data),
  updatePosting: (id: number, data: Record<string, unknown>) =>
    api.patch<JobPosting>(`/hris/job-postings/${id}`, data),

  listApplicants: (params?: { posting_id?: number; stage?: string; search?: string }) =>
    api.get<Applicant[]>("/hris/applicants", { params }),
  createApplicant: (data: ApplicantCreate) =>
    api.post<Applicant>("/hris/applicants", data),
  moveStage: (id: number, stage: string) =>
    api.patch<Applicant>(`/hris/applicants/${id}/stage`, null, { params: { stage } }),
  hire: (id: number, data: { department_id?: number; grade_id?: number; join_date?: string; create_user?: boolean }) =>
    api.post<HireResult>(`/hris/applicants/${id}/hire`, data),

  createInterview: (data: { applicant_id: number; scheduled_at: string; interviewer_id?: number; notes?: string }) =>
    api.post<Interview>("/hris/interviews", data),
  listInterviews: (applicant_id?: number) =>
    api.get<Interview[]>("/hris/interviews", { params: { applicant_id } }),
  updateInterview: (id: number, result: string, notes?: string) =>
    api.patch<Interview>(`/hris/interviews/${id}`, null, { params: { result, notes } }),

  getOnboarding: (applicant_id: number) =>
    api.get<OnboardingTask[]>(`/hris/onboarding/${applicant_id}`),
  completeTask: (id: number, is_completed?: boolean) =>
    api.patch<OnboardingTask>(`/hris/onboarding/tasks/${id}`, null, {
      params: { is_completed: is_completed ?? true },
    }),
};

// ─── HRIS Self-Service — /hris/me/* (worker / employee portal) ───────────────

export const hrisMeApi = {
  getProfile: () =>
    api.get<MyProfile>("/hris/me"),
  getAttendance: (year?: number, month?: number) =>
    api.get<MyAttendanceResponse>("/hris/me/attendance", {
      params: { year, month, timezone_offset_minutes: new Date().getTimezoneOffset() },
    }),
  getLeaveBalance: (year?: number) =>
    api.get<MyLeaveBalance[]>("/hris/me/leave-balance", { params: { year } }),
  getLeaveRequests: (status?: string) =>
    api.get<MyLeaveRequest[]>("/hris/me/leave-requests", { params: { status, limit: 50 } }),
  getPayslips: () =>
    api.get<MyPayslipSummary[]>("/hris/me/payslips"),
  getPayslipDetail: (run_id: number) =>
    api.get<MyPayslipDetail>(`/hris/me/payslips/${run_id}`),
  // Feature 6: Enhancement Pack
  getOvertimeRequests: () =>
    api.get<OvertimeRequest[]>("/hris/me/overtime-requests"),
  getDataChangeRequests: () =>
    api.get<EmployeeDataChangeRequest[]>("/hris/me/data-change-requests"),
  submitDataChangeRequest: (data: DataChangeRequestCreate) =>
    api.post<EmployeeDataChangeRequest>("/hris/me/data-change-requests", data),
  getDocuments: () =>
    api.get<MyDocumentItem[]>("/hris/me/documents"),
};

// ─── HRIS Dashboard Stats (Feature 7) ────────────────────────────────────────

export const hrisDashboardApi = {
  getStats: (year?: number, month?: number) =>
    api.get<HrisDashboardStats>("/hris/dashboard/stats", { params: { year, month } }),
};

// ─── HRIS Holiday Calendar (Feature 1) ───────────────────────────────────────

export const hrisHolidayCalendarApi = {
  list: (year?: number) =>
    api.get<HolidayCalendar[]>("/hris/holiday-calendar", { params: { year } }),
  create: (data: HolidayCalendarCreate) =>
    api.post<HolidayCalendar>("/hris/holiday-calendar", data),
  delete: (id: number) =>
    api.delete<MessageResponse>(`/hris/holiday-calendar/${id}`),
};

// ─── HRIS Overtime Requests (Feature 6a) ─────────────────────────────────────

export const hrisOvertimeApi = {
  submit: (data: OvertimeRequestCreate) =>
    api.post<OvertimeRequest>("/hris/overtime-requests", data),
  list: (params?: { status?: string; employee_id?: number; date_from?: string; date_to?: string }) =>
    api.get<OvertimeRequest[]>("/hris/overtime-requests", { params }),
  approve: (id: number, note?: string) =>
    api.post<OvertimeRequest>(`/hris/overtime-requests/${id}/approve`, { note }),
  reject: (id: number, note?: string) =>
    api.post<OvertimeRequest>(`/hris/overtime-requests/${id}/reject`, { note }),
};

// ─── HRIS Data Change Requests (Feature 6b) ──────────────────────────────────

export const hrisDataChangeApi = {
  list: (params?: { status?: string; employee_id?: number }) =>
    api.get<EmployeeDataChangeRequest[]>("/hris/data-change-requests", { params }),
  approve: (id: number, note?: string) =>
    api.post<EmployeeDataChangeRequest>(`/hris/data-change-requests/${id}/approve`, { note }),
  reject: (id: number, note?: string) =>
    api.post<EmployeeDataChangeRequest>(`/hris/data-change-requests/${id}/reject`, { note }),
};

// ─── HRIS Leave Calendar (Feature 6c) ────────────────────────────────────────

export const hrisLeaveCalendarApi = {
  get: (params: { year: number; month: number; dept_id?: number }) =>
    api.get<LeaveCalendarItem[]>("/hris/leave-requests/calendar", { params }),
};
