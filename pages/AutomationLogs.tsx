import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  ArrowLeft, 
  Search, 
  Filter, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react';
import { 
  automationLogService, 
  workflowService,
  AutomationLog, 
  AutomationLogStats,
  Workflow,
  TRIGGER_TYPES,
  ACTION_TYPES
} from '../services/workflowService';

const AutomationLogs: React.FC = () => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<AutomationLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    workflow_id: '',
    status: '' as '' | 'completed' | 'failed' | 'running' | 'skipped',
    start_date: '',
    end_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [page, filters]);

  const loadWorkflows = async () => {
    try {
      const response = await workflowService.getWorkflows();
      setWorkflows(response.data);
    } catch (err: any) {
      console.error('Failed to load workflows:', err);
    }
  };

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const response = await automationLogService.getLogs({
        page,
        pageSize,
        workflow_id: filters.workflow_id || undefined,
        status: filters.status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined
      });
      setLogs(response.data);
      setTotalPages(response.pagination.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load automation logs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await automationLogService.getStats(30, filters.workflow_id || undefined);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadLogs(), loadStats()]);
    setIsRefreshing(false);
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      workflow_id: '',
      status: '',
      start_date: '',
      end_date: ''
    });
    setPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-brand-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      running: 'bg-blue-100 text-blue-700',
      skipped: 'bg-amber-100 text-amber-700'
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-brand-gray-100 text-brand-gray-600'}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDuration = (ms: number | undefined | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTriggerLabel = (triggerType: string | undefined) => {
    if (!triggerType) return '-';
    return TRIGGER_TYPES.find(t => t.value === triggerType)?.label || triggerType;
  };

  const getActionLabel = (actionType: string | undefined) => {
    if (!actionType) return '-';
    return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType;
  };

  const hasActiveFilters = filters.workflow_id || filters.status || filters.start_date || filters.end_date;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/workflows"
            className="p-2 text-brand-gray-400 hover:text-brand-gray-600 rounded-md hover:bg-brand-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">Automation Logs</h1>
            <p className="mt-1 text-sm text-brand-gray-600">
              View execution history and monitor workflow performance
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-md hover:bg-brand-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {stats && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-cyan-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-brand-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-gray-900">{stats.overall.total_executions}</p>
                <p className="text-sm text-brand-gray-500">Total Executions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-gray-900">{stats.overall.success_rate}%</p>
                <p className="text-sm text-brand-gray-500">Success Rate</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Timer className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-gray-900">{formatDuration(stats.overall.avg_duration_ms)}</p>
                <p className="text-sm text-brand-gray-500">Avg Duration</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-gray-900">{stats.overall.failed}</p>
                <p className="text-sm text-brand-gray-500">Failed ({stats.period_days}d)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border ${
            hasActiveFilters 
              ? 'text-brand-cyan-700 bg-brand-cyan-50 border-brand-cyan-200' 
              : 'text-brand-gray-700 bg-white border-brand-gray-300 hover:bg-brand-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-brand-cyan-500 rounded-full"></span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-brand-gray-500 hover:text-brand-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-brand-gray-50 rounded-lg border border-brand-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Workflow</label>
              <select
                value={filters.workflow_id}
                onChange={(e) => handleFilterChange('workflow_id', e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              >
                <option value="">All Workflows</option>
                {workflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white shadow-sm rounded-lg border border-brand-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-brand-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-brand-gray-900 mb-1">No logs found</h3>
            <p className="text-brand-gray-500">
              {hasActiveFilters 
                ? 'Try adjusting your filter criteria'
                : 'Workflow executions will appear here'}
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-brand-gray-200">
              <thead className="bg-brand-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                    Trigger
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray-200">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-brand-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-brand-cyan-500" />
                          <span className="text-sm font-medium text-brand-gray-900">
                            {log.workflow_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-600">
                        {getTriggerLabel(log.trigger_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-600">
                        {getActionLabel(log.action_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-600">
                        {formatDuration(log.duration_ms)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-brand-gray-400 hover:text-brand-gray-600"
                        >
                          {expandedLog === log.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-brand-gray-50">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-brand-gray-700 mb-1">Execution ID</p>
                              <p className="text-brand-gray-600 font-mono text-xs">{log.execution_id}</p>
                            </div>
                            {log.triggered_by_entity_type && (
                              <div>
                                <p className="font-medium text-brand-gray-700 mb-1">Entity</p>
                                <p className="text-brand-gray-600">
                                  {log.triggered_by_entity_type}: {log.triggered_by_entity_id}
                                </p>
                              </div>
                            )}
                            {log.error_message && (
                              <div className="col-span-2">
                                <p className="font-medium text-red-700 mb-1">Error Message</p>
                                <p className="text-red-600 bg-red-50 p-2 rounded font-mono text-xs">
                                  {log.error_message}
                                </p>
                              </div>
                            )}
                            {log.input_data && Object.keys(log.input_data).length > 0 && (
                              <div className="col-span-2">
                                <p className="font-medium text-brand-gray-700 mb-1">Input Data</p>
                                <pre className="text-brand-gray-600 bg-brand-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(log.input_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.output_data && Object.keys(log.output_data).length > 0 && (
                              <div className="col-span-2">
                                <p className="font-medium text-brand-gray-700 mb-1">Output Data</p>
                                <pre className="text-brand-gray-600 bg-brand-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(log.output_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-brand-gray-200">
                <p className="text-sm text-brand-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-md hover:bg-brand-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-md hover:bg-brand-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AutomationLogs;
