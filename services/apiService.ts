import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment, MaintenanceLog } from '../types';

async function handleResponse<T>(response: Response): Promise<T> {
  // ... (handleResponse function remains the same)
  // Adding a return statement to fix TS2355
  return response.json() as Promise<T>;
}

// Generic fetch function - Simplified
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Always use a relative path for the API endpoint
  const url = `/api/${endpoint}`; // Assumes backend API is at /api

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

// Special case for maintenance logs, which are part of an equipment item
export const addMaintenanceLog = (equipmentId: string, log: Omit<MaintenanceLog, 'id'>): Promise<Equipment> => {
    return apiFetch(`equipment/${equipmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
            // Frontend logic will handle fetching the equipment, adding the log,
            // and then using equipmentService.update to save the whole object.
            // This API service function might not even be strictly necessary anymore
            // depending on how you structure the component logic.
        })
    });
};