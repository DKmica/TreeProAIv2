import React, { useState, useEffect } from 'react';
import SpinnerIcon from '../components/icons/SpinnerIcon';

interface Stump {
  id: string;
  jobId?: string;
  jobNumber?: string;
  stumpNumber: string;
  locationDescription?: string;
  treeSpecies?: string;
  diameterInches: number;
  estimatedDepthInches: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  completionPhotoUrl?: string;
  notes?: string;
  customerName?: string;
  jobLocation?: string;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  jobTitle: string;
}

interface StumpStats {
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  total: number;
}

const StumpGrinding: React.FC = () => {
  const [stumps, setStumps] = useState<Stump[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<StumpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedStump, setSelectedStump] = useState<Stump | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      
      const [stumpsRes, employeesRes, statsRes] = await Promise.all([
        fetch(`/api/stumps?${params}`),
        fetch('/api/stump-grinders'),
        fetch('/api/stumps/summary/stats')
      ]);

      if (stumpsRes.ok) {
        const data = await stumpsRes.json();
        setStumps(data);
      }
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stump data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStump || !assignEmployeeId) return;
    
    try {
      setProcessing(true);
      const res = await fetch(`/api/stumps/${selectedStump.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: assignEmployeeId })
      });
      
      if (res.ok) {
        setShowAssignModal(false);
        setSelectedStump(null);
        setAssignEmployeeId('');
        fetchData();
      } else {
        alert('Failed to assign stump');
      }
    } catch (error) {
      console.error('Error assigning stump:', error);
      alert('Failed to assign stump');
    } finally {
      setProcessing(false);
    }
  };

  const handleStart = async (stump: Stump) => {
    try {
      const res = await fetch(`/api/stumps/${stump.id}/start`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error starting stump:', error);
    }
  };

  const handleComplete = async () => {
    if (!selectedStump) return;
    
    try {
      setProcessing(true);
      const formData = new FormData();
      if (completionPhoto) {
        formData.append('photo', completionPhoto);
      }
      if (completionNotes) {
        formData.append('notes', completionNotes);
      }
      
      const res = await fetch(`/api/stumps/${selectedStump.id}/complete`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        setShowCompleteModal(false);
        setSelectedStump(null);
        setCompletionNotes('');
        setCompletionPhoto(null);
        fetchData();
      } else {
        alert('Failed to complete stump');
      }
    } catch (error) {
      console.error('Error completing stump:', error);
      alert('Failed to complete stump');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-8 w-8 text-brand-cyan-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">Stump Grinding</h1>
          <p className="mt-1 text-sm text-brand-gray-600">Track and manage stump grinding work</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-brand-gray-500">Pending</p>
            <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-brand-gray-500">Assigned</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.assigned}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-brand-gray-500">In Progress</p>
            <p className="text-2xl font-semibold text-purple-600">{stats.in_progress}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-brand-gray-500">Completed</p>
            <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-brand-gray-500">Total</p>
            <p className="text-2xl font-semibold text-brand-gray-900">{stats.total}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-brand-gray-200">
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-gray-200">
            <thead className="bg-brand-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Stump #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-gray-200">
              {stumps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-brand-gray-500">
                    No stumps found. Stumps are automatically created when a tree removal job with stump grinding is completed.
                  </td>
                </tr>
              ) : (
                stumps.map(stump => (
                  <tr key={stump.id} className="hover:bg-brand-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">
                      {stump.stumpNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                      {stump.jobNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                      {stump.customerName || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-gray-900 max-w-xs truncate">
                      {stump.jobLocation || stump.locationDescription || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                      {stump.diameterInches ? `${stump.diameterInches}" dia` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-900">
                      {stump.assignedToName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(stump.status)}`}>
                        {stump.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {stump.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedStump(stump);
                            setShowAssignModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Assign
                        </button>
                      )}
                      {stump.status === 'assigned' && (
                        <button
                          onClick={() => handleStart(stump)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          Start
                        </button>
                      )}
                      {stump.status === 'in_progress' && (
                        <button
                          onClick={() => {
                            setSelectedStump(stump);
                            setShowCompleteModal(true);
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          Complete
                        </button>
                      )}
                      {stump.status === 'completed' && stump.completionPhotoUrl && (
                        <a
                          href={stump.completionPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-cyan-600 hover:text-brand-cyan-800"
                        >
                          View Photo
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAssignModal && selectedStump && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">
              Assign Stump Grinder
            </h3>
            <p className="text-sm text-brand-gray-600 mb-4">
              Stump: {selectedStump.stumpNumber}<br />
              Location: {selectedStump.jobLocation || selectedStump.locationDescription || 'N/A'}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                Assign To
              </label>
              <select
                value={assignEmployeeId}
                onChange={e => setAssignEmployeeId(e.target.value)}
                className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
              >
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobTitle})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStump(null);
                  setAssignEmployeeId('');
                }}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 hover:text-brand-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignEmployeeId || processing}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-cyan-600 rounded-md hover:bg-brand-cyan-700 disabled:bg-gray-400"
              >
                {processing ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && selectedStump && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">
              Complete Stump Grinding
            </h3>
            <p className="text-sm text-brand-gray-600 mb-4">
              Stump: {selectedStump.stumpNumber}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                Completion Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setCompletionPhoto(e.target.files?.[0] || null)}
                className="w-full text-sm text-brand-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-cyan-50 file:text-brand-cyan-700 hover:file:bg-brand-cyan-100"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white"
                placeholder="Any notes about the completed work..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedStump(null);
                  setCompletionNotes('');
                  setCompletionPhoto(null);
                }}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 hover:text-brand-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {processing ? 'Completing...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StumpGrinding;
