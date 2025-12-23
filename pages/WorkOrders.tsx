import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkOrder, WorkOrderStage, WorkOrderStageSummary, WorkOrderEvent } from '../types';
import { workOrderService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { Briefcase, Users, ClipboardList, Truck, CheckCircle, XCircle, ChevronRight, Search, Filter, ArrowLeft, Clock, Calendar, DollarSign, User, FileText, MapPin } from 'lucide-react';

const STAGE_CONFIG: Record<WorkOrderStage, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  lead: { label: 'Lead', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <Users className="w-4 h-4" /> },
  quoting: { label: 'Quoting', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: <ClipboardList className="w-4 h-4" /> },
  scheduled: { label: 'Scheduled', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: <Briefcase className="w-4 h-4" /> },
  in_progress: { label: 'In Progress', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', icon: <Truck className="w-4 h-4" /> },
  complete: { label: 'Complete', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: <CheckCircle className="w-4 h-4" /> },
  lost: { label: 'Lost', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: <XCircle className="w-4 h-4" /> }
};

const ALL_STAGES: WorkOrderStage[] = ['lead', 'quoting', 'scheduled', 'in_progress', 'complete', 'lost'];

const WorkOrderDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [timeline, setTimeline] = useState<WorkOrderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [wo, events] = await Promise.all([
          workOrderService.getById(id),
          workOrderService.getTimeline(id)
        ]);
        setWorkOrder(wo);
        setTimeline(events);
      } catch (err: any) {
        console.error('Error loading work order:', err);
        setError(err.message || 'Failed to load work order');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleStageChange = async (newStage: WorkOrderStage) => {
    if (!workOrder) return;
    try {
      const updated = await workOrderService.changeStage(workOrder.id, newStage);
      setWorkOrder(updated);
      const events = await workOrderService.getTimeline(id);
      setTimeline(events);
    } catch (err: any) {
      alert(err.message || 'Failed to change stage');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerIcon className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Pipeline
        </button>
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
          {error || 'Work order not found'}
        </div>
      </div>
    );
  }

  const config = STAGE_CONFIG[workOrder.stage];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Pipeline
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {workOrder.title || workOrder.clientName || 'Untitled Work Order'}
                </h1>
                {workOrder.clientName && workOrder.title && (
                  <p className="text-gray-400">{workOrder.clientName}</p>
                )}
              </div>
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${config.color}`}>
                {config.icon}
                {config.label}
              </span>
            </div>

            {workOrder.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                <p className="text-white">{workOrder.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  Estimated Value
                </div>
                <div className="text-cyan-400 font-semibold">
                  {formatCurrency(workOrder.estimatedValue)}
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  Created
                </div>
                <div className="text-white font-medium">
                  {new Date(workOrder.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <FileText className="w-4 h-4" />
                  Quotes
                </div>
                <div className="text-white font-medium">{workOrder.quotesCount || 0}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Briefcase className="w-4 h-4" />
                  Jobs
                </div>
                <div className="text-white font-medium">{workOrder.jobsCount || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Change Stage</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_STAGES.map(stage => {
                const stageConfig = STAGE_CONFIG[stage];
                const isActive = workOrder.stage === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => !isActive && handleStageChange(stage)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? `${stageConfig.bgColor} ${stageConfig.color} ring-2 ring-offset-2 ring-offset-gray-800 ring-current`
                        : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                    }`}
                  >
                    {stageConfig.icon}
                    {stageConfig.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timeline
            </h3>
            {timeline.length > 0 ? (
              <div className="space-y-4">
                {timeline.map((event) => (
                  <div key={event.id} className="relative pl-6 pb-4 border-l-2 border-gray-700 last:border-transparent last:pb-0">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-cyan-500" />
                    <div className="text-sm text-gray-400 mb-1">
                      {new Date(event.occurredAt).toLocaleString()}
                    </div>
                    <div className="text-white font-medium capitalize">
                      {event.eventType.replace(/_/g, ' ')}
                    </div>
                    {event.actorName && (
                      <div className="text-gray-400 text-sm mt-1">by {event.actorName}</div>
                    )}
                    {event.payload?.from && event.payload?.to && (
                      <div className="text-xs text-gray-500 mt-1">
                        {event.payload.from} → {event.payload.to}
                      </div>
                    )}
                    {event.payload?.description && (
                      <div className="text-gray-400 text-sm mt-1">{event.payload.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No events yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkOrders: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [summary, setSummary] = useState<WorkOrderStageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<WorkOrderStage | 'all'>('all');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  useEffect(() => {
    if (id) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [ordersResult, summaryData] = await Promise.all([
          workOrderService.getAll({ pageSize: 100 }),
          workOrderService.getSummary()
        ]);
        setWorkOrders(ordersResult.data);
        setSummary(summaryData);
      } catch (err: any) {
        console.error('Error loading work orders:', err);
        setError(err.message || 'Failed to load work orders');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (id) {
    return <WorkOrderDetail id={id} onBack={() => navigate('/work-orders')} />;
  }

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchesStage = stageFilter === 'all' || wo.stage === stageFilter;
      const matchesSearch = !searchTerm || 
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStage && matchesSearch;
    });
  }, [workOrders, stageFilter, searchTerm]);

  const workOrdersByStage = useMemo(() => {
    const grouped: Record<WorkOrderStage, WorkOrder[]> = {
      lead: [],
      quoting: [],
      scheduled: [],
      in_progress: [],
      complete: [],
      lost: []
    };

    filteredWorkOrders.forEach(wo => {
      if (grouped[wo.stage]) {
        grouped[wo.stage].push(wo);
      }
    });

    return grouped;
  }, [filteredWorkOrders]);

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleStageChange = async (workOrderId: string, newStage: WorkOrderStage) => {
    try {
      const updated = await workOrderService.changeStage(workOrderId, newStage);
      setWorkOrders(prev => prev.map(wo => wo.id === workOrderId ? updated : wo));
      const newSummary = await workOrderService.getSummary();
      setSummary(newSummary);
    } catch (err: any) {
      console.error('Error changing stage:', err);
      alert(err.message || 'Failed to change stage');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerIcon className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Work Orders Pipeline</h1>
        <p className="text-gray-400">Track opportunities from lead to completion</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {(['lead', 'quoting', 'scheduled', 'in_progress', 'complete', 'lost'] as WorkOrderStage[]).map(stage => {
          const config = STAGE_CONFIG[stage];
          const stageData = summary.find(s => s.stage === stage);
          return (
            <div
              key={stage}
              onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                stageFilter === stage ? 'ring-2 ring-cyan-500' : ''
              } ${config.bgColor} hover:opacity-80`}
            >
              <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                {config.icon}
                <span className="font-medium text-sm">{config.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stageData?.count || 0}
              </div>
              <div className="text-sm text-gray-400">
                {formatCurrency(stageData?.totalValue)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'pipeline'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            List
          </button>
        </div>

        {stageFilter !== 'all' && (
          <button
            onClick={() => setStageFilter('all')}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear Filter
          </button>
        )}
      </div>

      {viewMode === 'pipeline' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto">
          {ALL_STAGES
            .filter(stage => stageFilter === 'all' || stageFilter === stage)
            .map(stage => {
              const config = STAGE_CONFIG[stage];
              const stageOrders = workOrdersByStage[stage];

              return (
                <div key={stage} className="bg-gray-800 rounded-lg p-4 min-h-[400px]">
                  <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-gray-700 ${config.color}`}>
                    {config.icon}
                    <span className="font-semibold">{config.label}</span>
                    <span className="ml-auto bg-gray-700 px-2 py-0.5 rounded text-sm text-gray-300">
                      {stageOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stageOrders.map(wo => (
                      <div
                        key={wo.id}
                        className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium text-sm line-clamp-1">
                            {wo.title || wo.clientName || 'Untitled'}
                          </h4>
                          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </div>
                        {wo.clientName && wo.title && (
                          <p className="text-gray-400 text-xs mb-2">{wo.clientName}</p>
                        )}
                        {wo.estimatedValue && (
                          <div className="text-cyan-400 text-sm font-medium">
                            {formatCurrency(wo.estimatedValue)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          {wo.quotesCount > 0 && (
                            <span className="bg-gray-600 px-2 py-0.5 rounded">
                              {wo.quotesCount} quote{wo.quotesCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {wo.jobsCount > 0 && (
                            <span className="bg-gray-600 px-2 py-0.5 rounded">
                              {wo.jobsCount} job{wo.jobsCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageOrders.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No work orders in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title / Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Quotes / Jobs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredWorkOrders.map(wo => {
                const config = STAGE_CONFIG[wo.stage];
                return (
                  <tr
                    key={wo.id}
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                    className="hover:bg-gray-700/50 cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div className="text-white font-medium">
                        {wo.title || wo.clientName || 'Untitled'}
                      </div>
                      {wo.clientName && wo.title && (
                        <div className="text-gray-400 text-sm">{wo.clientName}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-cyan-400">
                      {formatCurrency(wo.estimatedValue)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm capitalize ${
                        wo.priority === 'urgent' ? 'text-red-400' :
                        wo.priority === 'high' ? 'text-orange-400' :
                        wo.priority === 'medium' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">
                      {wo.quotesCount} / {wo.jobsCount}
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}

              {filteredWorkOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No work orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;
