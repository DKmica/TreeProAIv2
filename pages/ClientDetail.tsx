import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client, Property, Contact, Quote, Job, CustomerActivityEvent } from '../types';
import { clientService, quoteService, jobService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import CustomerIcon from '../components/icons/CustomerIcon';
import MapPinIcon from '../components/icons/MapPinIcon';
import QuoteIcon from '../components/icons/QuoteIcon';
import JobIcon from '../components/icons/JobIcon';
import ClientEditor from '../components/ClientEditor';
import PropertyEditor from '../components/PropertyEditor';
import ContactEditor from '../components/ContactEditor';

type TabType = 'overview' | 'properties' | 'contacts' | 'quotes' | 'jobs' | 'activity';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activity, setActivity] = useState<CustomerActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('all');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'communications' | 'work' | 'billing'>('all');
  const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
  const [isPropertyEditorOpen, setIsPropertyEditorOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined);
  const [isContactEditorOpen, setIsContactEditorOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      setIsActivityLoading(true);

      try {
        const [clientData, propertiesData, contactsData, allQuotes, allJobs, activityLog] = await Promise.all([
          clientService.getById(id),
          clientService.getProperties(id),
          clientService.getContacts(id),
          quoteService.getAll(),
          jobService.getAll(),
          clientService.getActivity(id),
        ]);

        setClient(clientData);
        setProperties(propertiesData);
        setContacts(contactsData);
        setQuotes(allQuotes.filter(q => q.clientId === id));
        setJobs(allJobs.filter(j => j.clientId === id));
        setActivity(activityLog);
      } catch (err: any) {
        console.error('Error fetching client data:', err);
        setError(err.message || 'Failed to load client data');
      } finally {
        setIsLoading(false);
        setIsActivityLoading(false);
      }
    };

    fetchClientData();
  }, [id]);

  const filteredQuotes = useMemo(() => {
    if (quoteStatusFilter === 'all') return quotes;
    return quotes.filter(q => q.status.toLowerCase() === quoteStatusFilter.toLowerCase());
  }, [quotes, quoteStatusFilter]);

  const filteredJobs = useMemo(() => {
    if (jobStatusFilter === 'all') return jobs;
    return jobs.filter(j => j.status.toLowerCase() === jobStatusFilter.toLowerCase());
  }, [jobs, jobStatusFilter]);

  const getClientTypeBadge = (type: string) => {
    switch (type) {
      case 'commercial':
        return 'bg-purple-100 text-purple-800';
      case 'residential':
        return 'bg-green-100 text-green-800';
      case 'property_manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuoteStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Sent':
        return 'bg-blue-100 text-blue-800';
      case 'Accepted':
        return 'bg-green-100 text-green-800';
      case 'Declined':
        return 'bg-red-100 text-red-800';
      case 'Converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getJobStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'Unscheduled':
        return 'bg-gray-100 text-gray-800';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      billing: 'Billing',
      site_manager: 'Site Manager',
      tenant: 'Tenant',
      owner: 'Owner',
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatClientType = (type: string | undefined | null) => {
    if (!type) return '';
    return type.replace('_', ' ');
  };

  const formatActivityIcon = (type: CustomerActivityEvent['type']) => {
    switch (type) {
      case 'call':
        return '📞';
      case 'email':
        return '✉️';
      case 'sms':
        return '💬';
      case 'quote_sent':
        return '📄';
      case 'quote_accepted':
        return '✅';
      case 'job_scheduled':
        return '📆';
      case 'job_completed':
        return '🪓';
      case 'invoice_sent':
        return '🧾';
      case 'payment_received':
        return '💵';
      case 'site_visit':
        return '📍';
      case 'nurture_touch':
        return '🤖';
      case 'task':
        return '✅';
      default:
        return '📝';
    }
  };

  const filteredActivity = useMemo(() => {
    const grouped = activity.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    if (activityFilter === 'all') return grouped;

    return grouped.filter((event) => {
      if (activityFilter === 'communications') {
        return ['call', 'email', 'sms'].includes(event.type);
      }
      if (activityFilter === 'work') {
        return ['quote_sent', 'quote_accepted', 'job_scheduled', 'job_completed'].includes(event.type);
      }
      if (activityFilter === 'billing') {
        return ['invoice_sent', 'payment_received'].includes(event.type);
      }
      return true;
    });
  }, [activity, activityFilter]);

  const handleBack = () => {
    navigate('/crm');
  };

  const handleEditClient = () => {
    setIsClientEditorOpen(true);
  };

  const handleClientSave = async (updatedClient: Client) => {
    if (!id) return;
    
    try {
      const clientData = await clientService.getById(id);
      setClient(clientData);
    } catch (err) {
      console.error('Error refreshing client data:', err);
    }
  };

  const handleDeleteClient = async () => {
    if (!id || !client) return;
    
    const fullName = client.firstName && client.lastName 
      ? `${client.firstName} ${client.lastName}` 
      : client.companyName || 'Unknown';
    
    if (!window.confirm(`Are you sure you want to delete ${fullName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await clientService.remove(id);
      // Successfully deleted - navigate back to CRM
      navigate('/crm?tab=clients', { replace: true });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete client';
      if (errorMsg.includes('existing jobs')) {
        alert(`Cannot delete this client because they have active jobs. Please archive or reassign their jobs first.`);
      } else {
        alert(`Error deleting client: ${errorMsg}`);
      }
      console.error('Error deleting client:', err);
    }
  };

  const handleAddProperty = () => {
    setSelectedProperty(undefined);
    setIsPropertyEditorOpen(true);
  };

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsPropertyEditorOpen(true);
  };

  const handlePropertySave = async (savedProperty: Property) => {
    if (!id) return;
    
    try {
      const propertiesData = await clientService.getProperties(id);
      setProperties(propertiesData);
    } catch (err) {
      console.error('Error refreshing properties:', err);
    }
  };

  const handleAddContact = () => {
    setSelectedContact(undefined);
    setIsContactEditorOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactEditorOpen(true);
  };

  const handleContactSave = async (savedContact: Contact) => {
    if (!id) return;
    
    try {
      const contactsData = await clientService.getContacts(id);
      setContacts(contactsData);
    } catch (err) {
      console.error('Error refreshing contacts:', err);
    }
  };

  const handleViewProperty = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      handleEditProperty(property);
    }
  };

  const handleQuoteView = (quoteId: string) => {
    navigate(`/quotes/${quoteId}`);
  };

  const handleJobView = (jobId: string) => {
    alert(`View job ${jobId} - job detail page will be implemented next`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <SpinnerIcon className="h-12 w-12 text-brand-cyan-600 mx-auto" />
          <p className="mt-4 text-brand-gray-600">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200">
        <p className="text-red-800">Error: {error || 'Client not found'}</p>
        <button
          onClick={handleBack}
          className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          ← Back to CRM
        </button>
      </div>
    );
  }

  const clientName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed Client';
  const billingAddress = [
    client.billingAddressLine1,
    client.billingAddressLine2,
    [client.billingCity, client.billingState].filter(Boolean).join(', '),
    client.billingZip,
  ].filter(Boolean).join(', ');

  return (
    <div>
      <ClientEditor
        isOpen={isClientEditorOpen}
        onClose={() => setIsClientEditorOpen(false)}
        onSave={handleClientSave}
        client={client || undefined}
      />

      <PropertyEditor
        isOpen={isPropertyEditorOpen}
        onClose={() => setIsPropertyEditorOpen(false)}
        onSave={handlePropertySave}
        clientId={id || ''}
        property={selectedProperty}
      />

      <ContactEditor
        isOpen={isContactEditorOpen}
        onClose={() => setIsContactEditorOpen(false)}
        onSave={handleContactSave}
        clientId={id || ''}
        propertyId={undefined}
        contact={selectedContact}
      />

      <nav className="flex mb-4 text-sm text-brand-gray-600">
        <button onClick={handleBack} className="hover:text-brand-cyan-600">
          CRM
        </button>
        <span className="mx-2">/</span>
        <button onClick={handleBack} className="hover:text-brand-cyan-600">
          Clients
        </button>
        <span className="mx-2">/</span>
        <span className="text-brand-gray-900 font-medium">{clientName}</span>
      </nav>

      <div className="bg-white rounded-lg shadow-sm border border-brand-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={handleBack}
              className="flex-shrink-0 p-2 hover:bg-brand-gray-100 rounded-md transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-brand-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-brand-gray-900">{clientName}</h1>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getClientTypeBadge(client.clientType)}`}>
                  {formatClientType(client.clientType)}
                </span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  client.status === 'active' ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    client.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
                  <span className={`text-sm font-medium ${
                    client.status === 'active' ? 'text-green-800' : 'text-gray-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-brand-gray-600">
                {client.primaryEmail && (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {client.primaryEmail}
                  </div>
                )}
                {client.primaryPhone && (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {client.primaryPhone}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditClient}
              className="px-4 py-2 border border-brand-cyan-600 text-brand-cyan-600 rounded-md hover:bg-brand-cyan-50 font-medium text-sm"
            >
              Edit Client
            </button>
            <button
              onClick={handleDeleteClient}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 font-medium text-sm"
            >
              Delete Client
            </button>
            <button
              onClick={handleAddProperty}
              className="px-4 py-2 bg-brand-cyan-600 text-white rounded-md hover:bg-brand-cyan-700 font-medium text-sm"
            >
              + Add Property
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-brand-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'properties', 'contacts', 'quotes', 'jobs', 'activity'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize flex items-center`}
            >
              {tab === 'properties' && <MapPinIcon className="h-5 w-5 mr-2" />}
              {tab === 'contacts' && <CustomerIcon className="h-5 w-5 mr-2" />}
              {tab === 'quotes' && <QuoteIcon className="h-5 w-5 mr-2" />}
              {tab === 'jobs' && <JobIcon className="h-5 w-5 mr-2" />}
              {tab}
              {tab === 'properties' && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-brand-gray-100 text-brand-gray-900">
                  {properties.length}
                </span>
              )}
              {tab === 'contacts' && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-brand-gray-100 text-brand-gray-900">
                  {contacts.length}
                </span>
              )}
              {tab === 'quotes' && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-brand-gray-100 text-brand-gray-900">
                  {quotes.length}
                </span>
              )}
              {tab === 'jobs' && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-brand-gray-100 text-brand-gray-900">
                  {jobs.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
                <h2 className="text-xl font-semibold text-brand-gray-900 mb-4">Client Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Company Name</label>
                    <p className="mt-1 text-brand-gray-900">{client.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Full Name</label>
                    <p className="mt-1 text-brand-gray-900">
                      {[client.title, client.firstName, client.lastName].filter(Boolean).join(' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Client Type</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getClientTypeBadge(client.clientType)}`}>
                        {formatClientType(client.clientType)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Primary Email</label>
                    <p className="mt-1 text-brand-gray-900">{client.primaryEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Primary Phone</label>
                    <p className="mt-1 text-brand-gray-900">{client.primaryPhone || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-brand-gray-500">Billing Address</label>
                    <p className="mt-1 text-brand-gray-900">{billingAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Industry</label>
                    <p className="mt-1 text-brand-gray-900">{client.industry || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Lead Source</label>
                    <p className="mt-1 text-brand-gray-900">{client.leadSource || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Payment Terms</label>
                    <p className="mt-1 text-brand-gray-900">{client.paymentTerms || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Tax Exempt</label>
                    <p className="mt-1 text-brand-gray-900">{client.taxExempt ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Created</label>
                    <p className="mt-1 text-brand-gray-900">{formatDate(client.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Last Updated</label>
                    <p className="mt-1 text-brand-gray-900">{formatDate(client.updatedAt)}</p>
                  </div>
                </div>

                {client.tags && client.tags.length > 0 && (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-brand-gray-500 block mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                          <button className="ml-2 hover:opacity-70">×</button>
                        </span>
                      ))}
                      <button className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200">
                        + Add Tag
                      </button>
                    </div>
                  </div>
                )}

                {client.customFields && client.customFields.length > 0 && (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-brand-gray-500 block mb-3">Custom Fields</label>
                    <div className="grid grid-cols-2 gap-4">
                      {client.customFields.map((field) => (
                        <div key={field.id}>
                          <label className="text-sm font-medium text-brand-gray-500">
                            {field.definition?.fieldLabel || 'Custom Field'}
                          </label>
                          <p className="mt-1 text-brand-gray-900">{field.fieldValue || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {client.notes && (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-brand-gray-500 block mb-2">Notes</label>
                    <p className="text-brand-gray-900 text-sm whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
                <h2 className="text-xl font-semibold text-brand-gray-900 mb-4">Quick Stats</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-brand-gray-700">Properties</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{properties.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <CustomerIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-brand-gray-700">Contacts</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{contacts.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <QuoteIcon className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-brand-gray-700">Total Quotes</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">{quotes.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                    <div className="flex items-center">
                      <JobIcon className="h-5 w-5 text-cyan-600 mr-2" />
                      <span className="text-sm font-medium text-brand-gray-700">Total Jobs</span>
                    </div>
                    <span className="text-2xl font-bold text-cyan-600">{jobs.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-brand-gray-700">Lifetime Value</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">{formatCurrency(client.lifetimeValue || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'properties' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-brand-gray-900">Properties</h2>
            <button
              onClick={handleAddProperty}
              className="px-4 py-2 bg-brand-cyan-600 text-white rounded-md hover:bg-brand-cyan-700 font-medium text-sm"
            >
              + Add Property
            </button>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <MapPinIcon className="h-12 w-12 text-brand-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-brand-gray-900">No properties</h3>
              <p className="mt-1 text-sm text-brand-gray-500">Get started by adding a property to this client.</p>
              <div className="mt-6">
                <button
                  onClick={handleAddProperty}
                  className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                >
                  + Add Property
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-brand-gray-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-gray-900">
                          {property.propertyName || 'Unnamed Property'}
                        </h3>
                        {property.isPrimary && (
                          <span className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-brand-cyan-100 text-brand-cyan-800">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-start text-sm text-brand-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-brand-gray-400" />
                        <span>
                          {[
                            property.addressLine1,
                            property.city,
                            property.state,
                            property.zipCode,
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                      {property.propertyType && (
                        <div className="flex items-center text-sm text-brand-gray-600">
                          <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {property.propertyType}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-brand-gray-600">
                        <CustomerIcon className="h-4 w-4 mr-2 text-brand-gray-400" />
                        {property.contacts?.length || 0} {property.contacts?.length === 1 ? 'contact' : 'contacts'}
                      </div>
                    </div>

                    {property.gateCode && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                        <p className="text-xs font-medium text-yellow-800">Gate Code: {property.gateCode}</p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-brand-gray-100">
                      <button
                        onClick={() => handleViewProperty(property.id)}
                        className="text-sm font-medium text-brand-cyan-600 hover:text-brand-cyan-700"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-brand-gray-900">Contacts</h2>
            <button
              onClick={handleAddContact}
              className="px-4 py-2 bg-brand-cyan-600 text-white rounded-md hover:bg-brand-cyan-700 font-medium text-sm"
            >
              + Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <CustomerIcon className="h-12 w-12 text-brand-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-brand-gray-900">No contacts</h3>
              <p className="mt-1 text-sm text-brand-gray-500">Get started by adding a contact to this client.</p>
              <div className="mt-6">
                <button
                  onClick={handleAddContact}
                  className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                >
                  + Add Contact
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contacts.map((contact) => {
                const property = properties.find(p => p.id === contact.propertyId);
                const primaryChannel = contact.channels?.find(c => c.isPrimary);
                
                return (
                  <div
                    key={contact.id}
                    onClick={() => handleEditContact(contact)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-brand-gray-200 cursor-pointer"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-brand-gray-900">
                            {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              contact.isPrimary ? 'bg-brand-cyan-100 text-brand-cyan-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getContactTypeLabel(contact.contactType)}
                            </span>
                            {contact.isPrimary && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        {contact.jobTitle && (
                          <div className="flex items-center text-sm text-brand-gray-600">
                            <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {contact.jobTitle}
                          </div>
                        )}
                        {contact.channels && contact.channels.length > 0 && (
                          <div className="space-y-1">
                            {contact.channels.filter(c => c.channelType === 'email').map((channel) => (
                              <div key={channel.id} className="flex items-center text-sm text-brand-gray-600">
                                <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {channel.channelValue}
                              </div>
                            ))}
                            {contact.channels.filter(c => c.channelType === 'phone' || c.channelType === 'mobile').map((channel) => (
                              <div key={channel.id} className="flex items-center text-sm text-brand-gray-600">
                                <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {channel.channelValue}
                              </div>
                            ))}
                          </div>
                        )}
                        {property && (
                          <div className="flex items-start text-sm text-brand-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-brand-gray-400" />
                            <span className="text-xs">
                              {property.propertyName || property.addressLine1}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2 text-xs">
                        {contact.canApproveQuotes && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            Can Approve Quotes
                          </span>
                        )}
                        {contact.canReceiveInvoices && (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-green-700">
                            Receives Invoices
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-brand-gray-900">Quotes</h2>
            <div className="flex gap-2">
              <select
                value={quoteStatusFilter}
                onChange={(e) => setQuoteStatusFilter(e.target.value)}
                className="rounded-md border-brand-gray-300 text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="converted">Converted</option>
              </select>
            </div>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <QuoteIcon className="h-12 w-12 text-brand-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-brand-gray-900">No quotes found</h3>
              <p className="mt-1 text-sm text-brand-gray-500">
                {quoteStatusFilter !== 'all' ? 'Try adjusting your filter.' : 'No quotes for this client yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-brand-gray-200 cursor-pointer"
                  onClick={() => handleQuoteView(quote.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-gray-900">
                          {quote.quoteNumber}
                        </h3>
                        <p className="mt-1 text-sm text-brand-gray-500">{quote.customerName}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getQuoteStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-brand-gray-600">Total:</span>
                        <span className="font-semibold text-brand-gray-900">{formatCurrency(quote.grandTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-brand-gray-600">Created:</span>
                        <span className="text-brand-gray-900">{formatDate(quote.createdAt)}</span>
                      </div>
                      {quote.validUntil && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-brand-gray-600">Valid Until:</span>
                          <span className="text-brand-gray-900">{formatDate(quote.validUntil)}</span>
                        </div>
                      )}
                    </div>

                    {quote.tags && quote.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {quote.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {quote.tags.length > 2 && (
                          <span className="inline-flex items-center rounded-full bg-brand-gray-100 px-2 py-1 text-xs font-medium text-brand-gray-600">
                            +{quote.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-brand-gray-900">Jobs</h2>
            <div className="flex gap-2">
              <select
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                className="rounded-md border-brand-gray-300 text-sm"
              >
                <option value="all">All Status</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="scheduled">Scheduled</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <JobIcon className="h-12 w-12 text-brand-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-brand-gray-900">No jobs found</h3>
              <p className="mt-1 text-sm text-brand-gray-500">
                {jobStatusFilter !== 'all' ? 'Try adjusting your filter.' : 'No jobs for this client yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-brand-gray-200 cursor-pointer"
                  onClick={() => handleJobView(job.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-gray-900">
                          {job.jobNumber}
                        </h3>
                        <p className="mt-1 text-sm text-brand-gray-500">{job.customerName}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getJobStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {job.scheduledDate && (
                        <div className="flex items-center text-sm text-brand-gray-600">
                          <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(job.scheduledDate)}
                        </div>
                      )}
                      {job.assignedCrew && job.assignedCrew.length > 0 && (
                        <div className="flex items-center text-sm text-brand-gray-600">
                          <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {job.assignedCrew.length} crew {job.assignedCrew.length === 1 ? 'member' : 'members'}
                        </div>
                      )}
                      {job.jobLocation && (
                        <div className="flex items-start text-sm text-brand-gray-600">
                          <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-brand-gray-400" />
                          <span className="line-clamp-1">{job.jobLocation}</span>
                        </div>
                      )}
                    </div>

                    {job.tags && job.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {job.tags.length > 2 && (
                          <span className="inline-flex items-center rounded-full bg-brand-gray-100 px-2 py-1 text-xs font-medium text-brand-gray-600">
                            +{job.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-brand-gray-900">Customer Timeline</h3>
              <p className="text-sm text-brand-gray-600">Every touchpoint across sales, service, and billing.</p>
            </div>
            <div className="flex items-center gap-2">
              {([
                { id: 'all', label: 'All' },
                { id: 'communications', label: 'Comms' },
                { id: 'work', label: 'Work' },
                { id: 'billing', label: 'Billing' },
              ] as const).map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActivityFilter(filter.id)}
                  className={`px-3 py-1 text-sm rounded-full border transition ${activityFilter === filter.id
                    ? 'bg-brand-cyan-50 border-brand-cyan-500 text-brand-cyan-700'
                    : 'border-brand-gray-200 text-brand-gray-700 hover:border-brand-gray-300'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {isActivityLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="animate-pulse flex gap-3 items-start">
                  <div className="h-10 w-10 bg-brand-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-brand-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-brand-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="text-center py-8 text-brand-gray-600">No activity logged yet. Calls, emails, quotes, and jobs will appear here automatically.</div>
          ) : (
            <div className="space-y-6">
              {filteredActivity.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-brand-cyan-50 text-brand-cyan-700 flex items-center justify-center text-lg">
                      {formatActivityIcon(event.type)}
                    </div>
                    <div className="flex-1 w-px bg-brand-gray-100" />
                  </div>
                  <div className="flex-1 pb-6 border-b border-brand-gray-100 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-brand-gray-500">{new Date(event.occurredAt).toLocaleString()}</p>
                        <h4 className="text-base font-semibold text-brand-gray-900 mt-1">{event.title}</h4>
                        {event.description && <p className="text-sm text-brand-gray-700 mt-1">{event.description}</p>}
                        {event.context && <p className="text-sm text-brand-gray-600 mt-2">{event.context}</p>}
                        {event.tags && event.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {event.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                            {event.tags.length > 3 && (
                              <span className="inline-flex items-center rounded-full bg-brand-gray-100 px-2 py-1 text-xs font-medium text-brand-gray-600">
                                +{event.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-2 min-w-[160px]">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-brand-gray-100 text-brand-gray-800 capitalize">
                          {event.type.replace('_', ' ')}
                        </span>
                        {event.channel && (
                          <div className="text-xs text-brand-gray-600">Channel: {event.channel}</div>
                        )}
                        {event.actor && <div className="text-xs text-brand-gray-600">By {event.actor}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
