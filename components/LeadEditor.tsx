import React, { useState, useEffect } from 'react';
import { Lead, Client, Property } from '../types';
import { leadService, clientService } from '../services/apiService';
import XIcon from './icons/XIcon';

interface LeadEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  lead?: Lead;
}

interface FormData {
  clientId: string;
  propertyId: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  assignedTo: string;
  estimatedValue: string;
  expectedCloseDate: string;
  nextFollowupDate: string;
}

interface FormErrors {
  clientId?: string;
  source?: string;
  estimatedValue?: string;
}

const LeadEditor: React.FC<LeadEditorProps> = ({ isOpen, onClose, onSave, lead }) => {
  const [formData, setFormData] = useState<FormData>({
    clientId: '',
    propertyId: '',
    source: '',
    status: 'New',
    priority: 'medium',
    description: '',
    assignedTo: '',
    estimatedValue: '',
    expectedCloseDate: '',
    nextFollowupDate: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (lead) {
      setFormData({
        clientId: lead.clientId || '',
        propertyId: lead.propertyId || '',
        source: lead.source || '',
        status: lead.status,
        priority: lead.priority,
        description: lead.description || '',
        assignedTo: lead.assignedTo || '',
        estimatedValue: lead.estimatedValue ? lead.estimatedValue.toString() : '',
        expectedCloseDate: lead.expectedCloseDate || '',
        nextFollowupDate: lead.nextFollowupDate || '',
      });
      if (lead.clientId) {
        fetchProperties(lead.clientId);
      }
    } else {
      setFormData({
        clientId: '',
        propertyId: '',
        source: '',
        status: 'New',
        priority: 'medium',
        description: '',
        assignedTo: '',
        estimatedValue: '',
        expectedCloseDate: '',
        nextFollowupDate: '',
      });
      setProperties([]);
    }
    setErrors({});
    setApiError(null);
  }, [lead, isOpen]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const clientsData = await clientService.getAll();
      setClients(clientsData);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchProperties = async (clientId: string) => {
    if (!clientId) {
      setProperties([]);
      return;
    }
    setLoadingProperties(true);
    try {
      const propertiesData = await clientService.getProperties(clientId);
      setProperties(propertiesData);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }

    if (!formData.source.trim()) {
      newErrors.source = 'Lead source is required';
    }

    if (formData.estimatedValue && isNaN(parseFloat(formData.estimatedValue))) {
      newErrors.estimatedValue = 'Estimated value must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'clientId') {
      fetchProperties(value);
      setFormData(prev => ({ ...prev, propertyId: '' }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const leadData: Partial<Lead> = {
        clientId: formData.clientId || undefined,
        propertyId: formData.propertyId || undefined,
        source: formData.source,
        status: formData.status,
        priority: formData.priority,
        description: formData.description || undefined,
        assignedTo: formData.assignedTo || undefined,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
        expectedCloseDate: formData.expectedCloseDate || undefined,
        nextFollowupDate: formData.nextFollowupDate || undefined,
        leadScore: 50,
      };

      let savedLead: Lead;
      if (lead) {
        savedLead = await leadService.update(lead.id, leadData);
      } else {
        savedLead = await leadService.create(leadData);
      }

      onSave(savedLead);
      onClose();
    } catch (err: any) {
      console.error('Error saving lead:', err);
      setApiError(err.message || 'Failed to save lead');
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

  const isFormValid = () => {
    if (!formData.clientId || !formData.source.trim()) return false;
    if (formData.estimatedValue && isNaN(parseFloat(formData.estimatedValue))) return false;
    return true;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {lead ? 'Edit Lead' : 'Add Lead'}
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
          <div className="p-6 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-1">
                Client <span className="text-red-400">*</span>
              </label>
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                disabled={loadingClients}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName || `${client.firstName} ${client.lastName}`}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-400">{errors.clientId}</p>
              )}
            </div>

            <div>
              <label htmlFor="propertyId" className="block text-sm font-medium text-gray-300 mb-1">
                Property (Optional)
              </label>
              <select
                id="propertyId"
                name="propertyId"
                value={formData.propertyId}
                onChange={handleChange}
                disabled={loadingProperties || !formData.clientId}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
              >
                <option value="">Select a property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.propertyName || property.addressLine1}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-300 mb-1">
                  Lead Source <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g., Website, Referral, Cold Call"
                />
                {errors.source && (
                  <p className="mt-1 text-sm text-red-400">{errors.source}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
                  Status <span className="text-red-400">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-1">
                  Priority <span className="text-red-400">*</span>
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="estimatedValue" className="block text-sm font-medium text-gray-300 mb-1">
                  Estimated Value ($)
                </label>
                <input
                  type="number"
                  id="estimatedValue"
                  name="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
                {errors.estimatedValue && (
                  <p className="mt-1 text-sm text-red-400">{errors.estimatedValue}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-300 mb-1">
                Assigned To
              </label>
              <input
                type="text"
                id="assignedTo"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Employee name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expectedCloseDate" className="block text-sm font-medium text-gray-300 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  id="expectedCloseDate"
                  name="expectedCloseDate"
                  value={formData.expectedCloseDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label htmlFor="nextFollowupDate" className="block text-sm font-medium text-gray-300 mb-1">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  id="nextFollowupDate"
                  name="nextFollowupDate"
                  value={formData.nextFollowupDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
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
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                placeholder="Add any notes about this lead..."
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
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
              'Save Lead'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadEditor;
