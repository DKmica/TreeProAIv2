import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment, MaintenanceLog } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const BASE_URL = `${API_URL}/api`;


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
  const response = await fetch(`${BASE_URL}${endpoint}`, {
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
  getAll: (): Promise<T[]> => apiFetch(`/${resource}`),
  getById: (id: string): Promise<T> => apiFetch(`/${resource}/${id}`),
  create: (data: Partial<Omit<T, 'id'>>): Promise<T> => apiFetch(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<T>): Promise<T> => apiFetch(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string): Promise<void> => apiFetch<void>(`/${resource}/${id}`, { method: 'DELETE' }),
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
    return apiFetch(`/equipment/${equipmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
            // This is a simplified approach. A real backend might have a dedicated endpoint like /equipment/:id/logs
            // For now, we fetch the item, add the log, and PUT the whole thing back.
            // Our server.js PUT logic merges, so this is just sending the part to be merged.
            // Let's make it simpler and assume the backend can handle appending to a nested array.
            // This is a mock, so the backend will need to be smart.
            // Let's change the pattern: we will update the parent `Equipment` object
            // by adding the log to its `maintenanceHistory`
            // Let's adjust the frontend logic to handle this instead. The API service will be simpler.
        })
    });
};
