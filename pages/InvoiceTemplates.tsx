import React, { useState, useEffect, useMemo } from 'react';
import { InvoiceTemplate } from '../types';
import { invoiceTemplateService } from '../services/apiService';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { Check, X, Star, Palette, Edit2, Trash2 } from 'lucide-react';

interface TemplateFormData {
  name: string;
  description: string;
  logoUrl: string;
  headerText: string;
  footerText: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  defaultPaymentTerms: string;
  defaultTaxRate: number;
  defaultNotes: string;
  defaultCustomerNotes: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  isActive: boolean;
}

const defaultFormData: TemplateFormData = {
  name: '',
  description: '',
  logoUrl: '',
  headerText: '',
  footerText: '',
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  defaultPaymentTerms: 'Net 30',
  defaultTaxRate: 0,
  defaultNotes: '',
  defaultCustomerNotes: '',
  primaryColor: '#0891b2',
  secondaryColor: '#164e63',
  fontFamily: 'Inter',
  isActive: true,
};

const fontOptions = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Arial',
  'Helvetica',
  'Times New Roman',
];

const paymentTermsOptions = [
  'Due on Receipt',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
];

const InvoiceTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await invoiceTemplateService.getAll();
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to load invoice templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return templates;
    const term = searchTerm.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term))
    );
  }, [templates, searchTerm]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setFormData(defaultFormData);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      logoUrl: template.logoUrl || '',
      headerText: template.headerText || '',
      footerText: template.footerText || '',
      companyName: template.companyName || '',
      companyAddress: template.companyAddress || '',
      companyPhone: template.companyPhone || '',
      companyEmail: template.companyEmail || '',
      companyWebsite: template.companyWebsite || '',
      defaultPaymentTerms: template.defaultPaymentTerms || 'Net 30',
      defaultTaxRate: template.defaultTaxRate || 0,
      defaultNotes: template.defaultNotes || '',
      defaultCustomerNotes: template.defaultCustomerNotes || '',
      primaryColor: template.primaryColor || '#0891b2',
      secondaryColor: template.secondaryColor || '#164e63',
      fontFamily: template.fontFamily || 'Inter',
      isActive: template.isActive,
    });
    setIsEditorOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    try {
      await invoiceTemplateService.remove(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      alert(`Failed to delete template: ${err.message}`);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await invoiceTemplateService.setDefault(templateId);
      setTemplates(prev => prev.map(t => ({
        ...t,
        isDefault: t.id === templateId
      })));
    } catch (err: any) {
      console.error('Failed to set default template:', err);
      alert(`Failed to set default: ${err.message}`);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Template name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        const updated = await invoiceTemplateService.update(editingTemplate.id, formData);
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await invoiceTemplateService.create(formData);
        setTemplates(prev => [...prev, created]);
      }
      setIsEditorOpen(false);
      setEditingTemplate(null);
      setFormData(defaultFormData);
    } catch (err: any) {
      console.error('Failed to save template:', err);
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (field: keyof TemplateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerIcon className="h-12 w-12 text-cyan-500" />
        <span className="ml-3 text-gray-300 text-lg">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <DocumentTextIcon className="h-8 w-8 text-cyan-500" />
            Invoice Templates
          </h1>
          <p className="mt-1 text-gray-400">Create and manage invoice branding templates</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Create New Template
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Invoice Templates</h3>
          <p className="text-gray-400 mb-6">Create your first invoice template to customize your invoice branding</p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`relative bg-gray-800 border rounded-lg overflow-hidden transition-all hover:border-cyan-500/50 ${
                template.isDefault ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-gray-700'
              }`}
            >
              <div 
                className="h-3 w-full" 
                style={{ 
                  background: `linear-gradient(to right, ${template.primaryColor}, ${template.secondaryColor})` 
                }} 
              />
              
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white truncate">{template.name}</h3>
                      {template.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-full">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      {template.isSystem && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
                          System
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <div className="flex items-center gap-1">
                      <span 
                        className="w-4 h-4 rounded-full border border-gray-600" 
                        style={{ backgroundColor: template.primaryColor }} 
                      />
                      <span 
                        className="w-4 h-4 rounded-full border border-gray-600" 
                        style={{ backgroundColor: template.secondaryColor }} 
                      />
                      <span className="ml-2">{template.fontFamily}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment Terms: {template.defaultPaymentTerms}</span>
                    <span>Tax: {template.defaultTaxRate}%</span>
                  </div>
                  {template.usageCount > 0 && (
                    <div className="text-cyan-400">
                      Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
                  {!template.isDefault && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                    >
                      <Star className="h-4 w-4" />
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                  {!template.isSystem && deleteConfirmId !== template.id && (
                    <button
                      onClick={() => setDeleteConfirmId(template.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {deleteConfirmId === template.id && (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-gray-400 mr-1">Delete?</span>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-700 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingTemplate ? 'Edit Invoice Template' : 'Create Invoice Template'}
              </h2>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Professional Template"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                    placeholder="Brief description of this template..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleFormChange('companyName', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Logo URL</label>
                    <input
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) => handleFormChange('logoUrl', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.companyAddress}
                      onChange={(e) => handleFormChange('companyAddress', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.companyPhone}
                      onChange={(e) => handleFormChange('companyPhone', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => handleFormChange('companyEmail', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                    <input
                      type="text"
                      value={formData.companyWebsite}
                      onChange={(e) => handleFormChange('companyWebsite', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Invoice Defaults</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Payment Terms</label>
                    <select
                      value={formData.defaultPaymentTerms}
                      onChange={(e) => handleFormChange('defaultPaymentTerms', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-cyan-500"
                    >
                      {paymentTermsOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      value={formData.defaultTaxRate}
                      onChange={(e) => handleFormChange('defaultTaxRate', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Header Text</label>
                    <input
                      type="text"
                      value={formData.headerText}
                      onChange={(e) => handleFormChange('headerText', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                      placeholder="Text to appear at the top of invoices"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Footer Text</label>
                    <input
                      type="text"
                      value={formData.footerText}
                      onChange={(e) => handleFormChange('footerText', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                      placeholder="Text to appear at the bottom of invoices"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Default Notes</label>
                    <textarea
                      value={formData.defaultNotes}
                      onChange={(e) => handleFormChange('defaultNotes', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                      placeholder="Internal notes for reference..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Default Customer Message</label>
                    <textarea
                      value={formData.defaultCustomerNotes}
                      onChange={(e) => handleFormChange('defaultCustomerNotes', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                      placeholder="Thank you for your business..."
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => handleFormChange('primaryColor', e.target.value)}
                        className="h-10 w-16 bg-transparent border border-gray-700 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => handleFormChange('primaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => handleFormChange('secondaryColor', e.target.value)}
                        className="h-10 w-16 bg-transparent border border-gray-700 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.secondaryColor}
                        onChange={(e) => handleFormChange('secondaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Font Family</label>
                    <select
                      value={formData.fontFamily}
                      onChange={(e) => handleFormChange('fontFamily', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-cyan-500"
                    >
                      {fontOptions.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Preview</p>
                  <div 
                    className="h-2 rounded-full mb-2" 
                    style={{ 
                      background: `linear-gradient(to right, ${formData.primaryColor}, ${formData.secondaryColor})` 
                    }} 
                  />
                  <p 
                    className="text-lg font-semibold" 
                    style={{ fontFamily: formData.fontFamily, color: formData.primaryColor }}
                  >
                    {formData.name || 'Template Name'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                    className="w-5 h-5 bg-gray-900 border-gray-700 rounded text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-gray-300">Active (can be used for new invoices)</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving && <SpinnerIcon className="h-4 w-4" />}
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTemplates;
