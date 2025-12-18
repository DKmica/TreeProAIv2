import React, { useState, useEffect } from 'react';
import { JobTemplate, Job, LineItem } from '../types';
import { jobTemplateService, jobService } from '../services/apiService';
import XIcon from './icons/XIcon';

interface JobTemplateEditorProps {
  templateId?: string;
  jobId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  description: string;
  category: string;
  defaultDurationHours: string;
  defaultCrewSize: string;
  basePrice: string;
  pricePerHour: string;
  lineItems: LineItem[];
  permitRequired: boolean;
  depositRequired: boolean;
  depositPercentage: string;
  jhaRequired: boolean;
  completionChecklist: string[];
  safetyNotes: string;
  specialInstructions: string;
}

interface FormErrors {
  name?: string;
  category?: string;
  basePrice?: string;
}

const JobTemplateEditor: React.FC<JobTemplateEditorProps> = ({
  templateId,
  jobId,
  isOpen,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'Removal',
    defaultDurationHours: '',
    defaultCrewSize: '',
    basePrice: '',
    pricePerHour: '',
    lineItems: [],
    permitRequired: false,
    depositRequired: false,
    depositPercentage: '',
    jhaRequired: false,
    completionChecklist: [],
    safetyNotes: '',
    specialInstructions: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [newLineItem, setNewLineItem] = useState({ description: '', price: '' });
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const categories = ['Removal', 'Pruning', 'Emergency', 'Maintenance', 'Stump Grinding', 'Other'];

  useEffect(() => {
    if (isOpen) {
      if (templateId) {
        loadTemplate();
      } else if (jobId) {
        loadFromJob();
      } else {
        resetForm();
      }
    }
  }, [isOpen, templateId, jobId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Removal',
      defaultDurationHours: '',
      defaultCrewSize: '',
      basePrice: '',
      pricePerHour: '',
      lineItems: [],
      permitRequired: false,
      depositRequired: false,
      depositPercentage: '',
      jhaRequired: false,
      completionChecklist: [],
      safetyNotes: '',
      specialInstructions: '',
    });
    setErrors({});
    setApiError(null);
  };

  const loadTemplate = async () => {
    if (!templateId) return;
    setIsLoading(true);
    try {
      const template = await jobTemplateService.getById(templateId);
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category || 'Removal',
        defaultDurationHours: template.defaultDurationHours?.toString() || '',
        defaultCrewSize: template.defaultCrewSize?.toString() || '',
        basePrice: template.basePrice?.toString() || '',
        pricePerHour: template.pricePerHour?.toString() || '',
        lineItems: template.lineItems || [],
        permitRequired: template.permitRequired,
        depositRequired: template.depositRequired,
        depositPercentage: template.depositPercentage?.toString() || '',
        jhaRequired: template.jhaRequired,
        completionChecklist: template.completionChecklist || [],
        safetyNotes: template.safetyNotes || '',
        specialInstructions: template.specialInstructions || '',
      });
    } catch (err: any) {
      console.error('Failed to load template:', err);
      setApiError(err.message || 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromJob = async () => {
    if (!jobId) return;
    setIsLoading(true);
    try {
      const job = await jobService.getById(jobId);
      setFormData({
        name: `Template from ${job.customerName}`,
        description: `Template created from job ${job.id}`,
        category: 'Removal',
        defaultDurationHours: job.estimatedHours?.toString() || '',
        defaultCrewSize: job.assignedCrew.length.toString(),
        basePrice: '',
        pricePerHour: '',
        lineItems: [],
        permitRequired: false,
        depositRequired: false,
        depositPercentage: '',
        jhaRequired: job.jhaRequired || false,
        completionChecklist: [],
        safetyNotes: '',
        specialInstructions: job.specialInstructions || '',
      });
    } catch (err: any) {
      console.error('Failed to load job:', err);
      setApiError(err.message || 'Failed to load job');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.basePrice && isNaN(parseFloat(formData.basePrice))) {
      newErrors.basePrice = 'Base price must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAddLineItem = () => {
    if (!newLineItem.description || !newLineItem.price) return;

    const price = parseFloat(newLineItem.price);
    if (isNaN(price)) return;

    setFormData(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { description: newLineItem.description, price, selected: true }
      ]
    }));
    setNewLineItem({ description: '', price: '' });
  };

  const handleRemoveLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;

    setFormData(prev => ({
      ...prev,
      completionChecklist: [...prev.completionChecklist, newChecklistItem.trim()]
    }));
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      completionChecklist: prev.completionChecklist.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const templateData: Partial<JobTemplate> = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        defaultDurationHours: formData.defaultDurationHours ? parseFloat(formData.defaultDurationHours) : null,
        defaultCrewSize: formData.defaultCrewSize ? parseInt(formData.defaultCrewSize) : null,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : null,
        pricePerHour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : null,
        lineItems: formData.lineItems.length > 0 ? formData.lineItems : null,
        permitRequired: formData.permitRequired,
        depositRequired: formData.depositRequired,
        depositPercentage: formData.depositPercentage ? parseFloat(formData.depositPercentage) : null,
        jhaRequired: formData.jhaRequired,
        completionChecklist: formData.completionChecklist.length > 0 ? formData.completionChecklist : null,
        safetyNotes: formData.safetyNotes || null,
        specialInstructions: formData.specialInstructions || null,
      };

      if (templateId) {
        await jobTemplateService.update(templateId, templateData);
      } else if (jobId) {
        await jobTemplateService.createFromJob(jobId, templateData);
      } else {
        await jobTemplateService.create(templateData);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setApiError(err.message || 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {templateId ? 'Edit Template' : jobId ? 'Create Template from Job' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-4 sm:px-6 py-4 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div className="border-b border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Template Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="e.g., Standard Tree Removal"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Brief description of this template..."
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-400">{errors.category}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="defaultDurationHours" className="block text-sm font-medium text-gray-300 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    id="defaultDurationHours"
                    name="defaultDurationHours"
                    value={formData.defaultDurationHours}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="e.g., 4"
                  />
                </div>

                <div>
                  <label htmlFor="defaultCrewSize" className="block text-sm font-medium text-gray-300 mb-1">
                    Crew Size
                  </label>
                  <input
                    type="number"
                    id="defaultCrewSize"
                    name="defaultCrewSize"
                    value={formData.defaultCrewSize}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="e.g., 3"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Pricing</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="basePrice" className="block text-sm font-medium text-gray-300 mb-1">
                      Base Price
                    </label>
                    <input
                      type="number"
                      id="basePrice"
                      name="basePrice"
                      value={formData.basePrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., 500.00"
                    />
                    {errors.basePrice && (
                      <p className="mt-1 text-sm text-red-400">{errors.basePrice}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-300 mb-1">
                      Price Per Hour
                    </label>
                    <input
                      type="number"
                      id="pricePerHour"
                      name="pricePerHour"
                      value={formData.pricePerHour}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., 150.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Line Items</label>
                  {formData.lineItems.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {formData.lineItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-800 rounded">
                          <span className="flex-1 text-white">{item.description}</span>
                          <span className="text-cyan-400">${item.price.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLineItem.description}
                      onChange={(e) => setNewLineItem({ ...newLineItem, description: e.target.value })}
                      placeholder="Item description"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="number"
                      value={newLineItem.price}
                      onChange={(e) => setNewLineItem({ ...newLineItem, price: e.target.value })}
                      placeholder="Price"
                      min="0"
                      step="0.01"
                      className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Requirements</h3>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="permitRequired"
                    checked={formData.permitRequired}
                    onChange={handleChange}
                    className="mr-2 text-cyan-500 focus:ring-cyan-500 rounded"
                  />
                  <span className="text-gray-200">Permit Required</span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="jhaRequired"
                    checked={formData.jhaRequired}
                    onChange={handleChange}
                    className="mr-2 text-cyan-500 focus:ring-cyan-500 rounded"
                  />
                  <span className="text-gray-200">Job Hazard Analysis (JHA) Required</span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="depositRequired"
                    checked={formData.depositRequired}
                    onChange={handleChange}
                    className="mr-2 text-cyan-500 focus:ring-cyan-500 rounded"
                  />
                  <span className="text-gray-200">Deposit Required</span>
                </label>

                {formData.depositRequired && (
                  <div className="ml-6">
                    <label htmlFor="depositPercentage" className="block text-sm font-medium text-gray-300 mb-1">
                      Deposit Percentage
                    </label>
                    <input
                      type="number"
                      id="depositPercentage"
                      name="depositPercentage"
                      value={formData.depositPercentage}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="1"
                      className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., 50"
                    />
                    <span className="ml-2 text-gray-400">%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-b border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Checklists & Notes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Completion Checklist</label>
                  {formData.completionChecklist.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {formData.completionChecklist.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-800 rounded">
                          <span className="flex-1 text-white">{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add checklist item"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="safetyNotes" className="block text-sm font-medium text-gray-300 mb-1">
                    Safety Notes
                  </label>
                  <textarea
                    id="safetyNotes"
                    name="safetyNotes"
                    value={formData.safetyNotes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Safety considerations for this type of job..."
                  />
                </div>

                <div>
                  <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-300 mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Any special instructions for crews..."
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Template'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobTemplateEditor;
