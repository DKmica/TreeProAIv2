import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Plus,
  Search,
  Play,
  Pause, 
  Trash2, 
  Edit, 
  Copy,
  ChevronDown,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { automationLogService, workflowService, Workflow, TRIGGER_TYPES, ACTION_TYPES, AutomationLog } from '../services/workflowService';
import { aiService } from '../services/apiService';
import { AiWorkflowRecommendation } from '../types';
import WorkflowEditor from '../components/WorkflowEditor';
import { useToast } from '../components/ui/Toast';
import AutomationLogDrawer from '../components/AutomationLogDrawer';
import AiInsightsPanel from '../components/AiInsightsPanel';
import WorkflowEditor from '../components/WorkflowEditor';
import { useToast } from '../components/ui/Toast';
import AutomationLogDrawer from '../components/AutomationLogDrawer';

const Workflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<Record<string, AutomationLog[]>>({});
  const [isPrefetchingLogs, setIsPrefetchingLogs] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [aiModeEnabled, setAiModeEnabled] = useState(false);
  const [isSavingAiMode, setIsSavingAiMode] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AiWorkflowRecommendation[]>([]);
  const [isLoadingAiRecommendations, setIsLoadingAiRecommendations] = useState(false);
  const [aiRecommendationError, setAiRecommendationError] = useState<string | null>(null);
  const hasHydratedLogs = useRef(false);
  const seenExecutionIds = useRef<Set<string>>(new Set());
  const toast = useToast();

  useEffect(() => {
    loadWorkflows();
    loadTemplates();
    loadAiRecommendations();
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [statusFilter]);

  useEffect(() => {
    if (!workflows.length) return;

    const interval = setInterval(() => {
      prefetchRecentLogs(workflows, true);
    }, 20000);

    return () => clearInterval(interval);
  }, [workflows]);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const response = await workflowService.getWorkflows({
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setWorkflows(response.data);
      setError(null);
      await prefetchRecentLogs(response.data, false);
      hasHydratedLogs.current = true;
    } catch (err: any) {
      setError(err.message || 'Failed to load workflows');
      toast.error('Unable to load workflows', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const prefetchRecentLogs = async (items: Workflow[], shouldNotify = false) => {
    if (!items.length) return;
    setIsPrefetchingLogs(true);

    const entries = await Promise.all(
      items.map(async (workflow) => {
        try {
          const response = await automationLogService.getLogs({
            workflow_id: workflow.id,
            page: 1,
            pageSize: 3
          });
          return [workflow.id, response.data] as [string, AutomationLog[]];
        } catch (err) {
          console.error('Failed to load recent logs for workflow', workflow.id, err);
          return [workflow.id, []] as [string, AutomationLog[]];
        }
      })
    );

    const logsByWorkflow = Object.fromEntries(entries);

    Object.values(logsByWorkflow).forEach((logs) => {
      logs.forEach((log) => {
        if (!seenExecutionIds.current.has(log.execution_id)) {
          seenExecutionIds.current.add(log.execution_id);

          if (shouldNotify && hasHydratedLogs.current) {
            const summary = `${getTriggerLabel(log.trigger_type || 'manual')} ${log.action_type ? `→ ${getActionLabel(log.action_type)}` : ''}`.trim();
            if (log.status === 'failed') {
              toast.error('Automation run failed', summary || 'A workflow execution reported a failure.');
            } else if (log.status === 'completed') {
              toast.success('Automation run completed', summary || 'Workflow finished successfully.');
            }
          }
        }
      });
    });

    setRecentLogs(logsByWorkflow);
    setIsPrefetchingLogs(false);
  };

  const loadTemplates = async () => {
    try {
      const data = await workflowService.getWorkflowTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadAiRecommendations = async () => {
    setIsLoadingAiRecommendations(true);
    setAiRecommendationError(null);
    try {
      const recs = await aiService.getWorkflowRecommendations();
      setAiRecommendations(recs);
    } catch (err: any) {
      console.error('Failed to load AI workflow recommendations', err);
      setAiRecommendationError(err?.message || 'Unable to fetch AI workflow suggestions.');
    } finally {
      setIsLoadingAiRecommendations(false);
    }
  };

  const handleToggleAiMode = async () => {
    setIsSavingAiMode(true);
    try {
      const response = await aiService.setAutomationAiMode(!aiModeEnabled);
      setAiModeEnabled(response.enabled);
      if (response.enabled) {
        toast.success('AI Mode on', response.message || 'Recommended workflows will auto-run when applicable.');
      } else {
        toast.info('AI Mode paused', response.message || 'Auto-run suggestions disabled until re-enabled.');
      }
    } catch (err: any) {
      console.error('Failed to toggle AI mode', err);
      toast.error('Unable to update AI mode', err?.message || 'Please try again.');
    } finally {
      setIsSavingAiMode(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setTogglingId(id);
      const result = await workflowService.toggleWorkflow(id);
      setWorkflows(prev => prev.map(w =>
        w.id === id ? { ...w, is_active: result.is_active } : w
      ));
      toast.success(
        result.is_active ? 'Workflow activated' : 'Workflow paused',
        result.is_active
          ? 'This automation is now live and will react to new triggers.'
          : 'Runs are paused until you reactivate the workflow.'
      );
      refreshWorkflowLogs(id);
    } catch (err: any) {
      toast.error('Failed to update workflow', err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeletingId(id);
      await workflowService.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      toast.success('Workflow deleted', 'The automation and its runs have been removed.');
    } catch (err: any) {
      toast.error('Failed to delete workflow', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      await workflowService.createFromTemplate(templateId, template?.name);
      setShowTemplateDropdown(false);
      loadWorkflows();
      toast.success('Workflow created from template', 'Review the steps and enable when ready.');
    } catch (err: any) {
      toast.error('Could not create workflow', err.message);
    }
  };

  const refreshWorkflowLogs = async (workflowId: string) => {
    try {
      const response = await automationLogService.getLogs({
        workflow_id: workflowId,
        page: 1,
        pageSize: 3
      });
      setRecentLogs(prev => ({ ...prev, [workflowId]: response.data }));

      response.data.forEach((log) => {
        if (!seenExecutionIds.current.has(log.execution_id)) {
          seenExecutionIds.current.add(log.execution_id);
          if (hasHydratedLogs.current && (log.status === 'completed' || log.status === 'failed')) {
            const summary = `${getTriggerLabel(log.trigger_type || 'manual')} ${log.action_type ? `→ ${getActionLabel(log.action_type)}` : ''}`.trim();
            log.status === 'completed'
              ? toast.success('Automation run completed', summary || 'Workflow finished successfully.')
              : toast.error('Automation run failed', summary || 'A workflow execution reported a failure.');
          }
        }
      });
    } catch (err) {
      console.error('Failed to refresh logs for workflow', workflowId, err);
    }
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingWorkflowId(null);
  };

  const handleEditorSave = () => {
    setIsEditorOpen(false);
    setEditingWorkflowId(null);
    loadWorkflows();
  };

  const filteredWorkflows = useMemo(() => {
    return workflows.filter(workflow => {
      const matchesSearch = !searchTerm ||
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && workflow.is_active) ||
        (statusFilter === 'inactive' && !workflow.is_active);

    return matchesSearch && matchesStatus;
  });
  }, [workflows, searchTerm, statusFilter]);

  const aiRecommendationItems = useMemo(() => {
    return aiRecommendations.map((rec) => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      tag: rec.trigger,
      confidence: rec.confidence,
      meta: rec.suggestedActions?.join(' → '),
    }));
  }, [aiRecommendations]);

  const getTriggerLabel = (triggerType: string) => {
    return TRIGGER_TYPES.find(t => t.value === triggerType)?.label || triggerType;
  };

  const getActionLabel = (actionType: string) => {
    return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType;
  };

  const getStatusPill = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      running: 'bg-blue-100 text-blue-700',
      skipped: 'bg-amber-100 text-amber-700',
    };

    const icons: Record<string, JSX.Element> = {
      completed: <CheckCircle className="w-3.5 h-3.5" />,
      failed: <XCircle className="w-3.5 h-3.5" />,
      running: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      skipped: <Pause className="w-3.5 h-3.5" />,
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-brand-gray-100 text-brand-gray-600'}`}>
        {icons[status] || <Clock className="w-3.5 h-3.5" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2 w-1/3">
            <div className="h-6 bg-brand-gray-800/70 rounded-md animate-pulse" />
            <div className="h-4 bg-brand-gray-800/70 rounded-md animate-pulse w-2/3" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-brand-gray-800/70 rounded-lg animate-pulse" />
            <div className="h-10 w-36 bg-brand-gray-800/70 rounded-lg animate-pulse" />
            <div className="h-10 w-28 bg-brand-gray-800/70 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="p-4 border border-brand-gray-800 rounded-xl bg-brand-gray-900/60">
              <div className="h-5 w-1/2 bg-brand-gray-800/70 rounded-md animate-pulse" />
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-brand-gray-800/70 rounded-md animate-pulse" />
                <div className="h-4 bg-brand-gray-800/70 rounded-md animate-pulse w-4/5" />
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="h-6 w-24 bg-brand-gray-800/70 rounded-full animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-10 bg-brand-gray-800/70 rounded-lg animate-pulse" />
                  <div className="h-8 w-10 bg-brand-gray-800/70 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">Automation Workflows</h1>
          <p className="mt-1 text-sm text-brand-gray-600">
            Create and manage automated workflows that trigger actions based on events
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/automation-logs"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-md hover:bg-brand-gray-50"
          >
            <Activity className="w-4 h-4" />
            View Logs
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-md hover:bg-brand-gray-50"
            >
              <Copy className="w-4 h-4" />
              From Template
              <ChevronDown className="w-4 h-4" />
            </button>
            {showTemplateDropdown && (
              <div className="absolute right-0 z-10 mt-2 w-64 bg-white border border-brand-gray-200 rounded-md shadow-lg">
                <div className="py-1">
                  {templates.length === 0 ? (
                    <p className="px-4 py-2 text-sm text-brand-gray-500">No templates available</p>
                  ) : (
                    templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleCreateFromTemplate(template.id)}
                        className="w-full px-4 py-2 text-left text-sm text-brand-gray-700 hover:bg-brand-gray-50"
                      >
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-brand-gray-500 mt-0.5">{template.description}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setEditingWorkflowId(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-cyan-600 rounded-md hover:bg-brand-cyan-700"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

        <div className="mt-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" />
            <input
              type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500 focus:border-brand-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500 focus:border-brand-cyan-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="bg-white border border-brand-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-gray-900">AI Mode for automations</p>
                <p className="text-sm text-brand-gray-600">Auto-run recommended workflows when new signals arrive.</p>
              </div>
              <button
                onClick={handleToggleAiMode}
                disabled={isSavingAiMode}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                  aiModeEnabled ? 'bg-brand-cyan-600 text-white' : 'bg-brand-gray-200 text-brand-gray-800'
                } disabled:opacity-60`}
              >
                {isSavingAiMode ? 'Saving…' : aiModeEnabled ? 'On' : 'Off'}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-brand-gray-600">
              <Clock className="w-4 h-4" />
              <span>AI will execute safe defaults and log runs for review.</span>
            </div>
          </div>

          <div className="bg-white border border-brand-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-gray-900">Recommended workflows</p>
              <span className="rounded-full bg-brand-gray-50 px-2 py-1 text-[11px] font-medium text-brand-gray-700">AI</span>
            </div>
            {isLoadingAiRecommendations && (
              <p className="mt-2 text-sm text-brand-gray-600">Analyzing patterns…</p>
            )}
            {aiRecommendationError && (
              <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">{aiRecommendationError}</div>
            )}
            <div className="mt-3">
              <AiInsightsPanel
                title="Suggested automations"
                subtitle="Curated from recent signals"
                items={aiRecommendationItems}
                icon="sparkles"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white shadow-sm rounded-lg border border-brand-gray-200 overflow-hidden">
          {filteredWorkflows.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="w-12 h-12 text-brand-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-brand-gray-900 mb-1">No workflows found</h3>
            <p className="text-brand-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first workflow to automate tasks'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => {
                  setEditingWorkflowId(null);
                  setIsEditorOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-cyan-600 rounded-md hover:bg-brand-cyan-700"
              >
                <Plus className="w-4 h-4" />
                Create Workflow
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-brand-gray-200">
            <thead className="bg-brand-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                  Triggers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                  Executions (24h)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                  Recent Activity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-gray-200">
              {filteredWorkflows.map((workflow) => (
                <tr key={workflow.id} className="hover:bg-brand-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${workflow.is_active ? 'bg-brand-cyan-100' : 'bg-brand-gray-100'}`}>
                        <Zap className={`w-5 h-5 ${workflow.is_active ? 'text-brand-cyan-600' : 'text-brand-gray-400'}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-brand-gray-900">{workflow.name}</div>
                        {workflow.description && (
                          <div className="text-sm text-brand-gray-500 truncate max-w-xs">{workflow.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      workflow.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-brand-gray-100 text-brand-gray-600'
                    }`}>
                      {workflow.is_active ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-brand-gray-600">
                      {workflow.trigger_count || 0} trigger{(workflow.trigger_count || 0) !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-brand-gray-600">
                      {workflow.action_count || 0} action{(workflow.action_count || 0) !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-brand-gray-400" />
                      <span className="text-sm text-brand-gray-600">{workflow.executions_24h || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {(recentLogs[workflow.id] || []).length === 0 ? (
                        <p className="text-sm text-brand-gray-500">No recent runs</p>
                      ) : (
                        (recentLogs[workflow.id] || []).map((log) => (
                          <div key={log.id} className="flex items-center justify-between gap-3">
                            <div className="flex flex-col">
                              <div className="text-sm font-medium text-brand-gray-900 flex items-center gap-2">
                                {getStatusPill(log.status)}
                                <span className="text-xs text-brand-gray-500">{formatDate(log.started_at || log.created_at)}</span>
                              </div>
                              <p className="text-xs text-brand-gray-600">
                                {log.trigger_type ? getTriggerLabel(log.trigger_type) : 'Manual trigger'}
                                {log.action_type && ` • ${getActionLabel(log.action_type)}`}
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedExecutionId(log.execution_id)}
                              className="text-xs font-medium text-brand-cyan-600 hover:text-brand-cyan-700"
                            >
                              View log
                            </button>
                          </div>
                        ))
                      )}
                      {isPrefetchingLogs && (recentLogs[workflow.id] || []).length === 0 && (
                        <p className="text-xs text-brand-gray-400">Loading activity…</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(workflow.id)}
                        disabled={togglingId === workflow.id}
                        className={`p-2 rounded-md transition-colors ${
                          workflow.is_active 
                            ? 'text-amber-600 hover:bg-amber-50' 
                            : 'text-green-600 hover:bg-green-50'
                        } disabled:opacity-50`}
                        title={workflow.is_active ? 'Pause workflow' : 'Activate workflow'}
                      >
                        {workflow.is_active ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingWorkflowId(workflow.id);
                          setIsEditorOpen(true);
                        }}
                        className="p-2 text-brand-gray-600 hover:bg-brand-gray-100 rounded-md"
                        title="Edit workflow"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workflow.id)}
                        disabled={deletingId === workflow.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <WorkflowEditor
        isOpen={isEditorOpen}
        workflowId={editingWorkflowId}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
      />

      <AutomationLogDrawer
        executionId={selectedExecutionId}
        onClose={() => setSelectedExecutionId(null)}
      />

      {showTemplateDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowTemplateDropdown(false)}
        />
      )}
    </div>
  );
};

export default Workflows;
