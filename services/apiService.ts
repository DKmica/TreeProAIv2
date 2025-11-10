import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment, MaintenanceLog, PayPeriod, TimeEntry, PayrollRecord, CompanyProfile, EstimateFeedback, EstimateFeedbackStats, Client, Property, Contact, JobTemplate, Crew, CrewMember, CrewAssignment, FormTemplate, JobForm } from '../types';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  // Handle empty responses (e.g., DELETE operations)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  
  return response.json() as Promise<T>;
}

// Generic fetch function
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `/api/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return handleResponse<T>(response);
}

// Generic CRUD operations
const createApiService = <T extends { id: string }>(resource: string) => ({
  getAll: (): Promise<T[]> => apiFetch(resource),
  getById: (id: string): Promise<T> => apiFetch(`${resource}/${id}`),
  create: (data: Partial<Omit<T, 'id'>>): Promise<T> => apiFetch(resource, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<T>): Promise<T> => apiFetch(`${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string): Promise<void> => apiFetch<void>(`${resource}/${id}`, { method: 'DELETE' }),
});

export const customerService = createApiService<Customer>('customers');
export const clientService = {
  getAll: async (): Promise<Client[]> => {
    const response = await apiFetch<{ success: boolean; data: Client[]; pagination: any }>('clients');
    return response.data ?? [];
  },
  getById: (id: string): Promise<Client> => apiFetch(`clients/${id}`),
  create: (data: Partial<Omit<Client, 'id'>>): Promise<Client> => apiFetch('clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Client>): Promise<Client> => apiFetch(`clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string): Promise<void> => apiFetch<void>(`clients/${id}`, { method: 'DELETE' }),
  getProperties: (clientId: string): Promise<Property[]> => apiFetch(`clients/${clientId}/properties`),
  getContacts: (clientId: string): Promise<Contact[]> => apiFetch(`clients/${clientId}/contacts`),
};
export const propertyService = {
  ...createApiService<Property>('properties'),
  createForClient: (clientId: string, data: Partial<Omit<Property, 'id'>>): Promise<Property> => 
    apiFetch(`clients/${clientId}/properties`, { method: 'POST', body: JSON.stringify(data) }),
};
export const leadService = createApiService<Lead>('leads');
export const quoteService = {
  getAll: async (): Promise<Quote[]> => {
    const response = await apiFetch<{ success: boolean; data: Quote[]; pagination: any }>('quotes');
    return response.data ?? [];
  },
  getById: (id: string): Promise<Quote> => apiFetch(`quotes/${id}`),
  create: (data: Partial<Omit<Quote, 'id'>>): Promise<Quote> => apiFetch('quotes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Quote>): Promise<Quote> => apiFetch(`quotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string): Promise<void> => apiFetch<void>(`quotes/${id}`, { method: 'DELETE' }),
};
export const jobService = createApiService<Job>('jobs');
export const invoiceService = createApiService<Invoice>('invoices');
export const employeeService = createApiService<Employee>('employees');
export const equipmentService = createApiService<Equipment>('equipment');
export const payPeriodService = {
  ...createApiService<PayPeriod>('pay_periods'),
  process: async (id: string): Promise<{ payPeriod: PayPeriod; payrollRecords: PayrollRecord[] }> => {
    return apiFetch(`pay_periods/${id}/process`, { method: 'POST' });
  }
};
export const timeEntryService = createApiService<TimeEntry>('time_entries');
export const payrollRecordService = createApiService<PayrollRecord>('payroll_records');

// Special case for maintenance logs
export const addMaintenanceLog = async (equipmentId: string, log: Omit<MaintenanceLog, 'id'>): Promise<Equipment> => {
    // Fetch current equipment
    const equipment = await equipmentService.getById(equipmentId);
    
    // Add new log with generated ID
    const newLog: MaintenanceLog = {
        id: `maint-${Date.now()}`,
        ...log
    };
    
    const updatedHistory = [...(equipment.maintenanceHistory || []), newLog];
    
    // Update the last service date if the new log date is the most recent
    const mostRecentDate = updatedHistory.reduce(
        (latest, current) => new Date(current.date) > new Date(latest) ? current.date : latest, 
        equipment.lastServiceDate
    );
    
    // Update equipment with new maintenance log
    return equipmentService.update(equipmentId, {
        maintenanceHistory: updatedHistory,
        lastServiceDate: mostRecentDate
    });
};

// Company Profile Service (singleton pattern)
export const companyProfileService = {
  get: (): Promise<CompanyProfile> => apiFetch('company-profile'),
  update: (data: Partial<CompanyProfile>): Promise<CompanyProfile> => apiFetch('company-profile', { method: 'PUT', body: JSON.stringify(data) }),
};

// Estimate Feedback Service
export const estimateFeedbackService = {
  submitEstimateFeedback: async (feedback: Omit<EstimateFeedback, 'id' | 'createdAt'>): Promise<EstimateFeedback> => {
    return apiFetch('estimate_feedback', { method: 'POST', body: JSON.stringify(feedback) });
  },
  getEstimateFeedback: (): Promise<EstimateFeedback[]> => apiFetch('estimate_feedback'),
  getEstimateFeedbackStats: (): Promise<EstimateFeedbackStats> => apiFetch('estimate_feedback/stats'),
};

export const jobStateService = {
  getAllowedTransitions: (jobId: string): Promise<{currentState: string; transitions: any[]}> => 
    apiFetch(`jobs/${jobId}/allowed-transitions`),
  transitionState: (jobId: string, data: {toState: string; reason?: string; notes?: any}): Promise<Job> =>
    apiFetch(`jobs/${jobId}/state-transitions`, { method: 'POST', body: JSON.stringify(data) }),
  getStateHistory: (jobId: string): Promise<{currentState: string; history: any[]}> =>
    apiFetch(`jobs/${jobId}/state-history`)
};

export const jobTemplateService = {
  getAll: async (filters?: {category?: string; search?: string; limit?: number}): Promise<JobTemplate[]> => {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.search) params.search = filters.search;
    if (filters?.limit) params.limit = filters.limit.toString();
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch<{success: boolean; data: JobTemplate[]}>(`job-templates${queryString ? `?${queryString}` : ''}`);
    return response.data ?? [];
  },
  getByCategory: async (): Promise<{category: string; templates: JobTemplate[]}[]> => {
    const response = await apiFetch<{success: boolean; data: {category: string; templates: JobTemplate[]}[]}>('job-templates/by-category');
    return response.data ?? [];
  },
  getUsageStats: async (): Promise<JobTemplate[]> => {
    const response = await apiFetch<{success: boolean; data: JobTemplate[]}>('job-templates/usage-stats');
    return response.data ?? [];
  },
  getById: async (id: string): Promise<JobTemplate> => {
    const response = await apiFetch<{success: boolean; data: JobTemplate}>(`job-templates/${id}`);
    return response.data;
  },
  create: async (data: Partial<JobTemplate>): Promise<JobTemplate> => {
    const response = await apiFetch<{success: boolean; data: JobTemplate}>('job-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  },
  createFromJob: async (jobId: string, data: Partial<JobTemplate>): Promise<JobTemplate> => {
    const response = await apiFetch<{success: boolean; data: JobTemplate}>(`job-templates/from-job/${jobId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  },
  update: async (id: string, data: Partial<JobTemplate>): Promise<JobTemplate> => {
    const response = await apiFetch<{success: boolean; data: JobTemplate}>(`job-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data;
  },
  remove: async (id: string): Promise<void> => {
    await apiFetch<{success: boolean}>(`job-templates/${id}`, {
      method: 'DELETE'
    });
  },
  useTemplate: async (id: string, overrideData?: Partial<Job>): Promise<Job> => {
    const response = await apiFetch<{success: boolean; data: Job}>(`job-templates/${id}/use`, {
      method: 'POST',
      body: JSON.stringify(overrideData || {})
    });
    return response.data;
  }
};

export const crewService = {
  getAll: async (): Promise<Crew[]> => {
    const response = await apiFetch<{ success: boolean; data: Crew[] }>('crews');
    return response.data ?? [];
  },
  getById: (id: string): Promise<Crew> => apiFetch(`crews/${id}`),
  create: (data: Partial<Omit<Crew, 'id'>>): Promise<Crew> => apiFetch('crews', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Crew>): Promise<Crew> => apiFetch(`crews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string): Promise<void> => apiFetch<void>(`crews/${id}`, { method: 'DELETE' }),
  getMembers: (crewId: string): Promise<CrewMember[]> => apiFetch(`crews/${crewId}/members`),
  addMember: (crewId: string, data: { employeeId: string; role: string }): Promise<CrewMember> => 
    apiFetch(`crews/${crewId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateMemberRole: (crewId: string, memberId: string, role: string): Promise<CrewMember> =>
    apiFetch(`crews/${crewId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  removeMember: (crewId: string, memberId: string): Promise<void> =>
    apiFetch<void>(`crews/${crewId}/members/${memberId}`, { method: 'DELETE' }),
  getAvailable: (date: string): Promise<Crew[]> => apiFetch(`crews/available?date=${encodeURIComponent(date)}`),
  getUnassignedEmployees: (): Promise<Employee[]> => apiFetch('employees/unassigned'),
};

export const crewAssignmentService = {
  getSchedule: async (params?: { startDate?: string; endDate?: string; crewId?: string }): Promise<CrewAssignment[]> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.crewId) queryParams.append('crew_id', params.crewId);
    const queryString = queryParams.toString();
    const response = await apiFetch<{ success: boolean; data: CrewAssignment[] }>(`crew-assignments/schedule${queryString ? `?${queryString}` : ''}`);
    return response.data || [];
  },
  create: async (data: { jobId: string; crewId: string; assignedDate: string; notes?: string }): Promise<CrewAssignment> => {
    const response = await apiFetch<{ success: boolean; data: CrewAssignment[] }>('crew-assignments/bulk-assign', { 
      method: 'POST', 
      body: JSON.stringify({ 
        job_id: data.jobId, 
        crew_id: data.crewId, 
        dates: [data.assignedDate], 
        notes: data.notes 
      }) 
    });
    return response.data[0];
  },
  bulkAssign: (data: { jobId: string; crewId: string; dates: string[]; notes?: string }): Promise<CrewAssignment[]> =>
    apiFetch('crew-assignments/bulk-assign', { 
      method: 'POST', 
      body: JSON.stringify({ job_id: data.jobId, crew_id: data.crewId, dates: data.dates, notes: data.notes }) 
    }),
  checkConflictForCrewAndDate: (crewId: string, assignedDate: string, jobId?: string): Promise<{ hasConflict: boolean; conflicts: any[] }> =>
    apiFetch('crew-assignments/check-conflicts', { 
      method: 'POST', 
      body: JSON.stringify({ crew_id: crewId, assigned_date: assignedDate, job_id: jobId }) 
    }),
  remove: (id: string): Promise<void> =>
    apiFetch<void>(`crew-assignments/${id}`, { method: 'DELETE' }),
};

export const formService = {
  getTemplates: async (filters?: { category?: string; search?: string }): Promise<FormTemplate[]> => {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.search) params.search = filters.search;
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch<{ success: boolean; data: FormTemplate[] }>(`form-templates${queryString ? `?${queryString}` : ''}`);
    return response.data ?? [];
  },
  getCategories: async (): Promise<string[]> => {
    const response = await apiFetch<{ success: boolean; data: string[] }>('form-templates/categories');
    return response.data ?? [];
  },
  getTemplate: (id: string): Promise<FormTemplate> => apiFetch(`form-templates/${id}`),
  createTemplate: (data: Partial<Omit<FormTemplate, 'id'>>): Promise<FormTemplate> => 
    apiFetch('form-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: string, data: Partial<FormTemplate>): Promise<FormTemplate> => 
    apiFetch(`form-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: string): Promise<void> => 
    apiFetch<void>(`form-templates/${id}`, { method: 'DELETE' }),
  
  attachFormToJob: (jobId: string, templateId: string): Promise<JobForm> => 
    apiFetch(`jobs/${jobId}/forms`, { method: 'POST', body: JSON.stringify({ templateId }) }),
  getJobForms: (jobId: string): Promise<JobForm[]> => apiFetch(`jobs/${jobId}/forms`),
  getJobForm: (id: string): Promise<JobForm> => apiFetch(`job-forms/${id}`),
  submitFormData: (id: string, formData: Record<string, any>): Promise<JobForm> => 
    apiFetch(`job-forms/${id}/submit`, { method: 'PUT', body: JSON.stringify({ formData }) }),
  completeForm: (id: string): Promise<JobForm> => 
    apiFetch(`job-forms/${id}/complete`, { method: 'PUT' }),
  deleteJobForm: (id: string): Promise<void> => 
    apiFetch<void>(`job-forms/${id}`, { method: 'DELETE' }),
};