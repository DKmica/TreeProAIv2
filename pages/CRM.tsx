import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Client, Lead, Quote, AITreeEstimate } from '../types';
import { clientService, leadService, quoteService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import CustomerIcon from '../components/icons/CustomerIcon';
import LeadIcon from '../components/icons/LeadIcon';
import QuoteIcon from '../components/icons/QuoteIcon';
import ClientEditor from '../components/ClientEditor';
import LeadEditor from '../components/LeadEditor';
import QuoteEditor from '../components/QuoteEditor';
import { QuoteViewer } from '../components/QuoteViewer';

type TabType = 'clients' | 'leads' | 'quotes';

const CRM: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab') as TabType | null;
  const initialTab: TabType = tabParam && ['clients', 'leads', 'quotes'].includes(tabParam) ? tabParam : 'clients';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [clientCategoryFilter, setClientCategoryFilter] = useState<'all' | 'potential_client' | 'active_customer'>('all');
  const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
  const [isLeadEditorOpen, setIsLeadEditorOpen] = useState(false);
  const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
  const [isQuoteViewerOpen, setIsQuoteViewerOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [aiEstimateData, setAiEstimateData] = useState<AITreeEstimate | null>(null);

  useEffect(() => {
    if (tabParam && ['clients', 'leads', 'quotes'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchClients = async (category: 'all' | 'potential_client' | 'active_customer', bubbleError = false) => {
    setIsClientsLoading(true);
    if (!bubbleError) {
      setClientLoadError(null);
    }
    try {
      const params = category !== 'all' ? { clientCategory: category } : undefined;
      const clientsData = await clientService.getAll(params);
      setClients(clientsData);
    } catch (err: any) {
      const message = err.message || 'Failed to load clients';
      if (bubbleError) {
        setError(message);
        throw err;
      } else {
        setClientLoadError(message);
      }
    } finally {
      setIsClientsLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.aiEstimate) {
      setAiEstimateData(location.state.aiEstimate);
      setIsQuoteEditorOpen(true);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, location.search]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const leadsPromise = leadService.getAll();
        const quotesPromise = quoteService.getAll();
        await Promise.all([
          fetchClients(clientCategoryFilter, true),
          leadsPromise.then(setLeads),
          quotesPromise.then(setQuotes)
        ]);
      } catch (err: any) {
        console.error('Error fetching CRM data:', err);
        setError(err.message || 'Failed to load CRM data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchClients(clientCategoryFilter);
    }
  }, [clientCategoryFilter, isLoading]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(
      (client) =>
        client.companyName?.toLowerCase().includes(term) ||
        client.firstName?.toLowerCase().includes(term) ||
        client.lastName?.toLowerCase().includes(term) ||
        client.primaryEmail?.toLowerCase().includes(term) ||
        client.primaryPhone?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.customer?.name?.toLowerCase().includes(term) ||
        lead.source?.toLowerCase().includes(term) ||
        lead.status?.toLowerCase().includes(term)
    );
  }, [leads, searchTerm]);

  const filteredQuotes = useMemo(() => {
    if (!searchTerm) return quotes;
    const term = searchTerm.toLowerCase();
    return quotes.filter(
      (quote) =>
        quote.quoteNumber?.toLowerCase().includes(term) ||
        quote.customerName?.toLowerCase().includes(term) ||
        quote.status?.toLowerCase().includes(term)
    );
  }, [quotes, searchTerm]);

  const getLeadStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Contacted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Qualified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Lost':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
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

  const handleAddNew = () => {
    if (activeTab === 'clients') {
      setIsClientEditorOpen(true);
    } else if (activeTab === 'leads') {
      setIsLeadEditorOpen(true);
    } else if (activeTab === 'quotes') {
      setIsQuoteEditorOpen(true);
    }
  };

  const convertLeadToQuote = (lead: Lead): Quote | undefined => {
    const client = clients.find(c => c.id === lead.clientId);
    
    // Build customer name from client data or lead customer data
    let customerName = 'Unknown Customer';
    if (client) {
      if (client.companyName) {
        customerName = client.companyName;
      } else if (client.firstName || client.lastName) {
        customerName = [client.firstName, client.lastName].filter(Boolean).join(' ');
      }
    } else if (lead.customer?.name) {
      customerName = lead.customer.name;
    }
    
    // Return undefined if we can't create a valid quote
    if (!lead.clientId) {
      return undefined;
    }
    
    const now = new Date().toISOString();
    
    return {
      id: '', // Will be assigned by backend
      leadId: lead.id,
      clientId: lead.clientId,
      propertyId: lead.propertyId,
      customerName,
      status: 'Draft',
      lineItems: [],
      stumpGrindingPrice: 0,
      createdAt: now,
      paymentTerms: 'Net 30',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      specialInstructions: lead.description || '',
      quoteNumber: '', // Will be assigned by backend
      version: 1,
      approvalStatus: 'pending',
      totalAmount: 0,
      discountAmount: 0,
      discountPercentage: 0,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 0,
      updatedAt: now,
    };
  };

  const handleClientSave = async (client: Client) => {
    try {
      const updatedClients = await clientService.getAll();
      setClients(updatedClients);
    } catch (err) {
      console.error('Error refreshing clients:', err);
    }
  };

  const handleLeadSave = async (lead: Lead) => {
    try {
      const updatedLeads = await leadService.getAll();
      setLeads(updatedLeads);
    } catch (err) {
      console.error('Error refreshing leads:', err);
    }
  };

  const handleQuoteSave = async (quote: Quote) => {
    try {
      const updatedQuotes = await quoteService.getAll();
      setQuotes(updatedQuotes);
    } catch (err) {
      console.error('Error refreshing quotes:', err);
    }
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/crm/clients/${clientId}`);
  };

  const handleLeadEdit = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setIsLeadEditorOpen(true);
    }
  };

  const handleConvertToQuote = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setLeadToConvert(lead);
      setIsQuoteEditorOpen(true);
    }
  };

  const handleQuoteView = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
      setSelectedQuote(quote);
      setIsQuoteViewerOpen(true);
    }
  };

  const handleQuoteEdit = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
      setSelectedQuote(quote);
      setIsQuoteEditorOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <SpinnerIcon className="h-12 w-12 text-brand-cyan-600 mx-auto" />
          <p className="mt-4 text-brand-gray-600">Loading CRM data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <ClientEditor
        isOpen={isClientEditorOpen}
        onClose={() => setIsClientEditorOpen(false)}
        onSave={handleClientSave}
      />
      <LeadEditor
        isOpen={isLeadEditorOpen}
        onClose={() => {
          setIsLeadEditorOpen(false);
          setSelectedLead(null);
        }}
        onSave={handleLeadSave}
        lead={selectedLead || undefined}
      />
      <QuoteEditor
        isOpen={isQuoteEditorOpen}
        onClose={() => {
          setIsQuoteEditorOpen(false);
          setSelectedQuote(null);
          setLeadToConvert(null);
          setAiEstimateData(null);
        }}
        onSave={handleQuoteSave}
        quote={selectedQuote || (leadToConvert ? convertLeadToQuote(leadToConvert) || undefined : undefined)}
        aiEstimate={aiEstimateData || undefined}
      />
      <QuoteViewer
        isOpen={isQuoteViewerOpen}
        onClose={() => {
          setIsQuoteViewerOpen(false);
          setSelectedQuote(null);
        }}
        quote={selectedQuote}
      />

      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">CRM Dashboard</h1>
          <p className="mt-2 text-sm text-brand-gray-700">
            Manage your clients, leads, and quotes in one place.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleAddNew}
            className="inline-flex items-center justify-center rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New {activeTab === 'clients' ? 'Client' : activeTab === 'leads' ? 'Lead' : 'Quote'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="border-b border-brand-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('clients')}
              className={`${
                activeTab === 'clients'
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <CustomerIcon className="h-5 w-5 mr-2" />
              Clients
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-brand-gray-100 text-brand-gray-900">
                {clients.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`${
                activeTab === 'leads'
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <LeadIcon className="h-5 w-5 mr-2" />
              Leads
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-brand-gray-100 text-brand-gray-900">
                {leads.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`${
                activeTab === 'quotes'
                  ? 'border-brand-cyan-500 text-brand-cyan-600'
                  : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <QuoteIcon className="h-5 w-5 mr-2" />
              Quotes
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-brand-gray-100 text-brand-gray-900">
                {quotes.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full max-w-md rounded-md border-brand-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
        />
      </div>

      {activeTab === 'clients' && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {clientCategoryOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setClientCategoryFilter(option.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  clientCategoryFilter === option.value
                    ? 'bg-brand-cyan-600 text-white border-brand-cyan-600'
                    : 'bg-white text-brand-gray-700 border-brand-gray-200 hover:border-brand-cyan-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {clientLoadError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {clientLoadError}
            </div>
          )}
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <CustomerIcon className="h-12 w-12 text-brand-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-brand-gray-900">No clients found</h3>
              <p className="mt-1 text-sm text-brand-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new client.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={handleAddNew}
                    className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Client
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isClientsLoading && (
                <div className="col-span-full text-center text-sm text-brand-gray-500">Refreshing clients...</div>
              )}
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-brand-gray-200"
                  onClick={() => handleClientClick(client.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-gray-900">
                          {client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed Client'}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              client.clientType === 'commercial'
                                ? 'bg-purple-100 text-purple-800'
                                : client.clientType === 'residential'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {client.clientType || 'N/A'}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getCategoryClasses(client.clientCategory)}`}>
                            {getCategoryLabel(client.clientCategory)}
                          </span>
                        </div>
                      </div>
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        client.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <span className={`w-3 h-3 rounded-full ${
                          client.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></span>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center text-sm text-brand-gray-600">
                        <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {client.primaryEmail || 'No email'}
                      </div>
                      <div className="flex items-center text-sm text-brand-gray-600">
                        <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {client.primaryPhone || 'No phone'}
                      </div>
                      <div className="flex items-center text-sm text-brand-gray-600">
                        <svg className="h-4 w-4 mr-2 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {client.properties?.length || 0} {client.properties?.length === 1 ? 'property' : 'properties'}
                      </div>
                    </div>

                    {client.tags && client.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {client.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {client.tags.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-brand-gray-100 px-2 py-1 text-xs font-medium text-brand-gray-600">
                            +{client.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-brand-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClientClick(client.id);
                        }}
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

      {activeTab === 'leads' && (
        <div className="mt-6">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <LeadIcon className="h-12 w-12 text-brand-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-brand-gray-900">No leads found</h3>
              <p className="mt-1 text-sm text-brand-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new lead.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={handleAddNew}
                    className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Lead
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-brand-gray-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-gray-900">
                          {lead.customer?.name || 'Unknown Customer'}
                        </h3>
                        <p className="mt-1 text-sm text-brand-gray-500">{lead.source || 'Unknown Source'}</p>
                      </div>
                      {lead.priority && (
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getLeadStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {lead.estimatedValue !== undefined && lead.estimatedValue > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-brand-gray-600">Est. Value:</span>
                          <span className="font-semibold text-brand-gray-900">{formatCurrency(lead.estimatedValue)}</span>
                        </div>
                      )}
                      {lead.nextFollowupDate && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-brand-gray-600">Next Followup:</span>
                          <span className="font-semibold text-brand-gray-900">{formatDate(lead.nextFollowupDate)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-brand-gray-600">Lead Score:</span>
                        <span className="font-semibold text-brand-gray-900">{lead.leadScore || 0}/100</span>
                      </div>
                    </div>

                    {lead.tags && lead.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {lead.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className="inline-flex items-center rounded-full bg-brand-gray-100 px-2 py-1 text-xs font-medium text-brand-gray-600">
                            +{lead.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-brand-gray-100 flex gap-2">
                      <button
                        onClick={() => handleLeadEdit(lead.id)}
                        className="flex-1 text-sm font-medium text-brand-cyan-600 hover:text-brand-cyan-700 py-2 px-3 border border-brand-cyan-600 rounded-md hover:bg-brand-cyan-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleConvertToQuote(lead.id)}
                        className="flex-1 text-sm font-medium text-white bg-brand-cyan-600 hover:bg-brand-cyan-700 py-2 px-3 rounded-md"
                      >
                        Convert to Quote
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="mt-6">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <QuoteIcon className="h-12 w-12 text-brand-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-brand-gray-900">No quotes found</h3>
              <p className="mt-1 text-sm text-brand-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new quote.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={handleAddNew}
                    className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Quote
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-brand-gray-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-gray-900">
                          {quote.quoteNumber || quote.id}
                        </h3>
                        <p className="mt-1 text-sm text-brand-gray-600">{quote.customerName || 'Unknown Customer'}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getQuoteStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-2xl font-bold text-brand-gray-900">
                        {formatCurrency(quote.grandTotal || quote.totalAmount || 0)}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-brand-gray-600">Created:</span>
                        <span className="font-medium text-brand-gray-900">{formatDate(quote.createdAt)}</span>
                      </div>
                      {quote.validUntil && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-brand-gray-600">Expires:</span>
                          <span className="font-medium text-brand-gray-900">{formatDate(quote.validUntil)}</span>
                        </div>
                      )}
                      {quote.approvalStatus && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-brand-gray-600">Approval:</span>
                          <span className={`font-medium ${
                            quote.approvalStatus === 'approved' ? 'text-green-600' :
                            quote.approvalStatus === 'rejected' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {quote.approvalStatus}
                          </span>
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

                    <div className="mt-4 pt-4 border-t border-brand-gray-100 flex gap-2">
                      <button
                        onClick={() => handleQuoteView(quote.id)}
                        className="flex-1 text-sm font-medium text-brand-cyan-600 hover:text-brand-cyan-700 py-2 px-3 border border-brand-cyan-600 rounded-md hover:bg-brand-cyan-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleQuoteEdit(quote.id)}
                        className="flex-1 text-sm font-medium text-white bg-brand-cyan-600 hover:bg-brand-cyan-700 py-2 px-3 rounded-md"
                      >
                        Edit
                      </button>
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

export default CRM;
  const clientCategoryOptions = [
    { value: 'all' as const, label: 'All Clients' },
    { value: 'active_customer' as const, label: 'Active Customers' },
    { value: 'potential_client' as const, label: 'Potential Clients' }
  ];

  const getCategoryLabel = (category?: string) => {
    if (category === 'active_customer') return 'Active Customer';
    return 'Potential Client';
  };

  const getCategoryClasses = (category?: string) => {
    if (category === 'active_customer') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

