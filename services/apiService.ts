import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment, MaintenanceLog, PayPeriod, TimeEntry, PayrollRecord } from '../types';

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
export const leadService = createApiService<Lead>('leads');
export const quoteService = createApiService<Quote>('quotes');
export const jobService = createApiService<Job>('jobs');
export const invoiceService = createApiService<Invoice>('invoices');
export const employeeService = createApiService<Employee>('employees');
export const equipmentService = createApiService<Equipment>('equipment');
export const payPeriodService = createApiService<PayPeriod>('pay_periods');
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