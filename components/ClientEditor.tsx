import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { clientService } from '../services/apiService';
import XIcon from './icons/XIcon';
import StateSelect from './ui/StateSelect';
import { formatPhone } from '../utils/formatters';

interface ClientEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  client?: Client;
}

interface FormData {
  clientType: 'residential' | 'commercial' | 'property_manager';
  isCompany: boolean;
  companyName: string;
  industry: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  primaryPhone: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  status: 'active' | 'inactive';
  notes: string;
}

interface FormErrors {
  clientType?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
}

const ClientEditor: React.FC<ClientEditorProps> = ({ isOpen, onClose, onSave, client }) => {
  const [formData, setFormData] = useState<FormData>({
    clientType: 'residential',
    isCompany: false,
    companyName: '',
    industry: '',
    firstName: '',
    lastName: '',
    primaryEmail: '',
    primaryPhone: '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: 'USA',
    status: 'active',
    notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setFormData({
        clientType: client.clientType,
        isCompany: !!client.companyName,
        companyName: client.companyName || '',
        industry: client.industry || '',
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        primaryEmail: client.primaryEmail || '',
        primaryPhone: client.primaryPhone || '',
        billingAddressLine1: client.billingAddressLine1 || '',
        billingAddressLine2: client.billingAddressLine2 || '',
        billingCity: client.billingCity || '',
        billingState: client.billingState || '',
        billingZip: client.billingZip || '',
        billingCountry: client.billingCountry || 'USA',
        status: client.status,
        notes: client.notes || '',
      });
    } else {
      setFormData({
        clientType: 'residential',
        isCompany: false,
        companyName: '',
        industry: '',
        firstName: '',
        lastName: '',
        primaryEmail: '',
        primaryPhone: '',
        billingAddressLine1: '',
        billingAddressLine2: '',
        billingCity: '',
        billingState: '',
        billingZip: '',
        billingCountry: 'USA',
        status: 'active',
        notes: '',
      });
    }
    setErrors({});
    setApiError(null);
  }, [client, isOpen]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    return phone.length >= 10 && phoneRegex.test(phone);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.primaryEmail) {
      newErrors.primaryEmail = 'Email is required';
    } else if (!validateEmail(formData.primaryEmail)) {
      newErrors.primaryEmail = 'Invalid email format';
    }

    if (!formData.primaryPhone) {
      newErrors.primaryPhone = 'Phone number is required';
    } else if (!validatePhone(formData.primaryPhone)) {
      newErrors.primaryPhone = 'Invalid phone format (minimum 10 digits)';
    }

    if (formData.isCompany) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      }
    } else {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const clientData: Partial<Client> = {
        clientType: formData.clientType,
        companyName: formData.isCompany ? formData.companyName : undefined,
        industry: formData.isCompany ? formData.industry || undefined : undefined,
        firstName: !formData.isCompany ? formData.firstName : undefined,
        lastName: !formData.isCompany ? formData.lastName : undefined,
        primaryEmail: formData.primaryEmail,
        primaryPhone: formData.primaryPhone,
        billingAddressLine1: formData.billingAddressLine1 || undefined,
        billingAddressLine2: formData.billingAddressLine2 || undefined,
        billingCity: formData.billingCity || undefined,
        billingState: formData.billingState || undefined,
        billingZip: formData.billingZip || undefined,
        billingCountry: formData.billingCountry,
        status: formData.status,
        notes: formData.notes || undefined,
        paymentTerms: 'Net 30',
        taxExempt: false,
        lifetimeValue: 0,
      };

      let savedClient: Client;
      if (client) {
        savedClient = await clientService.update(client.id, clientData);
      } else {
        savedClient = await clientService.create(clientData);
      }

      onSave(savedClient);
      onClose();
    } catch (err: any) {
      console.error('Error saving client:', err);
      setApiError(err.message || 'Failed to save client');
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
    if (!formData.primaryEmail || !formData.primaryPhone) return false;
    if (!validateEmail(formData.primaryEmail)) return false;
    if (!validatePhone(formData.primaryPhone)) return false;
    if (formData.isCompany && !formData.companyName.trim()) return false;
    if (!formData.isCompany && (!formData.firstName.trim() || !formData.lastName.trim())) return false;
    return true;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {client ? 'Edit Client' : 'Add Client'}
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Client Type <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-4">
                {(['residential', 'commercial', 'property_manager'] as const).map((type) => (
                  <label key={type} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="clientType"
                      value={type}
                      checked={formData.clientType === type}
                      onChange={handleChange}
                      className="mr-2 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-gray-200 capitalize">{type.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isCompany"
                  checked={formData.isCompany}
                  onChange={handleChange}
                  className="mr-2 text-cyan-500 focus:ring-cyan-500 rounded"
                />
                <span className="text-gray-200">This is a company</span>
              </label>
            </div>

            {formData.isCompany ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Enter company name"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-400">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="e.g., Property Management, Construction"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="First name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="primaryEmail" className="block text-sm font-medium text-gray-300 mb-1">
                    Primary Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    id="primaryEmail"
                    name="primaryEmail"
                    value={formData.primaryEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="email@example.com"
                  />
                  {errors.primaryEmail && (
                    <p className="mt-1 text-sm text-red-400">{errors.primaryEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="primaryPhone" className="block text-sm font-medium text-gray-300 mb-1">
                    Primary Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    id="primaryPhone"
                    name="primaryPhone"
                    value={formData.primaryPhone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setFormData(prev => ({ ...prev, primaryPhone: formatted }));
                      if (errors.primaryPhone) {
                        setErrors(prev => ({ ...prev, primaryPhone: undefined }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="(555) 123-4567"
                  />
                  {errors.primaryPhone && (
                    <p className="mt-1 text-sm text-red-400">{errors.primaryPhone}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="billingAddressLine1" className="block text-sm font-medium text-gray-300 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="billingAddressLine1"
                    name="billingAddressLine1"
                    value={formData.billingAddressLine1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="123 Main St"
                  />
                </div>

                <div>
                  <label htmlFor="billingAddressLine2" className="block text-sm font-medium text-gray-300 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    id="billingAddressLine2"
                    name="billingAddressLine2"
                    value={formData.billingAddressLine2}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Apt, Suite, etc."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="billingCity" className="block text-sm font-medium text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="billingCity"
                      name="billingCity"
                      value={formData.billingCity}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label htmlFor="billingState" className="block text-sm font-medium text-gray-300 mb-1">
                      State/Province
                    </label>
                    <StateSelect
                      id="billingState"
                      name="billingState"
                      value={formData.billingState}
                      onChange={(value) => setFormData(prev => ({ ...prev, billingState: value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="billingZip" className="block text-sm font-medium text-gray-300 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="billingZip"
                      name="billingZip"
                      value={formData.billingZip}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="12345"
                    />
                  </div>

                  <div>
                    <label htmlFor="billingCountry" className="block text-sm font-medium text-gray-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      id="billingCountry"
                      name="billingCountry"
                      value={formData.billingCountry}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="USA"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <div className="space-y-4">
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Add any notes about this client..."
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
              'Save Client'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientEditor;
