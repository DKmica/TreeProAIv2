import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QuickBooksIcon from '../components/icons/QuickBooksIcon';
import StripeIcon from '../components/icons/StripeIcon';
import GoogleCalendarIcon from '../components/icons/GoogleCalendarIcon';
import { CustomFieldDefinition, DocumentTemplate } from '../types';
import { mockCustomFields, mockDocumentTemplates } from '../data/mockData';
import PuzzlePieceIcon from '../components/icons/PuzzlePieceIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';

interface CompanyProfile {
  id?: string;
  companyName: string;
  tagline: string;
  email: string;
  phoneNumber: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  businessHours: string;
  logoUrl: string;
  taxEin: string;
  licenseNumber: string;
  insurancePolicyNumber: string;
}

interface IntegrationStatus {
  stripe: boolean;
  googleCalendar: boolean;
  quickBooks: boolean;
}

const Settings: React.FC = () => {
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(mockCustomFields);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>(mockDocumentTemplates);

  // State for company profile
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    companyName: '',
    tagline: '',
    email: '',
    phoneNumber: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    businessHours: '',
    logoUrl: '',
    taxEin: '',
    licenseNumber: '',
    insurancePolicyNumber: ''
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // State for integrations
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    stripe: false,
    googleCalendar: false,
    quickBooks: false
  });
  const [connectingIntegration, setConnectingIntegration] = useState<string | null>(null);

  // State for the custom field form
  const [selectedEntity, setSelectedEntity] = useState<CustomFieldDefinition['entityType']>('client');
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['fieldType']>('text');

  // State for template editing
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState('');

  // Fetch company profile on mount
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const response = await fetch('/api/company-profile');
        if (response.ok) {
          const data = await response.json();
          setCompanyProfile({
            companyName: data.companyName || '',
            tagline: data.tagline || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber || '',
            website: data.website || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            businessHours: data.businessHours || '',
            logoUrl: data.logoUrl || '',
            taxEin: data.taxEin || '',
            licenseNumber: data.licenseNumber || '',
            insurancePolicyNumber: data.insurancePolicyNumber || ''
          });
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchCompanyProfile();
  }, []);

  const filteredFields = useMemo(() => {
    return customFields.filter(field => field.entityType === selectedEntity);
  }, [customFields, selectedEntity]);

  const entityOptions: { value: CustomFieldDefinition['entityType']; label: string }[] = [
    { value: 'client', label: 'Clients' },
    { value: 'lead', label: 'Leads' },
    { value: 'quote', label: 'Quotes' },
    { value: 'job', label: 'Jobs' },
    { value: 'property', label: 'Properties' },
  ];
  
  const handleSaveField = () => {
    if (!newFieldName.trim()) {
      alert('Field name cannot be empty.');
      return;
    }
    const fieldLabel = newFieldName.trim();
    const fieldName = fieldLabel
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const timestamp = new Date().toISOString();
    const displayOrder = filteredFields.length + 1;

    const newField: CustomFieldDefinition = {
      id: `cf_${selectedEntity}_${Date.now()}`,
      entityType: selectedEntity,
      fieldName: fieldName || `custom_field_${Date.now()}`,
      fieldLabel,
      fieldType: newFieldType,
      isRequired: false,
      displayOrder,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(newFieldType === 'checkbox' ? { defaultValue: 'false' } : {}),
    };
    setCustomFields(prev => [...prev, newField]);
    setNewFieldName('');
    setNewFieldType('text');
    setIsAddingField(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (window.confirm('Are you sure you want to delete this custom field?')) {
      setCustomFields(prev => prev.filter(field => field.id !== fieldId));
    }
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setTemplateContent(template.content || '');
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      setDocumentTemplates(prev => 
        prev.map(t => t.id === editingTemplate.id 
          ? { ...t, content: templateContent } 
          : t
        )
      );
      setEditingTemplate(null);
      setTemplateContent('');
    }
  };

  const handleCancelEditTemplate = () => {
    setEditingTemplate(null);
    setTemplateContent('');
  };

  const handleCompanyProfileChange = (field: keyof CompanyProfile, value: string) => {
    setCompanyProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleIntegrationConnect = async (integration: string) => {
    setConnectingIntegration(integration);
    try {
      // Check if integration is already connected
      const response = await fetch(`/api/integrations/${integration}/status`);
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          alert(`${integration.charAt(0).toUpperCase() + integration.slice(1)} is already connected!`);
          setConnectingIntegration(null);
          return;
        }
      }

      // Trigger setup based on integration type
      switch (integration) {
        case 'stripe':
          window.location.href = '/settings?tab=stripe-setup';
          break;
        case 'googleCalendar':
          window.location.href = '/settings?tab=google-calendar-setup';
          break;
        case 'quickBooks':
          alert('QuickBooks integration is coming soon!');
          break;
        default:
          alert(`Setting up ${integration}...`);
      }
    } catch (error) {
      console.error(`Error connecting ${integration}:`, error);
      alert(`Failed to connect ${integration}. Please try again.`);
    } finally {
      setConnectingIntegration(null);
    }
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const response = await fetch('/api/company-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyProfile),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setCompanyProfile({
          companyName: updatedData.companyName || '',
          tagline: updatedData.tagline || '',
          email: updatedData.email || '',
          phoneNumber: updatedData.phoneNumber || '',
          website: updatedData.website || '',
          address: updatedData.address || '',
          city: updatedData.city || '',
          state: updatedData.state || '',
          zipCode: updatedData.zipCode || '',
          businessHours: updatedData.businessHours || '',
          logoUrl: updatedData.logoUrl || '',
          taxEin: updatedData.taxEin || '',
          licenseNumber: updatedData.licenseNumber || '',
          insurancePolicyNumber: updatedData.insurancePolicyNumber || ''
        });
        alert('Company information saved successfully!');
      } else {
        alert('Failed to save company information. Please try again.');
      }
    } catch (error) {
      console.error('Error saving company profile:', error);
      alert('An error occurred while saving. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };


  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Settings</h1>
      <p className="mt-2 text-sm text-brand-gray-700">Manage your profile, company information, and application settings.</p>

      <div className="mt-8 space-y-12">
        {/* My Profile Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">My Profile</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Update your personal information and password.</p>
          </div>

          <form className="md:col-span-2">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="first-name" className="block text-sm font-medium leading-6 text-brand-gray-900">First name</label>
                <div className="mt-2">
                  <input type="text" name="first-name" id="first-name" autoComplete="given-name" defaultValue="Admin" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="last-name" className="block text-sm font-medium leading-6 text-brand-gray-900">Last name</label>
                <div className="mt-2">
                  <input type="text" name="last-name" id="last-name" autoComplete="family-name" defaultValue="User" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-gray-900">Email address</label>
                <div className="mt-2">
                  <input id="email" name="email" type="email" autoComplete="email" defaultValue="admin@tree-pro.ai" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-x-6">
                <button type="button" className="text-sm font-semibold leading-6 text-brand-gray-900">Change Password</button>
                <button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-500">Save Profile</button>
            </div>
          </form>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Company Information Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Company Information</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">This information will be displayed on quotes and invoices.</p>
          </div>

          <form className="md:col-span-2" onSubmit={handleSaveCompanyProfile}>
            {isLoadingProfile ? (
              <div className="text-center py-8 text-brand-gray-500">Loading company information...</div>
            ) : (
              <div className="space-y-8">
                {/* Basic Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold text-brand-gray-800 mb-4">Basic Contact Information</h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="company-name" className="block text-sm font-medium leading-6 text-brand-gray-900">Company Name</label>
                      <input 
                        type="text" 
                        id="company-name" 
                        value={companyProfile.companyName}
                        onChange={(e) => handleCompanyProfileChange('companyName', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="tagline" className="block text-sm font-medium leading-6 text-brand-gray-900">Tagline</label>
                      <input 
                        type="text" 
                        id="tagline" 
                        value={companyProfile.tagline}
                        onChange={(e) => handleCompanyProfileChange('tagline', e.target.value)}
                        placeholder="e.g., Professional Tree Services"
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-gray-900">Email</label>
                      <input 
                        type="email" 
                        id="email" 
                        value={companyProfile.email}
                        onChange={(e) => handleCompanyProfileChange('email', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="phone-number" className="block text-sm font-medium leading-6 text-brand-gray-900">Phone Number</label>
                      <input 
                        type="tel" 
                        id="phone-number" 
                        value={companyProfile.phoneNumber}
                        onChange={(e) => handleCompanyProfileChange('phoneNumber', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-6">
                      <label htmlFor="website" className="block text-sm font-medium leading-6 text-brand-gray-900">Website</label>
                      <input 
                        type="url" 
                        id="website" 
                        value={companyProfile.website}
                        onChange={(e) => handleCompanyProfileChange('website', e.target.value)}
                        placeholder="https://www.example.com"
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                  </div>
                </div>

                {/* Business Address */}
                <div className="pt-6 border-t border-brand-gray-200">
                  <h3 className="text-sm font-semibold text-brand-gray-800 mb-4">Business Address</h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                    <div className="col-span-full">
                      <label htmlFor="address" className="block text-sm font-medium leading-6 text-brand-gray-900">Street Address</label>
                      <input 
                        type="text" 
                        id="address" 
                        value={companyProfile.address}
                        onChange={(e) => handleCompanyProfileChange('address', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="city" className="block text-sm font-medium leading-6 text-brand-gray-900">City</label>
                      <input 
                        type="text" 
                        id="city" 
                        value={companyProfile.city}
                        onChange={(e) => handleCompanyProfileChange('city', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="state" className="block text-sm font-medium leading-6 text-brand-gray-900">State</label>
                      <input 
                        type="text" 
                        id="state" 
                        value={companyProfile.state}
                        onChange={(e) => handleCompanyProfileChange('state', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="zip-code" className="block text-sm font-medium leading-6 text-brand-gray-900">ZIP Code</label>
                      <input 
                        type="text" 
                        id="zip-code" 
                        value={companyProfile.zipCode}
                        onChange={(e) => handleCompanyProfileChange('zipCode', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div className="pt-6 border-t border-brand-gray-200">
                  <h3 className="text-sm font-semibold text-brand-gray-800 mb-4">Business Details</h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                    <div className="col-span-full">
                      <label htmlFor="business-hours" className="block text-sm font-medium leading-6 text-brand-gray-900">Business Hours</label>
                      <input 
                        type="text" 
                        id="business-hours" 
                        value={companyProfile.businessHours}
                        onChange={(e) => handleCompanyProfileChange('businessHours', e.target.value)}
                        placeholder="e.g., Mon-Fri: 8AM-5PM, Sat: 9AM-2PM"
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="col-span-full">
                      <label htmlFor="logo-url" className="block text-sm font-medium leading-6 text-brand-gray-900">Company Logo URL</label>
                      <input 
                        type="url" 
                        id="logo-url" 
                        value={companyProfile.logoUrl}
                        onChange={(e) => handleCompanyProfileChange('logoUrl', e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                      <p className="mt-2 text-sm text-brand-gray-500">Enter the URL of your company logo</p>
                    </div>
                  </div>
                </div>

                {/* Legal & Regulatory Information */}
                <div className="pt-6 border-t border-brand-gray-200">
                  <h3 className="text-sm font-semibold text-brand-gray-800 mb-4">Legal & Regulatory Information</h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="tax-ein" className="block text-sm font-medium leading-6 text-brand-gray-900">Tax ID / EIN</label>
                      <input 
                        type="text" 
                        id="tax-ein" 
                        value={companyProfile.taxEin}
                        onChange={(e) => handleCompanyProfileChange('taxEin', e.target.value)}
                        placeholder="XX-XXXXXXX"
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="license-number" className="block text-sm font-medium leading-6 text-brand-gray-900">License Number</label>
                      <input 
                        type="text" 
                        id="license-number" 
                        value={companyProfile.licenseNumber}
                        onChange={(e) => handleCompanyProfileChange('licenseNumber', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    
                    <div className="col-span-full">
                      <label htmlFor="insurance-policy" className="block text-sm font-medium leading-6 text-brand-gray-900">Insurance Policy Number</label>
                      <input 
                        type="text" 
                        id="insurance-policy" 
                        value={companyProfile.insurancePolicyNumber}
                        onChange={(e) => handleCompanyProfileChange('insurancePolicyNumber', e.target.value)}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" 
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-x-6 pt-6 border-t border-brand-gray-200">
                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Company Info'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Customization & Templates Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Customization & Templates</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Adapt the application to your workflow by adding custom fields and managing document templates.</p>
          </div>
          <div className="md:col-span-2 space-y-10">
            {/* Custom Fields */}
            <div>
              <h3 className="text-md font-semibold flex items-center text-brand-gray-800"><PuzzlePieceIcon className="w-5 h-5 mr-2" /> Custom Fields</h3>
              <div className="mt-4 p-4 border rounded-lg bg-white">
                <label htmlFor="entity-select" className="block text-sm font-medium text-brand-gray-700">Manage fields for:</label>
                <select
                  id="entity-select"
                  value={selectedEntity}
                  onChange={e => setSelectedEntity(e.target.value as CustomFieldDefinition['entityType'])}
                  className="mt-1 block w-full max-w-xs rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                >
                  {entityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="mt-4 flow-root">
                  <ul className="divide-y divide-brand-gray-200">
                    {filteredFields.map(field => (
                      <li key={field.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium text-brand-gray-800">{field.fieldLabel}</p>
                          <span className="text-xs uppercase font-semibold text-brand-gray-500 bg-brand-gray-100 px-2 py-0.5 rounded-full">{field.fieldType}</span>
                        </div>
                        <button onClick={() => handleDeleteField(field.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                      </li>
                    ))}
                  </ul>
                  {filteredFields.length === 0 && <p className="text-sm text-brand-gray-500 text-center py-4">No custom fields for {selectedEntity}.</p>}
                </div>
                {!isAddingField ? (
                  <button onClick={() => setIsAddingField(true)} className="mt-4 text-sm font-semibold text-brand-green-600 hover:text-brand-green-800">+ Add New Field</button>
                ) : (
                  <div className="mt-4 p-3 bg-brand-gray-50 rounded-md border space-y-3">
                    <h4 className="font-medium text-sm">New Field Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="text" placeholder="Field Name (e.g., Gate Code)" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm" />
                      <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as CustomFieldDefinition['fieldType'])} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="textarea">Textarea</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-x-3">
                      <button onClick={() => setIsAddingField(false)} className="text-sm font-semibold">Cancel</button>
                      <button onClick={handleSaveField} className="rounded-md bg-brand-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700">Save Field</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Templates */}
            <div>
               <h3 className="text-md font-semibold flex items-center text-brand-gray-800"><DocumentTextIcon className="w-5 h-5 mr-2" /> Document Templates</h3>
               <p className="mt-1 text-sm text-brand-gray-600">Customize your quote, invoice, and report templates with dynamic variables.</p>
               
               {editingTemplate ? (
                 <div className="mt-4 p-6 border rounded-lg bg-white">
                   <div className="flex items-center justify-between mb-4">
                     <div>
                       <span className="text-xs uppercase font-semibold text-brand-gray-500 bg-brand-gray-100 px-2 py-0.5 rounded-full">{editingTemplate.type}</span>
                       <h4 className="mt-2 text-lg font-semibold text-brand-gray-800">{editingTemplate.name}</h4>
                     </div>
                     <button onClick={handleCancelEditTemplate} className="text-sm text-brand-gray-600 hover:text-brand-gray-900">✕ Close</button>
                   </div>
                   
                   <div className="mb-4">
                     <label className="block text-sm font-medium text-brand-gray-700 mb-2">Template Content</label>
                     <textarea 
                       value={templateContent} 
                       onChange={e => setTemplateContent(e.target.value)}
                       rows={12}
                       className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm font-mono"
                       placeholder="Enter template content..."
                     />
                   </div>
                   
                   <div className="mb-4 p-3 bg-brand-gray-50 rounded-md border">
                     <p className="text-xs font-semibold text-brand-gray-700 mb-2">Available Variables:</p>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-brand-gray-600">
                       <code>{'{{customer_name}}'}</code>
                       <code>{'{{customer_email}}'}</code>
                       <code>{'{{customer_phone}}'}</code>
                       <code>{'{{customer_address}}'}</code>
                       <code>{'{{total_amount}}'}</code>
                       <code>{'{{date}}'}</code>
                       <code>{'{{quote_id}}'}</code>
                       <code>{'{{job_location}}'}</code>
                       <code>{'{{line_items}}'}</code>
                       <code>{'{{payment_terms}}'}</code>
                       <code>{'{{deposit_amount}}'}</code>
                       <code>{'{{company_name}}'}</code>
                     </div>
                   </div>
                   
                   <div className="flex justify-end gap-x-3">
                     <button onClick={handleCancelEditTemplate} className="text-sm font-semibold text-brand-gray-900">Cancel</button>
                     <button onClick={handleSaveTemplate} className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700">Save Template</button>
                   </div>
                 </div>
               ) : (
                 <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {documentTemplates.map(template => (
                     <div key={template.id} className="p-4 border rounded-lg bg-white flex flex-col hover:border-brand-cyan-300 transition-colors">
                       <div className="flex-grow">
                          <span className="text-xs uppercase font-semibold text-brand-gray-500 bg-brand-gray-100 px-2 py-0.5 rounded-full">{template.type}</span>
                          <h4 className="mt-2 font-semibold text-brand-gray-800">{template.name}</h4>
                          <p className="mt-1 text-sm text-brand-gray-600">{template.description}</p>
                       </div>
                       <div className="mt-4">
                          <button onClick={() => handleEditTemplate(template)} className="text-sm font-semibold text-brand-cyan-600 hover:text-brand-cyan-800">Edit Template &rarr;</button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Integrations Section */}
         <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Integrations</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Connect TreePro AI with other services.</p>
          </div>
          <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <QuickBooksIcon className="w-8 h-8 mr-4" />
                    <div>
                        <h3 className="font-semibold text-brand-gray-800">QuickBooks</h3>
                        <p className="text-sm text-brand-gray-500">Sync invoices and payments automatically.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <StripeIcon className="w-8 h-8 mr-4" />
                     <div>
                        <h3 className="font-semibold text-brand-gray-800">Stripe</h3>
                        <p className="text-sm text-brand-gray-500">Process online payments for invoices.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <GoogleCalendarIcon className="w-8 h-8 mr-4" />
                     <div>
                        <h3 className="font-semibold text-brand-gray-800">Google Calendar</h3>
                        <p className="text-sm text-brand-gray-500">Sync job schedules with your calendar.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
          </div>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Angi Ads Integration Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Angi Ads Integration</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Automatically receive leads from Angi Ads (formerly Angie's List).</p>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 border rounded-lg bg-gradient-to-br from-brand-cyan-50 to-white">
              <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">Webhook Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://${window.location.hostname}/api/webhooks/angi`}
                      className="flex-1 block w-full rounded-md border-0 py-2 px-3 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 bg-brand-gray-50 sm:text-sm font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://${window.location.hostname}/api/webhooks/angi`);
                        alert('Webhook URL copied to clipboard!');
                      }}
                      className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-md border border-brand-cyan-200">
                  <h4 className="text-sm font-semibold text-brand-gray-900 mb-2">Setup Instructions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-brand-gray-700">
                    <li>Log in to your Angi Pro account at <a href="https://office.angi.com" target="_blank" rel="noopener noreferrer" className="text-brand-cyan-600 hover:text-brand-cyan-700 underline">office.angi.com</a></li>
                    <li>Navigate to <strong>Ads → Settings → Integrations → Webhooks</strong></li>
                    <li>Click <strong>"Add Webhook"</strong> and paste the webhook URL above</li>
                    <li>Set the event type to <strong>"New Lead"</strong></li>
                    <li>Add your API key in the <strong>X-API-KEY</strong> header (set this in your environment variables as ANGI_ADS_WEBHOOK_SECRET)</li>
                    <li>Save the webhook configuration</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Important:</p>
                      <p>Make sure to set the <code className="bg-yellow-100 px-1 py-0.5 rounded">ANGI_ADS_WEBHOOK_SECRET</code> environment variable with a secure API key. This key must match the one you configure in the Angi Ads dashboard.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const testPayload = {
                          name: "Test Customer",
                          phone: "555-0123",
                          email: "test@example.com",
                          comments: "This is a test lead from the Angi Ads integration",
                          address: "123 Test St, Test City, TS 12345",
                          timestamp: new Date().toISOString(),
                          leadId: `TEST-${Date.now()}`
                        };
                        
                        const response = await fetch('/api/webhooks/angi', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-API-KEY': 'test-key'
                          },
                          body: JSON.stringify(testPayload)
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          alert(`Test webhook successful! Lead ID: ${data.leadId}\nCustomer ID: ${data.customerId}`);
                        } else {
                          const error = await response.json();
                          alert(`Test webhook failed: ${error.message || error.error}`);
                        }
                      } catch (error) {
                        alert(`Test webhook error: ${error.message}`);
                      }
                    }}
                    className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                  >
                    Test Webhook
                  </button>
                  <a
                    href="https://office.angi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50"
                  >
                    Open Angi Ads Dashboard →
                  </a>
                </div>
              </div>
            </div>

            <div className="text-sm text-brand-gray-600">
              <p><strong>How it works:</strong> When you receive a new lead on Angi Ads, it will automatically create a new customer (or link to an existing one) and add a lead with source "Angi Ads" in your TreePro AI system. You'll be able to see these leads in your Leads page and follow up accordingly.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
