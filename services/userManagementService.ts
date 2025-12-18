export interface UserRole {
  key: string;
  value: string;
  description: string;
}

export interface ConfigurablePermission {
  default: boolean;
  description: string;
}

export interface RolesConfig {
  roles: UserRole[];
  configurablePermissions: Record<string, Record<string, ConfigurablePermission>>;
}

export interface PendingUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  status: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  roles: string[];
}

export interface UserDetails extends User {
  customPermissions: Record<string, Record<string, boolean>>;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API Error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

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

export const userManagementService = {
  listUsers: (): Promise<User[]> => apiFetch('users'),

  getPendingUsers: (): Promise<PendingUser[]> => apiFetch('users/pending'),

  getRolesConfig: (): Promise<RolesConfig> => apiFetch('users/roles-config'),

  getUserDetails: (userId: string): Promise<UserDetails> => apiFetch(`users/${userId}`),

  approveUser: (userId: string, role: string): Promise<{ message: string; user: User; assignedRole: string }> =>
    apiFetch(`users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  rejectUser: (userId: string, reason?: string): Promise<{ message: string; userId: string; reason?: string }> =>
    apiFetch(`users/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  assignRole: (
    userId: string,
    role: string,
    customPermissions?: Record<string, boolean>
  ): Promise<{ message: string; userId: string; role: string; allRoles: string[] }> =>
    apiFetch(`users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role, customPermissions }),
    }),

  removeRole: (userId: string, role: string): Promise<{ message: string; userId: string; role: string; remainingRoles: string[] }> =>
    apiFetch(`users/${userId}/roles/${encodeURIComponent(role)}`, {
      method: 'DELETE',
    }),

  updatePermissions: (
    userId: string,
    role: string,
    permissions: Record<string, boolean>
  ): Promise<{ message: string; userId: string; role: string; permissions: Record<string, boolean> }> =>
    apiFetch(`users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ role, permissions }),
    }),
};
