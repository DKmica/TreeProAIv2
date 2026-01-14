import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkOrder, WorkOrderStage } from '../types';
import { workOrderService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { Briefcase, Filter, Search, Plus, X } from 'lucide-react';

const JOB_STAGES: WorkOrderStage[] = ['scheduled', 'in_progress', 'complete', 'invoiced'];

const WorkOrderJobs: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [stageFilter, setStageFilter] = useState<WorkOrderStage | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    description: '',
    scheduledDate: '',
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const clientId = searchParams.get('clientId') || undefined;
        const result = await workOrderService.getAll({ clientId, pageSize: 300 });
        setWorkOrders(result.data.filter((wo) => JOB_STAGES.includes(wo.stage)));
      } catch (err: any) {
        console.error('Failed to load jobs from work orders', err);
        setError(err.message || 'Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [searchParams]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.clientName,
          specialInstructions: formData.description,
          scheduledDate: formData.scheduledDate || undefined,
          status: 'scheduled',
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create job');
      }
      const data = await response.json();
      setShowCreateModal(false);
      setFormData({ title: '', clientName: '', description: '', scheduledDate: '' });
      navigate(`/jobs/${data.data?.id || data.id}`);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchesStage = stageFilter === 'all' || wo.stage === stageFilter;
      const matchesSearch = !searchTerm ||
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStage && matchesSearch;
    });
  }, [searchTerm, stageFilter, workOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerIcon className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-gray-400">Scheduled, active, and completed jobs from work orders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as WorkOrderStage | 'all')}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All stages</option>
              {JOB_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">{error}</div>
      )}

      <div className="space-y-3">
        {filtered.map((job) => (
          <div
            key={job.id}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/60 transition cursor-pointer"
            onClick={() => navigate(`/work-orders/${job.id}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{job.title || 'Job'}</h3>
                <p className="text-sm text-gray-400">{job.clientName || 'Unknown client'}</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-200 capitalize">
                {job.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-gray-300 text-sm">
              <Briefcase className="w-4 h-4" />
              {job.description || 'Job generated from work order'}
            </div>
            <div className="text-xs text-gray-500 mt-2">Updated {new Date(job.updatedAt).toLocaleDateString()}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !error && (
        <div className="text-center text-gray-500 py-10">No jobs found in the work order pipeline</div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Create New Job</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {createError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Tree Removal - Oak"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Work details..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600"
                >
                  {creating ? <SpinnerIcon className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {creating ? 'Creating...' : 'Create Job'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderJobs;
