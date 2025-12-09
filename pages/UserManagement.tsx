import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Shield, Check, X, UserPlus, Edit2, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import {
  useUsersQuery,
  usePendingUsersQuery,
  useRolesConfigQuery,
  useUserDetailsQuery,
  useApproveUserMutation,
  useRejectUserMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useUpdatePermissionsMutation,
} from '../hooks/useUserManagement';
import { User, PendingUser, ConfigurablePermission } from '../services/userManagementService';

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  manager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  sales: 'bg-green-500/20 text-green-300 border-green-500/30',
  scheduler: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  foreman: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  laborer: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  crew: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
};

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-500/20 text-emerald-300',
  pending: 'bg-amber-500/20 text-amber-300',
  rejected: 'bg-red-500/20 text-red-300',
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const colorClass = ROLE_COLORS[role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
      {role}
    </span>
  );
};

function StatusBadge({ status }: { status: string }) {
  const styleClass = STATUS_STYLES[status] || 'bg-gray-500/20 text-gray-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styleClass}`}>
      {status}
    </span>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getUserDisplayName(user: { first_name: string | null; last_name: string | null; email: string }) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name || user.email;
}

interface ApproveModalProps {
  user: PendingUser;
  roles: { key: string; value: string; description: string }[];
  onConfirm: (role: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ApproveModal({ user, roles, onConfirm, onCancel, isLoading }: ApproveModalProps) {
  const [selectedRole, setSelectedRole] = useState(roles[0]?.value || 'laborer');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <UserPlus className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Approve User</h3>
        </div>
        <p className="text-gray-300 mb-4">
          Approve <span className="font-medium text-white">{getUserDisplayName(user)}</span> and assign them a role.
        </p>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Role</label>
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-cyan-500"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.value.charAt(0).toUpperCase() + role.value.slice(1)} - {role.description}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedRole)}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  userId: string;
  roles: { key: string; value: string; description: string }[];
  configurablePermissions: Record<string, Record<string, ConfigurablePermission>>;
  onClose: () => void;
}

function EditUserModal({ userId, roles, configurablePermissions, onClose }: EditUserModalProps) {
  const toast = useToast();
  const { data: userDetails, isLoading: isLoadingUser } = useUserDetailsQuery(userId);
  const assignRoleMutation = useAssignRoleMutation();
  const removeRoleMutation = useRemoveRoleMutation();
  const updatePermissionsMutation = useUpdatePermissionsMutation();

  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, Record<string, boolean>>>({});

  const availableRolesToAdd = useMemo(() => {
    if (!userDetails) return roles;
    return roles.filter((r) => !userDetails.roles.includes(r.value));
  }, [roles, userDetails]);

  const handleAddRole = async () => {
    if (!selectedRoleToAdd) return;
    try {
      await assignRoleMutation.mutateAsync({ userId, role: selectedRoleToAdd });
      toast.success('Role assigned', `Added ${selectedRoleToAdd} role`);
      setSelectedRoleToAdd('');
    } catch (err: any) {
      toast.error('Failed to assign role', err.message);
    }
  };

  const handleRemoveRole = async (role: string) => {
    try {
      await removeRoleMutation.mutateAsync({ userId, role });
      toast.success('Role removed', `Removed ${role} role`);
    } catch (err: any) {
      toast.error('Failed to remove role', err.message);
    }
  };

  const handlePermissionChange = (role: string, permKey: string, value: boolean) => {
    setPendingPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || userDetails?.customPermissions[role] || {}),
        [permKey]: value,
      },
    }));
  };

  const handleSavePermissions = async (role: string) => {
    const perms = pendingPermissions[role];
    if (!perms) return;
    try {
      await updatePermissionsMutation.mutateAsync({ userId, role, permissions: perms });
      toast.success('Permissions updated');
      setPendingPermissions((prev) => {
        const next = { ...prev };
        delete next[role];
        return next;
      });
    } catch (err: any) {
      toast.error('Failed to update permissions', err.message);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 border border-gray-700">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-brand-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 border border-gray-700">
          <p className="text-red-400 text-center">User not found</p>
          <button onClick={onClose} className="mt-4 w-full px-4 py-2 bg-gray-700 rounded-lg text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-cyan-500/20 rounded-lg">
                <Edit2 className="w-5 h-5 text-brand-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{getUserDisplayName(userDetails)}</h3>
                <p className="text-sm text-gray-400">{userDetails.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Current Roles</h4>
            {userDetails.roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles assigned</p>
            ) : (
              <div className="space-y-2">
                {userDetails.roles.map((role) => {
                  const rolePerms = configurablePermissions[role];
                  const isExpanded = expandedRole === role;
                  const currentPerms = pendingPermissions[role] || userDetails.customPermissions[role] || {};
                  const hasChanges = !!pendingPermissions[role];

                  return (
                    <div key={role} className="bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <RoleBadge role={role} />
                          {rolePerms && (
                            <button
                              onClick={() => setExpandedRole(isExpanded ? null : role)}
                              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                            >
                              <Shield className="w-3 h-3" />
                              Permissions
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveRole(role)}
                            disabled={removeRoleMutation.isPending}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Remove role"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {isExpanded && rolePerms && (
                        <div className="border-t border-gray-600 p-3 space-y-2">
                          {Object.entries(rolePerms).map(([permKey, permConfig]) => {
                            const isEnabled = currentPerms[permKey] ?? permConfig.default;
                            return (
                              <label key={permKey} className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm text-gray-300 group-hover:text-white">{permConfig.description}</span>
                                <button
                                  onClick={() => handlePermissionChange(role, permKey, !isEnabled)}
                                  className={`relative w-10 h-5 rounded-full transition-colors ${
                                    isEnabled ? 'bg-brand-cyan-600' : 'bg-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                      isEnabled ? 'translate-x-5' : ''
                                    }`}
                                  />
                                </button>
                              </label>
                            );
                          })}
                          {hasChanges && (
                            <button
                              onClick={() => handleSavePermissions(role)}
                              disabled={updatePermissionsMutation.isPending}
                              className="mt-2 w-full px-3 py-1.5 text-sm bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {availableRolesToAdd.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Add Role</h4>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedRoleToAdd}
                    onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-cyan-500"
                  >
                    <option value="">Select a role...</option>
                    {availableRolesToAdd.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.value.charAt(0).toUpperCase() + role.value.slice(1)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <button
                  onClick={handleAddRole}
                  disabled={!selectedRoleToAdd || assignRoleMutation.isPending}
                  className="px-4 py-2 bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const UserManagement: React.FC = () => {
  const { userRole } = useAuth();
  const toast = useToast();

  const { data: users, isLoading: isLoadingUsers, error: usersError } = useUsersQuery();
  const { data: pendingUsers, isLoading: isLoadingPending } = usePendingUsersQuery();
  const { data: rolesConfig, isLoading: isLoadingRoles } = useRolesConfigQuery();

  const approveMutation = useApproveUserMutation();
  const rejectMutation = useRejectUserMutation();

  const [approveModalUser, setApproveModalUser] = useState<PendingUser | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  if (userRole !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleApprove = async (role: string) => {
    if (!approveModalUser) return;
    try {
      await approveMutation.mutateAsync({ userId: approveModalUser.id, role });
      toast.success('User approved', `${getUserDisplayName(approveModalUser)} has been approved as ${role}`);
      setApproveModalUser(null);
    } catch (err: any) {
      toast.error('Failed to approve user', err.message);
    }
  };

  const handleReject = async (user: PendingUser) => {
    if (!window.confirm(`Reject ${getUserDisplayName(user)}?`)) return;
    try {
      await rejectMutation.mutateAsync({ userId: user.id });
      toast.success('User rejected', `${getUserDisplayName(user)} has been rejected`);
    } catch (err: any) {
      toast.error('Failed to reject user', err.message);
    }
  };

  const isLoading = isLoadingUsers || isLoadingPending || isLoadingRoles;

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-cyan-500/20 rounded-lg">
          <Users className="w-6 h-6 text-brand-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-gray-400">Manage users, approve signups, and assign roles</p>
        </div>
      </div>

      {usersError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">Failed to load users. Please try again.</span>
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Pending Approvals</h2>
            {pendingUsers && pendingUsers.length > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-medium rounded-full">
                {pendingUsers.length} pending
              </span>
            )}
          </div>

          {isLoadingPending ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-brand-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Loading pending users...</p>
            </div>
          ) : !pendingUsers || pendingUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-400">No pending approvals</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Signed Up</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.profile_image_url ? (
                            <img src={user.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium text-white">
                              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </div>
                          )}
                          <span className="text-white font-medium">{getUserDisplayName(user)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setApproveModalUser(user)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(user)}
                            disabled={rejectMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-300 hover:text-red-200 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
            <Shield className="w-5 h-5 text-brand-cyan-400" />
            <h2 className="text-lg font-semibold text-white">All Users</h2>
            {users && (
              <span className="ml-auto text-sm text-gray-400">{users.length} users</span>
            )}
          </div>

          {isLoadingUsers ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-brand-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Loading users...</p>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Roles</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.profile_image_url ? (
                            <img src={user.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium text-white">
                              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </div>
                          )}
                          <span className="text-white font-medium">{getUserDisplayName(user)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          {user.roles.length === 0 ? (
                            <span className="text-gray-500 text-sm">No roles</span>
                          ) : (
                            user.roles.map((role) => <RoleBadge key={role} role={role} />)
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setEditingUserId(user.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {approveModalUser && rolesConfig && (
        <ApproveModal
          user={approveModalUser}
          roles={rolesConfig.roles}
          onConfirm={handleApprove}
          onCancel={() => setApproveModalUser(null)}
          isLoading={approveMutation.isPending}
        />
      )}

      {editingUserId && rolesConfig && (
        <EditUserModal
          userId={editingUserId}
          roles={rolesConfig.roles}
          configurablePermissions={rolesConfig.configurablePermissions}
          onClose={() => setEditingUserId(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;
