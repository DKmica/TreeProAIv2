import React, { useState, useEffect } from 'react';
import { Crew, CrewMember, Employee } from '../types';
import { crewService } from '../services/apiService';
import XIcon from './icons/XIcon';
import SpinnerIcon from './icons/SpinnerIcon';

interface CrewMemberManagerProps {
  crew: Crew;
  isOpen: boolean;
  onClose: () => void;
}

const CrewMemberManager: React.FC<CrewMemberManagerProps> = ({ crew, isOpen, onClose }) => {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedRole, setSelectedRole] = useState('climber');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const roles = ['leader', 'climber', 'groundsman', 'driver'];

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchUnassignedEmployees();
    }
  }, [isOpen, crew.id]);

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    setError(null);
    try {
      const membersData = await crewService.getMembers(crew.id);
      setMembers(membersData);
    } catch (err: any) {
      console.error('Error fetching crew members:', err);
      setError(err.message || 'Failed to load crew members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchUnassignedEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const employeesData = await crewService.getUnassignedEmployees();
      setUnassignedEmployees(employeesData);
    } catch (err: any) {
      console.error('Error fetching unassigned employees:', err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedEmployeeId) return;

    setIsAddingMember(true);
    setError(null);

    try {
      await crewService.addMember(crew.id, {
        employeeId: selectedEmployeeId,
        role: selectedRole,
      });

      setSelectedEmployeeId('');
      setSelectedRole('climber');
      
      await fetchMembers();
      await fetchUnassignedEmployees();
    } catch (err: any) {
      console.error('Error adding crew member:', err);
      setError(err.message || 'Failed to add crew member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setUpdatingMemberId(memberId);
    setError(null);

    try {
      await crewService.updateMemberRole(crew.id, memberId, newRole);
      await fetchMembers();
    } catch (err: any) {
      console.error('Error updating member role:', err);
      setError(err.message || 'Failed to update member role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the crew?')) {
      return;
    }

    setRemovingMemberId(memberId);
    setError(null);

    try {
      await crewService.removeMember(crew.id, memberId);
      await fetchMembers();
      await fetchUnassignedEmployees();
    } catch (err: any) {
      console.error('Error removing crew member:', err);
      setError(err.message || 'Failed to remove crew member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            Manage Crew Members - {crew.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Current Members</h3>
            
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <SpinnerIcon className="h-8 w-8 text-cyan-500" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No members in this crew yet.</p>
                <p className="text-sm mt-2">Add members below to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {member.employee?.name || 'Unknown Employee'}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Joined {formatDate(member.joinedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-40">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          disabled={updatingMemberId === member.id}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMemberId === member.id}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {removingMemberId === member.id ? (
                          <>
                            <SpinnerIcon className="h-4 w-4 mr-1" />
                            Removing...
                          </>
                        ) : (
                          'Remove'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Add Member</h3>
            
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center py-4">
                <SpinnerIcon className="h-6 w-6 text-cyan-500" />
              </div>
            ) : unassignedEmployees.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <p>No unassigned employees available.</p>
                <p className="text-sm mt-2">All employees are currently assigned to crews.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="employee" className="block text-sm font-medium text-gray-300 mb-1">
                      Employee
                    </label>
                    <select
                      id="employee"
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="">Select an employee...</option>
                      {unassignedEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.jobTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
                      Role
                    </label>
                    <select
                      id="role"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAddMember}
                  disabled={!selectedEmployeeId || isAddingMember}
                  className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAddingMember ? (
                    <>
                      <SpinnerIcon className="h-4 w-4 mr-2" />
                      Adding Member...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrewMemberManager;
