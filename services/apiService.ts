import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment, MaintenanceLog } from '../types';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(`API request to ${response.url} failed:\n${errorData.error || response.statusText}`);
  }
  // Handle 204 No Content for DELETE requests
  if (response.status === 204) {
    return null as T;
  }
  return response.json() as Promise<T>;
}

// Generic fetch function
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let baseUrl = '';
  // This logic determines where the API is located.
  // In a deployed environment (like Cloud Run), the frontend and backend are served
  // from the same origin, so requests can be relative (baseUrl is empty).
  if (typeof window !== 'undefined') {
    // Check for local development environments: running from file system or on localhost.
    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      baseUrl = 'http://localhost:8080';
    }
  }

  const url = `${baseUrl}/api/${endpoint}`;

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
