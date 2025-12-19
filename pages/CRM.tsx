import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Client, Lead, Quote, AITreeEstimate, CustomerSegment } from '../types';
import { clientService, leadService, quoteService, segmentService } from '../services/apiService';
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
  const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
  const [isLeadEditorOpen, setIsLeadEditorOpen] = useState(false);
  const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
  const [isQuoteViewerOpen, setIsQuoteViewerOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [aiEstimateData, setAiEstimateData] = useState<AITreeEstimate | null>(null);
  const [leadViewMode, setLeadViewMode] = useState<'cards' | 'board'>('cards');
  const [activeLeadQueue, setActiveLeadQueue] = useState<'all' | 'stalled' | 'awaiting_response' | 'high_value'>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null);
  const [zipFilter, setZipFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'any' | 'removal' | 'pruning' | 'plant_health'>('any');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [segmentPreview, setSegmentPreview] = useState<{ audienceCount: number; sampleTags?: string[] }>({ audienceCount: 0 });
  const [isSegmentsLoading, setIsSegmentsLoading] = useState(false);
  const leadQueueOptions: { id: 'all' | 'stalled' | 'awaiting_response' | 'high_value'; label: string; description: string }[] = [
    { id: 'all', label: 'All leads', description: 'Everything in the pipeline' },
    { id: 'stalled', label: 'Stalled follow-ups', description: 'Overdue or missing next steps' },
    { id: 'awaiting_response', label: 'Awaiting response', description: 'Contacted with no scheduled follow-up' },
    { id: 'high_value', label: 'High value', description: 'Estimated value of $10k or more' },
  ];

  useEffect(() => {
    const loadSegments = async () => {
      setIsSegmentsLoading(true);
      try {
        const data = await segmentService.getAll();
        setSegments(data);
      } catch (err) {
        console.error('Error loading segments', err);
      } finally {
        setIsSegmentsLoading(false);
      }
    };

    loadSegments();
  }, []);

  useEffect(() => {
    const preview = async () => {
      if (!activeSegmentId) return;
      try {
        const data = await segmentService.preview(activeSegmentId);
        setSegmentPreview(data);
      } catch (err) {
        console.error('Error previewing segment', err);
      }
    };

    preview();
  }, [activeSegmentId]);

  useEffect(() => {
    if (tabParam && ['clients', 'leads', 'quotes'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (activeTab !== 'leads') {
      setSelectedLeadIds([]);
      setBulkActionMessage(null);
    }
  }, [activeTab]);

  const fetchClients = async (bubbleError = false) => {
    setIsClientsLoading(true);
    if (!bubbleError) {
      setClientLoadError(null);
    }
    try {
      const clientsData = await clientService.getAll();
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
          fetchClients(true),
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


  const activeSegment = useMemo(() => segments.find((s) => s.id === activeSegmentId) || null, [segments, activeSegmentId]);

  const evaluateSegmentCriteria = (segment: CustomerSegment | null, context: { zip?: string; city?: string; state?: string; tags?: string[]; services?: string[]; species?: string[]; status?: string; clientType?: string; lifetimeValue?: number; lastInteraction?: string; }) => {
    if (!segment) return true;
    return segment.criteria.every((criterion) => {
      const value = criterion.value;
      switch (criterion.field) {
        case 'zip':
          return context.zip?.startsWith(String(value)) ?? false;
        case 'city':
          return context.city?.toLowerCase().includes(String(value).toLowerCase()) ?? false;
        case 'state':
          return context.state?.toLowerCase() === String(value).toLowerCase();
        case 'tag':
          return (context.tags || []).some((tag) => Array.isArray(value) ? value.includes(tag) : tag === value);
        case 'service':
          return (context.services || []).some((service) => Array.isArray(value) ? value.includes(service) : service === value);
        case 'species':
          return (context.species || []).some((species) => Array.isArray(value) ? value.includes(species) : species === value);
        case 'status':
          return context.status ? context.status.toLowerCase() === String(value).toLowerCase() : false;
        case 'clientType':
          return context.clientType ? context.clientType === value : false;
        case 'lifetimeValue':
          if (typeof value === 'object' && value !== null) {
            const min = (value as { min?: number }).min ?? -Infinity;
            const max = (value as { max?: number }).max ?? Infinity;
            return (context.lifetimeValue ?? 0) >= min && (context.lifetimeValue ?? 0) <= max;
          }
          return (context.lifetimeValue ?? 0) >= Number(value);
        case 'lastInteraction':
          if (!context.lastInteraction) return false;
          const cutoff = new Date(String(value)).getTime();
          return new Date(context.lastInteraction).getTime() >= cutoff;
        default:
          return true;
      }
    });
  };

  const matchesAdvancedFilters = (context: { zip?: string; city?: string; state?: string; tags?: string[]; services?: string[]; species?: string[]; status?: string; clientType?: string; lifetimeValue?: number; lastInteraction?: string; }) => {
    const tagNames = context.tags || [];
    const services = context.services || [];
    const species = context.species || [];

    if (zipFilter) {
      const zipMatches = (context.zip && context.zip.startsWith(zipFilter)) || (context.city && context.city.toLowerCase().includes(zipFilter.toLowerCase())) || (context.state && context.state.toLowerCase().includes(zipFilter.toLowerCase()));
      if (!zipMatches) return false;
    }

    if (speciesFilter) {
      const speciesMatches = species.some((s) => s.toLowerCase().includes(speciesFilter.toLowerCase()));
      if (!speciesMatches) return false;
    }

    if (serviceFilter !== 'any') {
      const serviceMatches = services.some((s) => s.toLowerCase().includes(serviceFilter.replace('_', ' ')));
      if (!serviceMatches) return false;
    }

    if (tagFilters.length > 0) {
      const tagMatches = tagNames.some((tag) => tagFilters.includes(tag));
      if (!tagMatches) return false;
    }

    if (!evaluateSegmentCriteria(activeSegment, context)) {
      return false;
    }

    return true;
  };

  const filteredClients = useMemo(() => {
    const base = clients.filter((client) => matchesAdvancedFilters({
      zip: client.billingZip,
      city: client.billingCity,
      state: client.billingState,
      tags: (client as any)?.tags?.map((t: any) => t.name) ?? [],
      services: client.notes ? [client.notes] : [],
      species: [],
      status: client.status,
      clientType: client.clientType,
      lifetimeValue: client.lifetimeValue,
      lastInteraction: client.updatedAt,
    }));

    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(
      (client) =>
        client.companyName?.toLowerCase().includes(term) ||
        client.firstName?.toLowerCase().includes(term) ||
        client.lastName?.toLowerCase().includes(term) ||
        client.primaryEmail?.toLowerCase().includes(term) ||
        client.primaryPhone?.toLowerCase().includes(term)
      );
    }, [clients, searchTerm, zipFilter, serviceFilter, tagFilters, speciesFilter, activeSegment]);

  const isLeadStalled = (lead: Lead) => {
    const now = new Date();
    const lastContact = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
    const nextFollowup = lead.nextFollowupDate ? new Date(lead.nextFollowupDate) : null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (nextFollowup && nextFollowup < now) return true;
    if (!nextFollowup && lastContact && lastContact < sevenDaysAgo) return true;
    if (!nextFollowup && !lastContact) return true;
    return false;
  };

  const leadQueueFilter = (lead: Lead, queue: typeof activeLeadQueue) => {
    switch (queue) {
      case 'stalled':
        return isLeadStalled(lead);
      case 'awaiting_response':
        return lead.status === 'Contacted' && !lead.nextFollowupDate;
      case 'high_value':
        return (lead.estimatedValue || 0) >= 10000;
      default:
        return true;
    }
  };

  const leadQueueCounts = useMemo(() => {
    return {
      all: leads.length,
      stalled: leads.filter((lead) => leadQueueFilter(lead, 'stalled')).length,
      awaiting_response: leads.filter((lead) => leadQueueFilter(lead, 'awaiting_response')).length,
      high_value: leads.filter((lead) => leadQueueFilter(lead, 'high_value')).length,
    };
  }, [leads]);

  const queueFilteredLeads = useMemo(() => {
    return leads.filter((lead) => leadQueueFilter(lead, activeLeadQueue));
  }, [leads, activeLeadQueue]);

  const toggleTagFilter = (tagName: string) => {
    setTagFilters((prev) => prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]);
  };

  const filteredLeads = useMemo(() => {
    const base = queueFilteredLeads.filter((lead) => matchesAdvancedFilters({
      zip: lead.customerDetails?.zipCode,
      city: lead.customerDetails?.city,
      state: lead.customerDetails?.state,
      tags: lead.tags?.map((t) => t.name) ?? [],
      services: lead.description ? [lead.description] : [],
      species: lead.description ? [lead.description] : [],
      status: lead.status,
      clientType: lead.client?.clientType,
      lifetimeValue: lead.estimatedValue,
      lastInteraction: lead.updatedAt,
    }));

    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(
      (lead) =>
        lead.customer?.name?.toLowerCase().includes(term) ||
        lead.source?.toLowerCase().includes(term) ||
        lead.status?.toLowerCase().includes(term)
    );
  }, [queueFilteredLeads, searchTerm, zipFilter, serviceFilter, tagFilters, speciesFilter, activeSegment]);

  const filteredQuotes = useMemo(() => {
    const base = quotes.filter((quote) => matchesAdvancedFilters({
      zip: quote.customerDetails?.zipCode,
      city: quote.customerDetails?.city,
      state: quote.customerDetails?.state,
      tags: quote.tags?.map((t) => t.name) ?? [],
      services: quote.lineItems?.map((li) => li.description) ?? [],
      species: quote.customerDetails?.addressLine1 ? [quote.customerDetails.addressLine1] : [],
      status: quote.status,
      clientType: quote.client?.clientType,
      lifetimeValue: quote.totalAmount,
      lastInteraction: quote.updatedAt,
    }));

    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(
      (quote) =>
        quote.quoteNumber?.toLowerCase().includes(term) ||
        quote.customerName?.toLowerCase().includes(term) ||
        quote.status?.toLowerCase().includes(term)
    );
  }, [quotes, searchTerm, zipFilter, serviceFilter, tagFilters, speciesFilter, activeSegment]);

  useEffect(() => {
    setSelectedLeadIds((prev) => prev.filter((id) => filteredLeads.some((lead) => lead.id === id)));
  }, [filteredLeads]);

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

  const leadBoardColumns = useMemo(() => {
    const statuses: Lead['status'][] = ['New', 'Contacted', 'Qualified', 'Lost'];

    return statuses.map((status) => {
      const leadsForStatus = filteredLeads.filter((lead) => lead.status === status);
      const convertedLeads = leadsForStatus.filter((lead) =>
        quotes.some((quote) => quote.leadId === lead.id && (quote.status === 'Accepted' || quote.status === 'Converted'))
      );

      return {
        status,
        leads: leadsForStatus,
        convertedCount: convertedLeads.length,
        conversionRate: leadsForStatus.length ? Math.round((convertedLeads.length / leadsForStatus.length) * 100) : 0,
        totalValue: leadsForStatus.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0),
      };
    });
  }, [filteredLeads, quotes]);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    setSelectedLeadIds(filteredLeads.map((lead) => lead.id));
  };

  const clearLeadSelection = () => {
    setSelectedLeadIds([]);
  };

  const handleBulkReminder = () => {
    if (selectedLeadIds.length === 0) return;
    setBulkActionMessage(
      `Queued reminders for ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}.`
    );
  };

  const handleBulkConvert = () => {
    if (selectedLeadIds.length === 0) return;

    const lead = leads.find((item) => item.id === selectedLeadIds[0]);
    if (lead) {
      setLeadToConvert(lead);
      setIsQuoteEditorOpen(true);
      setBulkActionMessage(
        selectedLeadIds.length > 1
          ? `Opening the first lead for conversion. ${selectedLeadIds.length - 1} remaining in selection.`
          : 'Opening selected lead for conversion.'
      );
    }
  };

  const handleBulkSchedule = () => {
    if (selectedLeadIds.length === 0) return;
    setBulkActionMessage(
      `Scheduled follow-up tasks for ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}.`
    );
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
      // Refresh quotes list
      const updatedQuotes = await quoteService.getAll();
      setQuotes(updatedQuotes);
      
      // If a lead was converted, it's now deleted - refresh leads list
      if (leadToConvert) {
        const updatedLeads = await leadService.getAll();
        setLeads(updatedLeads);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
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

  const handleDeleteLead = async (lead: Lead) => {
    if (window.confirm(`Are you sure you want to delete lead "${lead.customer?.name || lead.id}"? This action cannot be undone.`)) {
      try {
        await leadService.remove(lead.id);
        setLeads(prev => prev.filter(l => l.id !== lead.id));
        alert('Lead deleted successfully');
      } catch (error: any) {
        console.error('Error deleting lead:', error);
        alert('Failed to delete lead: ' + error.message);
      }
    }
  };

  const handleDeleteQuote = async (quote: Quote) => {
    if (window.confirm(`Are you sure you want to delete quote ${quote.quoteNumber || quote.id}? This action cannot be undone.`)) {
      try {
        await quoteService.remove(quote.id);
        setQuotes(prev => prev.filter(q => q.id !== quote.id));
        alert('Quote deleted successfully');
      } catch (error: any) {
        console.error('Error deleting quote:', error);
        alert('Failed to delete quote: ' + error.message);
      }
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

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-brand-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-brand-gray-900">Segmentation Filters</h3>
              <p className="text-xs text-brand-gray-600">Layer geographic, service, and tag criteria.</p>
            </div>
            {isSegmentsLoading && <SpinnerIcon className="h-5 w-5 text-brand-cyan-600" />}
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-brand-gray-700">Zip / City / State</label>
              <input
                type="text"
                value={zipFilter}
                onChange={(e) => setZipFilter(e.target.value)}
                placeholder="e.g., 94110 or Seattle"
                className="mt-1 w-full rounded-md border-brand-gray-300 text-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-brand-gray-700">Service history</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value as any)}
                  className="mt-1 w-full rounded-md border-brand-gray-300 text-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500"
                >
                  <option value="any">Any</option>
                  <option value="removal">Removals</option>
                  <option value="pruning">Pruning</option>
                  <option value="plant_health">Plant health</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-gray-700">Tree species</label>
                <input
                  type="text"
                  value={speciesFilter}
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                  placeholder="e.g., oak"
                  className="mt-1 w-full rounded-md border-brand-gray-300 text-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-brand-gray-700 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {['VIP', 'HOA', 'Commercial', 'High Value', 'Plant Health'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`px-3 py-1 text-xs rounded-full border ${tagFilters.includes(tag)
                      ? 'bg-brand-cyan-50 border-brand-cyan-500 text-brand-cyan-700'
                      : 'border-brand-gray-200 text-brand-gray-700 hover:border-brand-gray-300'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-brand-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-brand-gray-900">Saved Segments</h3>
              <p className="text-xs text-brand-gray-600">Apply consistent audiences across CRM + marketing.</p>
            </div>
            <span className="text-xs text-brand-gray-500">{segments.length} total</span>
          </div>
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {activeSegmentId && (
              <button
                onClick={() => setActiveSegmentId(null)}
                className="w-full text-left rounded-md border border-brand-gray-300 bg-brand-gray-50 px-3 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-100 transition"
              >
                Clear segment filter
              </button>
            )}
            {segments.map((segment) => (
              <button
                key={segment.id}
                onClick={() => setActiveSegmentId(activeSegmentId === segment.id ? null : segment.id)}
                className={`w-full text-left rounded-md border px-3 py-2 transition ${activeSegmentId === segment.id
                  ? 'border-brand-cyan-500 bg-brand-cyan-50'
                  : 'border-brand-gray-200 hover:border-brand-gray-300'
                  }`}
              >
                <div className="flex items-center justify-between text-sm font-medium text-brand-gray-900">
                  <span>{segment.name}</span>
                  <span className="text-xs text-brand-gray-600">{segment.audienceCount} ppl</span>
                </div>
                {segment.description && <p className="text-xs text-brand-gray-600 mt-1 line-clamp-2">{segment.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {segment.criteria.slice(0, 3).map((criterion) => (
                    <span key={criterion.id} className="text-[11px] bg-brand-gray-100 text-brand-gray-700 px-2 py-0.5 rounded-full">
                      {criterion.label || `${criterion.field}: ${String(criterion.value)}`}
                    </span>
                  ))}
                  {segment.criteria.length > 3 && (
                    <span className="text-[11px] text-brand-gray-600">+{segment.criteria.length - 3} more</span>
                  )}
                </div>
              </button>
            ))}
            {segments.length === 0 && (
              <p className="text-xs text-brand-gray-600">No saved segments yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-brand-gray-200 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-gray-900">Segment Snapshot</h3>
          <p className="text-xs text-brand-gray-600">Preview who will be targeted before launching workflows.</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-gray-700">Audience size</span>
              <span className="text-lg font-semibold text-brand-gray-900">{segmentPreview.audienceCount || '—'}</span>
            </div>
            <div>
              <p className="text-xs text-brand-gray-700">Common tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(segmentPreview.sampleTags || ['High value', 'Pruning', 'Recurring']).map((tag) => (
                  <span key={tag} className="text-[11px] bg-brand-gray-100 text-brand-gray-700 px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-brand-gray-50 border border-brand-gray-200 p-3 text-xs text-brand-gray-700">
              Keep filters lean: zip + tag + status yields high-signal audiences for automation and marketing.
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'clients' && (
        <div className="mt-6">
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
                        {client.clientType && (
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                client.clientType === 'commercial'
                                  ? 'bg-purple-100 text-purple-800'
                                  : client.clientType === 'residential'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {client.clientType}
                            </span>
                          </div>
                        )}
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
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {leadQueueOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveLeadQueue(option.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    activeLeadQueue === option.id
                      ? 'border-brand-cyan-600 bg-brand-cyan-50 text-brand-cyan-800'
                      : 'border-brand-gray-200 bg-white text-brand-gray-700 hover:border-brand-cyan-300'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    <span>{option.label}</span>
                    <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-brand-gray-700 border border-brand-gray-200">
                      {leadQueueCounts[option.id]} in queue
                    </span>
                  </div>
                  <p className="text-xs text-brand-gray-500 mt-1">{option.description}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-gray-600">View</span>
              <div className="inline-flex rounded-md shadow-sm border border-brand-gray-200 overflow-hidden">
                <button
                  onClick={() => setLeadViewMode('cards')}
                  className={`px-3 py-2 text-sm font-medium ${
                    leadViewMode === 'cards'
                      ? 'bg-brand-cyan-600 text-white'
                      : 'bg-white text-brand-gray-700 hover:bg-brand-gray-50'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setLeadViewMode('board')}
                  className={`px-3 py-2 text-sm font-medium border-l border-brand-gray-200 ${
                    leadViewMode === 'board'
                      ? 'bg-brand-cyan-600 text-white'
                      : 'bg-white text-brand-gray-700 hover:bg-brand-gray-50'
                  }`}
                >
                  Board
                </button>
              </div>
            </div>
          </div>

          {bulkActionMessage && (
            <div className="rounded-md border border-brand-cyan-200 bg-brand-cyan-50 px-4 py-3 text-sm text-brand-cyan-800">
              {bulkActionMessage}
            </div>
          )}

          {filteredLeads.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-gray-200 bg-brand-gray-50 px-3 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                  onChange={(e) => (e.target.checked ? selectAllLeads() : clearLeadSelection())}
                  className="h-4 w-4 rounded border-brand-gray-300 text-brand-cyan-600 focus:ring-brand-cyan-500"
                />
                <span className="text-sm text-brand-gray-700">
                  {selectedLeadIds.length} selected
                </span>
                {selectedLeadIds.length > 0 && (
                  <button onClick={clearLeadSelection} className="text-sm text-brand-cyan-600 hover:text-brand-cyan-700">
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBulkReminder}
                  className="inline-flex items-center rounded-md border border-brand-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-gray-800 shadow-sm hover:border-brand-cyan-300"
                >
                  Send reminder
                </button>
                <button
                  onClick={handleBulkConvert}
                  className="inline-flex items-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700"
                >
                  Convert to quote
                </button>
                <button
                  onClick={handleBulkSchedule}
                  className="inline-flex items-center rounded-md border border-brand-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-gray-800 shadow-sm hover:border-brand-cyan-300"
                >
                  Schedule follow-up
                </button>
              </div>
            </div>
          )}

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
          ) : leadViewMode === 'board' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {leadBoardColumns.map((column) => (
                <div key={column.status} className="rounded-lg border border-brand-gray-200 bg-white shadow-sm">
                  <div className="border-b border-brand-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-brand-gray-900">{column.status}</p>
                        <p className="text-xs text-brand-gray-500">{column.leads.length} leads • {column.conversionRate}% converted</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase text-brand-gray-500">Converted</p>
                        <p className="text-sm font-semibold text-brand-gray-900">{column.convertedCount}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-brand-gray-600">Total est. value {formatCurrency(column.totalValue)}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {column.leads.length === 0 ? (
                      <p className="text-sm text-brand-gray-500">No leads in this stage.</p>
                    ) : (
                      column.leads.map((lead) => (
                        <div key={lead.id} className="rounded-md border border-brand-gray-200 p-3 shadow-sm hover:border-brand-cyan-200">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="mt-1 h-4 w-4 rounded border-brand-gray-300 text-brand-cyan-600 focus:ring-brand-cyan-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-brand-gray-900">
                                    {lead.customer?.name || 'Unknown Customer'}
                                  </p>
                                  <p className="text-xs text-brand-gray-500">{lead.source || 'Unknown Source'}</p>
                                </div>
                                {lead.priority && (
                                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${getPriorityColor(lead.priority)}`}>
                                    {lead.priority}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-gray-600">
                                <span className="inline-flex items-center rounded-full bg-brand-gray-100 px-2 py-0.5 font-medium text-brand-gray-700">
                                  Lead score: {lead.leadScore || 0}/100
                                </span>
                                {lead.estimatedValue !== undefined && lead.estimatedValue > 0 && (
                                  <span className="inline-flex items-center rounded-full bg-brand-gray-100 px-2 py-0.5 font-medium text-brand-gray-700">
                                    Est. {formatCurrency(lead.estimatedValue)}
                                  </span>
                                )}
                                {isLeadStalled(lead) && (
                                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 border border-red-200">
                                    Stalled
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-col gap-1 text-xs text-brand-gray-600">
                                {lead.nextFollowupDate && (
                                  <span>Next follow-up: {formatDate(lead.nextFollowupDate)}</span>
                                )}
                                {lead.lastContactDate && (
                                  <span>Last contacted: {formatDate(lead.lastContactDate)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleLeadEdit(lead.id)}
                              className="flex-1 rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-xs font-medium text-brand-cyan-700 hover:border-brand-cyan-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleConvertToQuote(lead.id)}
                              className="flex-1 rounded-md bg-brand-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-cyan-700"
                            >
                              Convert
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead)}
                              className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:border-red-300 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-brand-gray-200"
                >
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
                    onClick={() => handleLeadEdit(lead.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 h-4 w-4 rounded border-brand-gray-300 text-brand-cyan-600 focus:ring-brand-cyan-500"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-brand-gray-900">
                            {lead.customer?.name || 'Unknown Customer'}
                          </h3>
                          <p className="mt-1 text-sm text-brand-gray-500">{lead.source || 'Unknown Source'}</p>
                        </div>
                      </div>
                      {lead.priority && (
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getLeadStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                      {isLeadStalled(lead) && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700 border border-red-200">
                          Stalled follow-up
                        </span>
                      )}
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
                  </div>

                  <div className="px-6 pb-6 pt-4 border-t border-brand-gray-100 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLeadEdit(lead.id); }}
                      className="flex-1 text-sm font-medium text-brand-cyan-600 hover:text-brand-cyan-700 py-2 px-3 border border-brand-cyan-600 rounded-md hover:bg-brand-cyan-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConvertToQuote(lead.id); }}
                      className="flex-1 text-sm font-medium text-white bg-brand-cyan-600 hover:bg-brand-cyan-700 py-2 px-3 rounded-md"
                    >
                      Convert to Quote
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead); }}
                      className="text-sm font-medium text-red-600 hover:text-red-700 py-2 px-3 border border-red-300 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
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
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
                    onClick={() => handleQuoteEdit(quote.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-gray-900">
                          {quote.quoteNumber || quote.id}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-brand-gray-700">{quote.customerName || 'Unknown Customer'}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getQuoteStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>

                    {(quote.jobLocation || quote.property?.address || quote.customerDetails?.addressLine1) && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-brand-gray-600">
                        <svg className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{quote.jobLocation || 
                          (quote.property?.address ? [quote.property.address, quote.property.city, quote.property.state].filter(Boolean).join(', ') : null) ||
                          [quote.customerDetails?.addressLine1, quote.customerDetails?.city, quote.customerDetails?.state].filter(Boolean).join(', ')
                        }</span>
                      </div>
                    )}

                    {quote.lineItems && quote.lineItems.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-brand-gray-500 uppercase mb-1">Work</p>
                        <div className="space-y-1">
                          {quote.lineItems.filter(item => item.selected !== false).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-brand-gray-700 truncate flex-1 mr-2">{item.quantity > 1 ? `${item.quantity}x ` : ''}{item.description}</span>
                              <span className="text-brand-gray-900 font-medium">{formatCurrency(item.price)}</span>
                            </div>
                          ))}
                          {quote.lineItems.filter(item => item.selected !== false).length > 3 && (
                            <p className="text-xs text-brand-gray-500">+{quote.lineItems.filter(item => item.selected !== false).length - 3} more items</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-brand-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-brand-gray-600">Total</span>
                        <span className="text-xl font-bold text-brand-gray-900">
                          {formatCurrency(quote.grandTotal || quote.totalAmount || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-brand-gray-600">Created:</span>
                        <span className="text-brand-gray-900">{formatDate(quote.createdAt)}</span>
                      </div>
                      {quote.validUntil && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-brand-gray-600">Expires:</span>
                          <span className="text-brand-gray-900">{formatDate(quote.validUntil)}</span>
                        </div>
                      )}
                    </div>

                    {quote.tags && quote.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
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

                  <div className="px-6 pb-6 pt-4 border-t border-brand-gray-100 flex gap-2">
                    <button
                      onClick={() => handleQuoteEdit(quote.id)}
                      className="flex-1 text-sm font-medium text-white bg-brand-cyan-600 hover:bg-brand-cyan-700 py-2 px-3 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuote(quote)}
                      className="text-sm font-medium text-red-600 hover:text-red-700 py-2 px-3 border border-red-300 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
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
