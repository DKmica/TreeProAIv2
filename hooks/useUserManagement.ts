import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementService, User, PendingUser, RolesConfig, UserDetails } from '../services/userManagementService';

const STALE_TIME = 30 * 1000;

export function useUsersQuery() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => userManagementService.listUsers(),
    staleTime: STALE_TIME,
  });
}

export function usePendingUsersQuery() {
  return useQuery<PendingUser[]>({
    queryKey: ['users', 'pending'],
    queryFn: () => userManagementService.getPendingUsers(),
    staleTime: STALE_TIME,
  });
}

export function useRolesConfigQuery() {
  return useQuery<RolesConfig>({
    queryKey: ['users', 'roles-config'],
    queryFn: () => userManagementService.getRolesConfig(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserDetailsQuery(userId: string | null) {
  return useQuery<UserDetails>({
    queryKey: ['users', userId],
    queryFn: () => userManagementService.getUserDetails(userId!),
    enabled: !!userId,
    staleTime: STALE_TIME,
  });
}

export function useApproveUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      userManagementService.approveUser(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'pending'] });
    },
  });
}

export function useRejectUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      userManagementService.rejectUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'pending'] });
    },
  });
}

export function useAssignRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
      customPermissions,
    }: {
      userId: string;
      role: string;
      customPermissions?: Record<string, boolean>;
    }) => userManagementService.assignRole(userId, role, customPermissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId] });
    },
  });
}

export function useRemoveRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      userManagementService.removeRole(userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId] });
    },
  });
}

export function useUpdatePermissionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
      permissions,
    }: {
      userId: string;
      role: string;
      permissions: Record<string, boolean>;
    }) => userManagementService.updatePermissions(userId, role, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId] });
    },
  });
}
