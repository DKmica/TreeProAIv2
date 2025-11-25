import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  X,
  XCircle
} from 'lucide-react';
import { automationLogService, AutomationLog } from '../services/workflowService';
import { useToast } from './ui/Toast';

interface AutomationLogDrawerProps {
  executionId: string | null;
  onClose: () => void;
}

interface ExecutionDetails {
  execution_id: string;
  workflow_id: string;
  workflow_name?: string;
  status: string;
  trigger_type?: string;
  entity_type?: string;
  entity_id?: string;
  started_at?: string;
  completed_at?: string;
  logs: Array<Pick<AutomationLog, 'action_type' | 'status' | 'input_data' | 'output_data' | 'error_message' | 'started_at' | 'completed_at' | 'duration_ms'>>;
}

const statusStyles: Record<string, { icon: React.ReactNode; color: string; badge: string }> = {
  completed: {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-600 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  failed: {
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-600 bg-red-50',
    badge: 'bg-red-100 text-red-800'
  },
  running: {
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    color: 'text-brand-cyan-600 bg-brand-cyan-50',
    badge: 'bg-brand-cyan-100 text-brand-cyan-800'
  },
  skipped: {
    icon: <Clock className="w-5 h-5" />,
    color: 'text-amber-600 bg-amber-50',
    badge: 'bg-amber-100 text-amber-800'
  }
};

const AutomationLogDrawer: React.FC<AutomationLogDrawerProps> = ({ executionId, onClose }) => {
  const [execution, setExecution] = useState<ExecutionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!executionId) return;

    const loadDetails = async () => {
      try {
        setIsLoading(true);
        const response = await automationLogService.getLogDetails(executionId);
        setExecution(response as unknown as ExecutionDetails);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load execution details', err);
        setError(err.message || 'Failed to load execution details');
        toast.error('Could not load log details', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDetails();
  }, [executionId, toast]);

  const getStatus = (status: string) => statusStyles[status] || statusStyles.running;

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms?: number | null) => {
    if (ms === undefined || ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const parsedLogs = useMemo(() => {
    if (!execution) return [];
    return execution.logs.map((log) => {
      const parseField = (value: any) => {
        if (!value) return null;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      };

      return {
        ...log,
        input_data: parseField(log.input_data),
        output_data: parseField(log.output_data),
      };
    });
  }, [execution]);

  if (!executionId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-3xl h-full bg-white shadow-2xl border-l border-brand-gray-200 overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-200 bg-brand-gray-50">
          <div>
            <p className="text-xs font-medium text-brand-gray-500">Execution</p>
            <h2 className="text-lg font-semibold text-brand-gray-900">{execution?.workflow_name || 'Automation run'}</h2>
            {execution?.execution_id && (
              <p className="text-xs text-brand-gray-500 font-mono">{execution.execution_id}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray-500 hover:text-brand-gray-700 rounded-md hover:bg-brand-gray-100"
            aria-label="Close execution details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-cyan-500 animate-spin" />
          </div>
        )}

        {!isLoading && error && (
          <div className="m-6 p-4 border border-red-200 rounded-lg bg-red-50 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Unable to load execution</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && execution && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatus(execution.status).badge}`}>
                {getStatus(execution.status).icon}
                {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
              </span>
              {execution.trigger_type && (
                <span className="px-3 py-1 rounded-full bg-brand-gray-100 text-xs font-medium text-brand-gray-700">
                  Trigger: {execution.trigger_type.replace('_', ' ')}
                </span>
              )}
              {execution.entity_type && (
                <span className="px-3 py-1 rounded-full bg-brand-gray-100 text-xs font-medium text-brand-gray-700">
                  Entity: {execution.entity_type}{execution.entity_id ? ` #${execution.entity_id}` : ''}
                </span>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 bg-brand-gray-50 border border-brand-gray-200 rounded-lg p-4">
              <div>
                <p className="text-xs font-medium text-brand-gray-500">Started</p>
                <p className="text-sm text-brand-gray-900">{formatDate(execution.started_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-brand-gray-500">Completed</p>
                <p className="text-sm text-brand-gray-900">{formatDate(execution.completed_at)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">Action Timeline</h3>
              <div className="space-y-3">
                {parsedLogs.map((log, index) => {
                  const styles = getStatus(log.status);
                  return (
                    <div key={`${log.action_type}-${index}`} className="relative p-4 border border-brand-gray-200 rounded-lg bg-white shadow-sm">
                      {index < parsedLogs.length - 1 && (
                        <div className="absolute left-4 top-full h-3 border-l border-dashed border-brand-gray-200" />
                      )}
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-md ${styles.color} inline-flex items-center justify-center`}>
                          {styles.icon}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-brand-gray-900 flex items-center gap-2">
                            {log.action_type || 'Workflow event'}
                            <span className="text-xs font-normal text-brand-gray-500">{formatDuration(log.duration_ms)}</span>
                          </p>
                          <p className="text-xs text-brand-gray-500">{formatDate(log.started_at)} → {formatDate(log.completed_at)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-brand-gray-300" />
                      </div>

                      {log.error_message && (
                        <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5" />
                          <div>
                            <p className="font-semibold">Error</p>
                            <p className="font-mono text-xs break-all">{log.error_message}</p>
                          </div>
                        </div>
                      )}

                      {log.input_data && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-brand-gray-700 mb-1">Input</p>
                          <pre className="bg-brand-gray-50 border border-brand-gray-200 rounded-md p-3 text-xs text-brand-gray-800 overflow-auto max-h-40">
                            {JSON.stringify(log.input_data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.output_data && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-brand-gray-700 mb-1">Output</p>
                          <pre className="bg-brand-gray-50 border border-brand-gray-200 rounded-md p-3 text-xs text-brand-gray-800 overflow-auto max-h-40">
                            {JSON.stringify(log.output_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationLogDrawer;
