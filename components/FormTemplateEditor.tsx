import React, { useState, useEffect } from 'react';
import { FormTemplate, FormField } from '../types';
import { formService } from '../services/apiService';
import XIcon from './icons/XIcon';

interface FormTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: FormTemplate) => void;
  template?: FormTemplate;
}

interface FormData {
  name: string;
  description: string;
  category: string;
  fields: FormField[];
  requireSignature: boolean;
  requirePhotos: string;
}

interface FormErrors {
  name?: string;
  fields?: string;
  requirePhotos?: string;
}

const categories = ['safety', 'inspection', 'equipment', 'approval', 'completion', 'custom'];
const fieldTypes: Array<FormField['type']> = ['text', 'number', 'checkbox', 'select', 'textarea', 'date', 'signature'];

const FormTemplateEditor: React.FC<FormTemplateEditorProps> = ({ isOpen, onClose, onSave, template }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'custom',
    fields: [],
    requireSignature: false,
    requirePhotos: '0',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'custom',
        fields: template.fields || [],
        requireSignature: template.requireSignature || false,
        requirePhotos: template.requirePhotos?.toString() || '0',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'custom',
        fields: [],
        requireSignature: false,
        requirePhotos: '0',
      });
    }
    setErrors({});
    setApiError(null);
  }, [template, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (formData.fields.length === 0) {
      newErrors.fields = 'At least one field is required';
    }

    const requirePhotos = parseInt(formData.requirePhotos);
    if (isNaN(requirePhotos) || requirePhotos < 0) {
      newErrors.requirePhotos = 'Must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleAddField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      options: [],
    };
    setFormData(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    if (errors.fields) {
      setErrors(prev => ({ ...prev, fields: undefined }));
    }
  };

  const handleRemoveField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
    }));
  };

  const handleFieldChange = (fieldId: string, key: keyof FormField, value: any) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === fieldId ? { ...f, [key]: value } : f
      ),
    }));
  };

  const handleFieldOptionsChange = (fieldId: string, optionsText: string) => {
    const options = optionsText.split('\n').map(o => o.trim()).filter(o => o);
    handleFieldChange(fieldId, 'options', options);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const templateData: Partial<FormTemplate> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        fields: formData.fields,
        requireSignature: formData.requireSignature,
        requirePhotos: parseInt(formData.requirePhotos) || undefined,
        isActive: true,
      };

      let savedTemplate: FormTemplate;
      if (template) {
        savedTemplate = await formService.updateTemplate(template.id, templateData);
      } else {
        savedTemplate = await formService.createTemplate(templateData);
      }

      onSave(savedTemplate);
      onClose();
    } catch (err: any) {
      console.error('Error saving template:', err);
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
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {template ? 'Edit Form Template' : 'Create New Form Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#0a1628] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g., Pre-Job Safety Inspection"
              />
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-[#0a1628] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Describe the purpose of this form..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#0a1628] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 capitalize"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300">
                  Form Fields *
                </label>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Field
                </button>
              </div>

              {errors.fields && <p className="mb-3 text-sm text-red-400">{errors.fields}</p>}

              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-[#0a1628] border border-gray-700 rounded-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-400">Field {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Field Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0f1c2e] border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 capitalize"
                        >
                          {fieldTypes.map(type => (
                            <option key={type} value={type} className="capitalize">
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Field Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0f1c2e] border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g., Safety Equipment Checked"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)}
                        className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-600 rounded bg-[#0f1c2e]"
                      />
                      <label className="ml-2 text-sm text-gray-300">Required field</label>
                    </div>

                    {field.type === 'select' && (
                      <div className="mt-3">
                        <label className="block text-xs text-gray-400 mb-1">Options (one per line)</label>
                        <textarea
                          value={field.options?.join('\n') || ''}
                          onChange={(e) => handleFieldOptionsChange(field.id, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 bg-[#0f1c2e] border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {formData.fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-700 rounded-md">
                    No fields added yet. Click "Add Field" to get started.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="requireSignature"
                  checked={formData.requireSignature}
                  onChange={handleChange}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-600 rounded bg-[#0a1628]"
                />
                <label className="ml-2 text-sm text-gray-300">Require signature on completion</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of required photos
                </label>
                <input
                  type="number"
                  name="requirePhotos"
                  value={formData.requirePhotos}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 bg-[#0a1628] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {errors.requirePhotos && <p className="mt-1 text-sm text-red-400">{errors.requirePhotos}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1628]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormTemplateEditor;
