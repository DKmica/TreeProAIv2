import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Play,
  AlertCircle,
  GripVertical
} from 'lucide-react';
import { 
  workflowService, 
  Workflow, 
  WorkflowTrigger, 
  WorkflowAction, 
  TriggerCondition,
  TRIGGER_TYPES, 
  ACTION_TYPES, 
  CONDITION_OPERATORS 
} from '../services/workflowService';

interface WorkflowEditorProps {
  isOpen: boolean;
  workflowId: string | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  name: string;
  description: string;
  is_active: boolean;
  max_executions_per_day: number;
  cooldown_minutes: number;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  isOpen,
  workflowId,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    is_active: true,
    max_executions_per_day: 100,
    cooldown_minutes: 0,
    triggers: [],
    actions: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrigger, setExpandedTrigger] = useState<number | null>(null);
  const [expandedAction, setExpandedAction] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (workflowId) {
        loadWorkflow();
      } else {
        resetForm();
      }
    }
  }, [isOpen, workflowId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      max_executions_per_day: 100,
      cooldown_minutes: 0,
      triggers: [],
      actions: []
    });
    setError(null);
    setExpandedTrigger(null);
    setExpandedAction(null);
  };

  const loadWorkflow = async () => {
    if (!workflowId) return;
    
    try {
      setIsLoading(true);
      const workflow = await workflowService.getWorkflow(workflowId);
      setFormData({
        name: workflow.name,
        description: workflow.description || '',
        is_active: workflow.is_active,
        max_executions_per_day: workflow.max_executions_per_day,
        cooldown_minutes: workflow.cooldown_minutes,
        triggers: workflow.triggers || [],
        actions: workflow.actions || []
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Workflow name is required');
      return;
    }

    if (formData.triggers.length === 0) {
      setError('At least one trigger is required');
      return;
    }

    if (formData.actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        is_active: formData.is_active,
        max_executions_per_day: formData.max_executions_per_day,
        cooldown_minutes: formData.cooldown_minutes,
        triggers: formData.triggers.map((t, i) => ({
          ...t,
          trigger_order: i
        })),
        actions: formData.actions.map((a, i) => ({
          ...a,
          action_order: i
        }))
      };

      if (workflowId) {
        await workflowService.updateWorkflow(workflowId, payload);
      } else {
        await workflowService.createWorkflow(payload);
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const addTrigger = () => {
    const newTrigger: WorkflowTrigger = {
      trigger_type: 'job_completed',
      config: {},
      conditions: []
    };
    setFormData(prev => ({
      ...prev,
      triggers: [...prev.triggers, newTrigger]
    }));
    setExpandedTrigger(formData.triggers.length);
  };

  const updateTrigger = (index: number, updates: Partial<WorkflowTrigger>) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.map((t, i) => i === index ? { ...t, ...updates } : t)
    }));
  };

  const removeTrigger = (index: number) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index)
    }));
    if (expandedTrigger === index) {
      setExpandedTrigger(null);
    }
  };

  const addCondition = (triggerIndex: number) => {
    const newCondition: TriggerCondition = {
      field: '',
      operator: 'equals',
      value: ''
    };
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.map((t, i) => 
        i === triggerIndex 
          ? { ...t, conditions: [...t.conditions, newCondition] }
          : t
      )
    }));
  };

  const updateCondition = (triggerIndex: number, conditionIndex: number, updates: Partial<TriggerCondition>) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.map((t, i) => 
        i === triggerIndex 
          ? { 
              ...t, 
              conditions: t.conditions.map((c, ci) => 
                ci === conditionIndex ? { ...c, ...updates } : c
              )
            }
          : t
      )
    }));
  };

  const removeCondition = (triggerIndex: number, conditionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.map((t, i) => 
        i === triggerIndex 
          ? { ...t, conditions: t.conditions.filter((_, ci) => ci !== conditionIndex) }
          : t
      )
    }));
  };

  const addAction = () => {
    const newAction: WorkflowAction = {
      action_type: 'send_email',
      config: {},
      delay_minutes: 0,
      continue_on_error: true
    };
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
    setExpandedAction(formData.actions.length);
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === index ? { ...a, ...updates } : a)
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
    if (expandedAction === index) {
      setExpandedAction(null);
    }
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.action_type) {
      case 'send_email':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Email Template ID</label>
              <input
                type="text"
                value={action.config.template_id || ''}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, template_id: e.target.value } 
                })}
                placeholder="e.g., job_completion_email"
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Recipient Field</label>
              <input
                type="text"
                value={action.config.recipient_field || ''}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, recipient_field: e.target.value } 
                })}
                placeholder="e.g., client.email"
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
          </div>
        );
      
      case 'send_sms':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">SMS Template ID</label>
              <input
                type="text"
                value={action.config.template_id || ''}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, template_id: e.target.value } 
                })}
                placeholder="e.g., job_reminder_sms"
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Phone Field</label>
              <input
                type="text"
                value={action.config.phone_field || ''}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, phone_field: e.target.value } 
                })}
                placeholder="e.g., client.phone"
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
          </div>
        );
      
      case 'create_task':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Task Title</label>
              <input
                type="text"
                value={action.config.title || ''}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, title: e.target.value } 
                })}
                placeholder="e.g., Follow up with customer"
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Assign To (User ID)</label>
              <input
                type="text"
                value={action.config.assign_to || ''}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, assign_to: e.target.value } 
                })}
                placeholder="Leave empty for auto-assign"
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Due In (Days)</label>
              <input
                type="number"
                value={action.config.due_in_days || 1}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, due_in_days: parseInt(e.target.value) || 1 } 
                })}
                min="1"
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
          </div>
        );
      
      case 'webhook':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={action.config.url || ''}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, url: e.target.value } 
                })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">HTTP Method</label>
              <select
                value={action.config.method || 'POST'}
                onChange={(e) => updateAction(index, { 
                  config: { ...action.config, method: e.target.value } 
                })}
                className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-brand-gray-500">
            No additional configuration needed for this action type.
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-cyan-100 rounded-lg">
                <Zap className="w-5 h-5 text-brand-cyan-600" />
              </div>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                {workflowId ? 'Edit Workflow' : 'Create Workflow'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-brand-gray-400 hover:text-brand-gray-600 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-brand-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                      Workflow Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Send thank you email after job completion"
                      className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
                      required
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this workflow does..."
                      rows={2}
                      className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                      Max Executions Per Day
                    </label>
                    <input
                      type="number"
                      value={formData.max_executions_per_day}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_executions_per_day: parseInt(e.target.value) || 100 
                      }))}
                      min="1"
                      className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                      Cooldown (Minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.cooldown_minutes}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        cooldown_minutes: parseInt(e.target.value) || 0 
                      }))}
                      min="0"
                      className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
                    />
                  </div>
                </div>

                <div className="border-t border-brand-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-brand-gray-900">Triggers</h3>
                    <button
                      type="button"
                      onClick={addTrigger}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-brand-cyan-600 bg-brand-cyan-50 rounded-md hover:bg-brand-cyan-100"
                    >
                      <Plus className="w-4 h-4" />
                      Add Trigger
                    </button>
                  </div>

                  {formData.triggers.length === 0 ? (
                    <div className="text-center py-6 bg-brand-gray-50 rounded-lg border-2 border-dashed border-brand-gray-200">
                      <Zap className="w-8 h-8 text-brand-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-brand-gray-500">No triggers defined</p>
                      <button
                        type="button"
                        onClick={addTrigger}
                        className="mt-2 text-sm text-brand-cyan-600 hover:text-brand-cyan-700"
                      >
                        Add your first trigger
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.triggers.map((trigger, index) => (
                        <div 
                          key={index} 
                          className="border border-brand-gray-200 rounded-lg overflow-hidden"
                        >
                          <div 
                            className="flex items-center justify-between px-4 py-3 bg-brand-gray-50 cursor-pointer"
                            onClick={() => setExpandedTrigger(expandedTrigger === index ? null : index)}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-brand-gray-400" />
                              <span className="text-sm font-medium text-brand-gray-900">
                                {TRIGGER_TYPES.find(t => t.value === trigger.trigger_type)?.label || trigger.trigger_type}
                              </span>
                              {trigger.conditions.length > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-brand-gray-200 rounded-full">
                                  {trigger.conditions.length} condition{trigger.conditions.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTrigger(index);
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {expandedTrigger === index ? (
                                <ChevronUp className="w-4 h-4 text-brand-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-brand-gray-400" />
                              )}
                            </div>
                          </div>

                          {expandedTrigger === index && (
                            <div className="px-4 py-4 space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                                  Trigger Type
                                </label>
                                <select
                                  value={trigger.trigger_type}
                                  onChange={(e) => updateTrigger(index, { trigger_type: e.target.value })}
                                  className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
                                >
                                  {TRIGGER_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-1 text-xs text-brand-gray-500">
                                  {TRIGGER_TYPES.find(t => t.value === trigger.trigger_type)?.description}
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium text-brand-gray-700">
                                    Conditions (Optional)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => addCondition(index)}
                                    className="text-xs text-brand-cyan-600 hover:text-brand-cyan-700"
                                  >
                                    + Add Condition
                                  </button>
                                </div>
                                
                                {trigger.conditions.length === 0 ? (
                                  <p className="text-xs text-brand-gray-500">
                                    No conditions - trigger will fire for all matching events
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {trigger.conditions.map((condition, condIndex) => (
                                      <div key={condIndex} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={condition.field}
                                          onChange={(e) => updateCondition(index, condIndex, { field: e.target.value })}
                                          placeholder="Field (e.g., status)"
                                          className="flex-1 px-2 py-1.5 text-sm border border-brand-gray-300 rounded-md"
                                        />
                                        <select
                                          value={condition.operator}
                                          onChange={(e) => updateCondition(index, condIndex, { 
                                            operator: e.target.value as TriggerCondition['operator'] 
                                          })}
                                          className="px-2 py-1.5 text-sm border border-brand-gray-300 rounded-md"
                                        >
                                          {CONDITION_OPERATORS.map(op => (
                                            <option key={op.value} value={op.value}>{op.label}</option>
                                          ))}
                                        </select>
                                        <input
                                          type="text"
                                          value={String(condition.value)}
                                          onChange={(e) => updateCondition(index, condIndex, { value: e.target.value })}
                                          placeholder="Value"
                                          className="flex-1 px-2 py-1.5 text-sm border border-brand-gray-300 rounded-md"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeCondition(index, condIndex)}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-brand-gray-900">Actions</h3>
                    <button
                      type="button"
                      onClick={addAction}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-brand-cyan-600 bg-brand-cyan-50 rounded-md hover:bg-brand-cyan-100"
                    >
                      <Plus className="w-4 h-4" />
                      Add Action
                    </button>
                  </div>

                  {formData.actions.length === 0 ? (
                    <div className="text-center py-6 bg-brand-gray-50 rounded-lg border-2 border-dashed border-brand-gray-200">
                      <Play className="w-8 h-8 text-brand-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-brand-gray-500">No actions defined</p>
                      <button
                        type="button"
                        onClick={addAction}
                        className="mt-2 text-sm text-brand-cyan-600 hover:text-brand-cyan-700"
                      >
                        Add your first action
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.actions.map((action, index) => (
                        <div 
                          key={index} 
                          className="border border-brand-gray-200 rounded-lg overflow-hidden"
                        >
                          <div 
                            className="flex items-center justify-between px-4 py-3 bg-brand-gray-50 cursor-pointer"
                            onClick={() => setExpandedAction(expandedAction === index ? null : index)}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-brand-gray-400" />
                              <span className="text-sm font-medium text-brand-gray-900">
                                {index + 1}. {ACTION_TYPES.find(a => a.value === action.action_type)?.label || action.action_type}
                              </span>
                              {action.delay_minutes > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                  {action.delay_minutes} min delay
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAction(index);
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {expandedAction === index ? (
                                <ChevronUp className="w-4 h-4 text-brand-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-brand-gray-400" />
                              )}
                            </div>
                          </div>

                          {expandedAction === index && (
                            <div className="px-4 py-4 space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                                  Action Type
                                </label>
                                <select
                                  value={action.action_type}
                                  onChange={(e) => updateAction(index, { 
                                    action_type: e.target.value,
                                    config: {} 
                                  })}
                                  className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
                                >
                                  {ACTION_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-1 text-xs text-brand-gray-500">
                                  {ACTION_TYPES.find(a => a.value === action.action_type)?.description}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                                    Delay (Minutes)
                                  </label>
                                  <input
                                    type="number"
                                    value={action.delay_minutes}
                                    onChange={(e) => updateAction(index, { 
                                      delay_minutes: parseInt(e.target.value) || 0 
                                    })}
                                    min="0"
                                    className="w-full px-3 py-2 border border-brand-gray-300 rounded-md focus:ring-2 focus:ring-brand-cyan-500"
                                  />
                                </div>
                                <div className="flex items-center">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={action.continue_on_error}
                                      onChange={(e) => updateAction(index, { 
                                        continue_on_error: e.target.checked 
                                      })}
                                      className="w-4 h-4 text-brand-cyan-600 rounded border-brand-gray-300"
                                    />
                                    <span className="text-sm text-brand-gray-700">Continue on error</span>
                                  </label>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-brand-gray-100">
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">
                                  Action Configuration
                                </label>
                                {renderActionConfig(action, index)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-brand-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-brand-cyan-600 rounded border-brand-gray-300"
                    />
                    <span className="text-sm text-brand-gray-700">Activate workflow immediately</span>
                  </label>
                </div>
              </form>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-brand-gray-200 bg-brand-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-md hover:bg-brand-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-cyan-600 rounded-md hover:bg-brand-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : (workflowId ? 'Update Workflow' : 'Create Workflow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditor;
