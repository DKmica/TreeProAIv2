import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { WorkOrder, WorkOrderStage, WorkOrderStageSummary, WorkOrderEvent, Lead, Quote, Job } from '../types';
import { leadService, workOrderService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Briefcase, Users, ClipboardList, Truck, CheckCircle, XCircle,
  ChevronRight, Search, Filter, ArrowLeft, Clock, Calendar,
  DollarSign, FileText, MapPin, LayoutGrid, List, Plus,
} from 'lucide-react';

const STAGE_CONFIG: Record<WorkOrderStage, { label: string; dotColor: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  lead:        { label: 'Lead',        dotColor: 'bg-blue-500',    color: 'text-blue-400',   bgColor: 'bg-blue-500/10 border-blue-500/20',    icon: <Users className="w-3.5 h-3.5" /> },
  quoting:     { label: 'Quoting',     dotColor: 'bg-yellow-500',  color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  scheduled:   { label: 'Scheduled',   dotColor: 'bg-purple-500',  color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', icon: <Briefcase className="w-3.5 h-3.5" /> },
  in_progress: { label: 'In Progress', dotColor: 'bg-brand-cyan-500', color: 'text-brand-cyan-400', bgColor: 'bg-brand-cyan-500/10 border-brand-cyan-500/20', icon: <Truck className="w-3.5 h-3.5" /> },
  complete:    { label: 'Complete',    dotColor: 'bg-green-500',   color: 'text-green-400',  bgColor: 'bg-green-500/10 border-green-500/20',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  invoiced:    { label: 'Invoiced',    dotColor: 'bg-amber-400',   color: 'text-amber-400',  bgColor: 'bg-amber-500/10 border-amber-500/20',  icon: <DollarSign className="w-3.5 h-3.5" /> },
  lost:        { label: 'Lost',        dotColor: 'bg-red-500',     color: 'text-red-400',    bgColor: 'bg-red-500/10 border-red-500/20',      icon: <XCircle className="w-3.5 h-3.5" /> },
};

const ALL_STAGES: WorkOrderStage[] = ['lead', 'quoting', 'scheduled', 'in_progress', 'complete', 'invoiced', 'lost'];

const formatCurrency = (value?: number) => {
  if (!value) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high:   'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low:    'bg-brand-gray-700 text-brand-gray-400',
};

const WorkOrderDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [timeline, setTimeline] = useState<WorkOrderEvent[]>([]);
  const [sourceLead, setSourceLead] = useState<Lead | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [wo, events] = await Promise.all([workOrderService.getById(id), workOrderService.getTimeline(id)]);
        setWorkOrder(wo);
        setTimeline(events);
        if (wo.sourceLeadId) {
          try { setSourceLead(await leadService.getById(wo.sourceLeadId)); } catch { setSourceLead(null); }
        }
        try {
          const [relatedQuotes, relatedJobs] = await Promise.all([workOrderService.getQuotes(id), workOrderService.getJobs(id)]);
          setQuotes(relatedQuotes);
          setJobs(relatedJobs);
        } catch { setQuotes([]); setJobs([]); }
      } catch (err: any) {
        setError(err.message || 'Failed to load work order');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleStageChange = async (newStage: WorkOrderStage) => {
    if (!workOrder) return;
    try {
      const updated = await workOrderService.changeStage(workOrder.id, newStage);
      setWorkOrder(updated);
      setTimeline(await workOrderService.getTimeline(id));
    } catch (err: any) {
      alert(err.message || 'Failed to change stage');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-brand-gray-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Pipeline
        </button>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error || 'Work order not found'}
        </div>
      </div>
    );
  }

  const config = STAGE_CONFIG[workOrder.stage];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-brand-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Pipeline
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {workOrder.title || workOrder.clientName || 'Untitled Work Order'}
                  </h2>
                  {workOrder.clientName && workOrder.title && (
                    <p className="text-brand-gray-400 text-sm">{workOrder.clientName}</p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.color}`}>
                  {config.icon} {config.label}
                </span>
              </div>

              {workOrder.description && (
                <div className="mb-4 p-3 rounded-lg bg-brand-gray-900/50 border border-brand-gray-700/50">
                  <p className="text-xs font-medium text-brand-gray-400 mb-1">Description</p>
                  <p className="text-sm text-brand-gray-200">{workOrder.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: DollarSign, label: 'Estimated Value', value: formatCurrency(workOrder.estimatedValue), highlight: true },
                  { icon: Calendar, label: 'Created', value: new Date(workOrder.createdAt).toLocaleDateString(), highlight: false },
                  { icon: FileText, label: 'Quotes', value: workOrder.quotesCount || 0, highlight: false },
                  { icon: Briefcase, label: 'Jobs', value: workOrder.jobsCount || 0, highlight: false },
                ].map(({ icon: Icon, label, value, highlight }) => (
                  <div key={label} className="p-3 rounded-lg bg-brand-gray-900/50 border border-brand-gray-700/50">
                    <div className="flex items-center gap-1.5 text-brand-gray-400 text-xs mb-1">
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </div>
                    <div className={`font-semibold text-sm ${highlight ? 'text-brand-cyan-400' : 'text-white'}`}>{value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white font-semibold text-sm">Change Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ALL_STAGES.map(stage => {
                  const sc = STAGE_CONFIG[stage];
                  const isActive = workOrder.stage === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => !isActive && handleStageChange(stage)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isActive
                          ? `${sc.bgColor} ${sc.color} ring-1 ring-current`
                          : 'bg-brand-gray-800 border-brand-gray-700 text-brand-gray-400 hover:border-brand-gray-600 hover:text-white'
                      } ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {sc.icon} {sc.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {quotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white font-semibold text-sm">Linked Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quotes.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-brand-gray-900/50 border border-brand-gray-700/50">
                      <div className="text-sm text-white">{q.title || `Quote #${q.id?.slice(0,8)}`}</div>
                      <div className="flex items-center gap-3">
                        {q.totalAmount && <span className="text-brand-cyan-400 text-sm font-medium">{formatCurrency(q.totalAmount)}</span>}
                        <button onClick={() => navigate(`/quotes/${q.id}`)} className="text-xs text-brand-cyan-400 hover:text-brand-cyan-300 flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white font-semibold text-sm">Linked Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {jobs.map((j: any) => (
                    <div key={j.id} className="flex items-center justify-between p-3 rounded-lg bg-brand-gray-900/50 border border-brand-gray-700/50">
                      <div>
                        <div className="text-sm text-white">{j.title || j.serviceType || `Job #${j.id?.slice(0,8)}`}</div>
                        {j.scheduledDate && (
                          <div className="text-xs text-brand-gray-400 mt-0.5">
                            {new Date(j.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STAGE_CONFIG[j.status as WorkOrderStage]?.bgColor || 'bg-brand-gray-700 border-brand-gray-600'} ${STAGE_CONFIG[j.status as WorkOrderStage]?.color || 'text-brand-gray-300'}`}>
                        {j.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {sourceLead && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white font-semibold text-sm">Source Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {(sourceLead as any).contactName && (
                    <div className="flex items-center gap-2 text-brand-gray-300">
                      <Users className="w-3.5 h-3.5 text-brand-gray-500" />
                      {(sourceLead as any).contactName}
                    </div>
                  )}
                  {(sourceLead as any).contactEmail && (
                    <div className="flex items-center gap-2 text-brand-gray-300">
                      <FileText className="w-3.5 h-3.5 text-brand-gray-500" />
                      {(sourceLead as any).contactEmail}
                    </div>
                  )}
                  {(sourceLead as any).contactPhone && (
                    <div className="text-brand-gray-300">{(sourceLead as any).contactPhone}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-white font-semibold text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-brand-gray-500 text-center py-4">No events yet</p>
              ) : (
                <div className="space-y-3">
                  {timeline.slice(0, 10).map((event, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-brand-cyan-500 mt-1 flex-shrink-0" />
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-brand-gray-700 mt-1" />}
                      </div>
                      <div className="pb-3 min-w-0">
                        <p className="text-xs text-brand-gray-200">{(event as any).description || (event as any).eventType?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-brand-gray-500 mt-0.5">
                          {new Date((event as any).createdAt || (event as any).timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const WorkOrders: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [summary, setSummary] = useState<WorkOrderStageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<WorkOrderStage | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const clientId = searchParams.get('clientId');
        const params = clientId ? { clientId, pageSize: 500 } : { pageSize: 500 };
        const [result, summaryData] = await Promise.all([
          workOrderService.getAll(params),
          workOrderService.getSummary(),
        ]);
        setWorkOrders(result.data);
        setSummary(summaryData);
      } catch (err: any) {
        setError(err.message || 'Failed to load work orders');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [searchParams]);

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
      lead: [], quoting: [], scheduled: [], in_progress: [], complete: [], invoiced: [], lost: [],
    };
    filteredWorkOrders.forEach(wo => { if (grouped[wo.stage]) grouped[wo.stage].push(wo); });
    return grouped;
  }, [filteredWorkOrders]);

  const handleStageChange = async (workOrderId: string, newStage: WorkOrderStage) => {
    try {
      const updated = await workOrderService.changeStage(workOrderId, newStage);
      setWorkOrders(prev => prev.map(wo => wo.id === workOrderId ? updated : wo));
      setSummary(await workOrderService.getSummary());
    } catch (err: any) {
      alert(err.message || 'Failed to change stage');
    }
  };

  if (id) {
    return <WorkOrderDetail id={id} onBack={() => navigate('/work-orders')} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {ALL_STAGES.map(stage => {
          const config = STAGE_CONFIG[stage];
          const stageData = summary.find(s => s.stage === stage);
          const isActive = stageFilter === stage;
          return (
            <button
              key={stage}
              onClick={() => setStageFilter(isActive ? 'all' : stage)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? `${config.bgColor} ${config.color} ring-1 ring-current`
                  : 'bg-brand-gray-800/50 border-brand-gray-700 hover:border-brand-gray-600'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                <span className={`text-xs font-medium ${isActive ? config.color : 'text-brand-gray-300'}`}>{config.label}</span>
              </div>
              <div className="text-2xl font-bold text-white leading-none">{stageData?.count || 0}</div>
              <div className="text-xs text-brand-gray-500 mt-1">{formatCurrency(stageData?.totalValue)}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-500" />
          <input
            type="text"
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-brand-gray-800 border border-brand-gray-700 rounded-lg text-white placeholder-brand-gray-500 focus:outline-none focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-brand-gray-800 border border-brand-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'pipeline' ? 'bg-brand-cyan-600 text-white' : 'text-brand-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Pipeline
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-brand-cyan-600 text-white' : 'text-brand-gray-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>

        {stageFilter !== 'all' && (
          <button
            onClick={() => setStageFilter('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-gray-800 border border-brand-gray-700 text-brand-gray-300 rounded-lg hover:border-brand-gray-600 hover:text-white transition-colors"
          >
            <Filter className="w-3.5 h-3.5" /> Clear filter
          </button>
        )}
      </div>

      {viewMode === 'pipeline' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {ALL_STAGES
            .filter(stage => stageFilter === 'all' || stageFilter === stage)
            .map(stage => {
              const config = STAGE_CONFIG[stage];
              const stageOrders = workOrdersByStage[stage];
              return (
                <div key={stage} className="w-72 flex-shrink-0 flex flex-col bg-brand-gray-800/30 border border-brand-gray-700 rounded-xl">
                  <div className="p-3 border-b border-brand-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                      <span className="text-sm font-medium text-white">{config.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-gray-700 text-brand-gray-300">{stageOrders.length}</span>
                    </div>
                    <span className="text-xs text-brand-gray-500">
                      {formatCurrency(stageOrders.reduce((s, wo) => s + (wo.estimatedValue || 0), 0))}
                    </span>
                  </div>

                  <div className="flex-1 p-2 space-y-2 min-h-[300px] overflow-y-auto">
                    {stageOrders.map(wo => (
                      <div
                        key={wo.id}
                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                        className="bg-brand-gray-800 border border-brand-gray-700 rounded-lg p-3 cursor-pointer hover:border-brand-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <h4 className="text-sm font-medium text-white line-clamp-1 flex-1">
                            {wo.title || wo.clientName || 'Untitled'}
                          </h4>
                          {wo.priority && (
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${priorityColors[wo.priority] || priorityColors.low}`}>
                              {wo.priority}
                            </span>
                          )}
                        </div>
                        {wo.clientName && wo.title && (
                          <p className="text-xs text-brand-gray-400 mb-2">{wo.clientName}</p>
                        )}
                        <div className="flex items-center justify-between">
                          {wo.estimatedValue ? (
                            <span className="text-sm font-semibold text-brand-cyan-400">{formatCurrency(wo.estimatedValue)}</span>
                          ) : <span />}
                          <div className="flex items-center gap-1.5 text-xs text-brand-gray-500">
                            {wo.quotesCount > 0 && <span>{wo.quotesCount}q</span>}
                            {wo.jobsCount > 0 && <span>{wo.jobsCount}j</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {stageOrders.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-xs text-brand-gray-600">
                        No work orders
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-gray-700">
                  <th className="px-5 py-3 text-left text-xs font-medium text-brand-gray-400 uppercase tracking-wider">Title / Client</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-brand-gray-400 uppercase tracking-wider">Stage</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-brand-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-brand-gray-400 uppercase tracking-wider hidden sm:table-cell">Priority</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-brand-gray-400 uppercase tracking-wider hidden md:table-cell">Q / J</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-brand-gray-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray-700/50">
                {filteredWorkOrders.map(wo => {
                  const config = STAGE_CONFIG[wo.stage];
                  return (
                    <tr
                      key={wo.id}
                      onClick={() => navigate(`/work-orders/${wo.id}`)}
                      className="hover:bg-brand-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium text-white">{wo.title || wo.clientName || 'Untitled'}</div>
                        {wo.clientName && wo.title && <div className="text-xs text-brand-gray-400 mt-0.5">{wo.clientName}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-brand-cyan-400 font-medium">{formatCurrency(wo.estimatedValue)}</td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {wo.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${priorityColors[wo.priority] || priorityColors.low}`}>
                            {wo.priority}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-brand-gray-400 hidden md:table-cell">{wo.quotesCount} / {wo.jobsCount}</td>
                      <td className="px-5 py-3.5 text-xs text-brand-gray-400 hidden lg:table-cell">
                        {new Date(wo.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {filteredWorkOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-brand-gray-500">
                      No work orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default WorkOrders;
