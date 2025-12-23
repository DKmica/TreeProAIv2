import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkOrder, WorkOrderStage } from '../types';
import { workOrderService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { Briefcase, Filter, Search } from 'lucide-react';

const JOB_STAGES: WorkOrderStage[] = ['scheduled', 'in_progress', 'complete', 'invoiced'];

const WorkOrderJobs: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [stageFilter, setStageFilter] = useState<WorkOrderStage | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};

export default WorkOrderJobs;
