import React, { useState, useEffect, useMemo } from 'react';
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
  XCircle
} from 'lucide-react';
import { workflowService, Workflow, TRIGGER_TYPES, ACTION_TYPES } from '../services/workflowService';
import WorkflowEditor from '../components/WorkflowEditor';

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

  useEffect(() => {
    loadWorkflows();
    loadTemplates();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const response = await workflowService.getWorkflows({
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setWorkflows(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await workflowService.getWorkflowTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setTogglingId(id);
      const result = await workflowService.toggleWorkflow(id);
      setWorkflows(prev => prev.map(w => 
        w.id === id ? { ...w, is_active: result.is_active } : w
      ));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle workflow');
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
    } catch (err: any) {
      alert(err.message || 'Failed to delete workflow');
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
    } catch (err: any) {
      alert(err.message || 'Failed to create workflow from template');
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

  const getTriggerLabel = (triggerType: string) => {
    return TRIGGER_TYPES.find(t => t.value === triggerType)?.label || triggerType;
  };

  const getActionLabel = (actionType: string) => {
    return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-brand-gray-400 text-sm">Loading workflows...</p>
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
