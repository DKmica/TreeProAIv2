import React, { useState, useEffect } from 'react';
import { Lead, Client, Property, CustomerDetailsInput } from '../types';
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

interface NewCustomerData {
  companyName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
}

interface FormErrors {
  clientId?: string;
  source?: string;
  estimatedValue?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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
  
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>({
    companyName: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
  });

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
      setCustomerMode('existing');
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
      setCustomerMode('existing');
      setNewCustomerData({
        companyName: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
      });
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

    if (customerMode === 'existing') {
      if (!formData.clientId) {
        newErrors.clientId = 'Client is required';
      }
    } else {
      if (!newCustomerData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!newCustomerData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (!newCustomerData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
      if (!newCustomerData.email.trim()) {
        newErrors.email = 'Email address is required';
      }
      if (!newCustomerData.addressLine1.trim()) {
        newErrors.addressLine1 = 'Address is required';
      }
      if (!newCustomerData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!newCustomerData.state.trim()) {
        newErrors.state = 'State is required';
      }
      if (!newCustomerData.zipCode.trim()) {
        newErrors.zipCode = 'Zip code is required';
      }
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

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCustomerData(prev => ({ ...prev, [name]: value }));
    
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
      let clientId = formData.clientId || '';
      let customerDetails: CustomerDetailsInput | undefined;

      if (customerMode === 'new') {
        customerDetails = {
          firstName: newCustomerData.firstName,
          lastName: newCustomerData.lastName,
          companyName: newCustomerData.companyName || undefined,
          phone: newCustomerData.phone,
          email: newCustomerData.email,
          addressLine1: newCustomerData.addressLine1,
          addressLine2: newCustomerData.addressLine2 || undefined,
          city: newCustomerData.city,
          state: newCustomerData.state,
          zipCode: newCustomerData.zipCode,
          country: 'USA'
        };
        clientId = '';
      }

      const leadData: Partial<Lead> & { customerDetails?: CustomerDetailsInput } = {
        clientId: clientId || undefined,
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

      if (customerDetails) {
        leadData.customerDetails = customerDetails;
      }

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

  const handleCustomerModeChange = (mode: 'existing' | 'new') => {
    setCustomerMode(mode);
    if (mode === 'new') {
      setFormData(prev => ({ ...prev, clientId: '', propertyId: '' }));
      setProperties([]);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isFormValid = () => {
    if (customerMode === 'existing') {
      if (!formData.clientId) return false;
    } else {
      if (!newCustomerData.firstName.trim() || !newCustomerData.lastName.trim()) return false;
      if (!newCustomerData.phone.trim() || !newCustomerData.email.trim()) return false;
      if (!newCustomerData.addressLine1.trim() || !newCustomerData.city.trim()) return false;
      if (!newCustomerData.state.trim() || !newCustomerData.zipCode.trim()) return false;
    }
    if (!formData.source.trim()) return false;
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
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">
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
          <div className="px-4 sm:px-6 py-4 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Customer <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="customerMode"
                    value="existing"
                    checked={customerMode === 'existing'}
                    onChange={(e) => handleCustomerModeChange(e.target.value as 'existing' | 'new')}
                    className="mr-2 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">Select Existing Customer</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="customerMode"
                    value="new"
                    checked={customerMode === 'new'}
                    onChange={(e) => handleCustomerModeChange(e.target.value as 'existing' | 'new')}
                    className="mr-2 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">Create New Customer</span>
                </label>
              </div>
            </div>

            {customerMode === 'existing' ? (
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-1">
                  Select Client <span className="text-red-400">*</span>
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
            ) : (
              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">New Customer Information</h3>
                
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-1">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={newCustomerData.companyName}
                    onChange={handleNewCustomerChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Enter company name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={newCustomerData.firstName}
                      onChange={handleNewCustomerChange}
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
                      value={newCustomerData.lastName}
                      onChange={handleNewCustomerChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="Last name"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={newCustomerData.phone}
                      onChange={handleNewCustomerChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="(555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={newCustomerData.email}
                      onChange={handleNewCustomerChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="email@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-300 mb-1">
                    Address Line 1 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    value={newCustomerData.addressLine1}
                    onChange={handleNewCustomerChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Street address"
                  />
                  {errors.addressLine1 && (
                    <p className="mt-1 text-sm text-red-400">{errors.addressLine1}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-300 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={newCustomerData.addressLine2}
                    onChange={handleNewCustomerChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Apt, suite, unit, etc."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={newCustomerData.city}
                      onChange={handleNewCustomerChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-1">
                      State <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={newCustomerData.state}
                      onChange={handleNewCustomerChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="CA"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-400">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-300 mb-1">
                      Zip Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={newCustomerData.zipCode}
                      onChange={handleNewCustomerChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="12345"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-red-400">{errors.zipCode}</p>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      billingAddressLine1: newCustomerData.addressLine1,
                      billingAddressLine2: newCustomerData.addressLine2,
                      billingCity: newCustomerData.city,
                      billingState: newCustomerData.state,
                      billingZipCode: newCustomerData.zipCode,
                    } as any));
                  }}
                  className="mt-3 w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Use as Billing Address
                </button>
              </div>
            )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              'Save Lead'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadEditor;
