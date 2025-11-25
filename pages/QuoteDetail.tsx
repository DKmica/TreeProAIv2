import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quote, Client, Invoice, QuotePricingOption, QuoteProposalData, QuoteVersion, AiAccuracyStats, AiQuoteRecommendation } from '../types';
import { quoteService, clientService, jobService, aiService } from '../services/apiService';
import { Quote, Client, Invoice, QuotePricingOption, QuoteProposalData, QuoteVersion, AiAccuracyStats } from '../types';
import { quoteService, clientService, jobService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import QuoteIcon from '../components/icons/QuoteIcon';
import AssociationModal from '../components/AssociationModal';
import StatusBadge from '../components/StatusBadge';
import ProposalPreview from '../components/ProposalPreview';
import PricingOptionsGrid from '../components/PricingOptionsGrid';
import QuoteVersionTimeline from '../components/QuoteVersionTimeline';
import { useToast } from '../components/ui/Toast';
import AiInsightsPanel from '../components/AiInsightsPanel';

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [pendingConversion, setPendingConversion] = useState<'job' | 'invoice' | null>(null);
  const [linkageMessages, setLinkageMessages] = useState<string[]>([]);
  const [proposal, setProposal] = useState<QuoteProposalData | null>(null);
  const [pricingOptions, setPricingOptions] = useState<QuotePricingOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(undefined);
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);
  const [aiStats, setAiStats] = useState<AiAccuracyStats | null>(null);
  const [accuracyForm, setAccuracyForm] = useState({ actualPrice: '', notes: '', aiSuggestionsFollowed: false });
  const [isOptionLoading, setIsOptionLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AiQuoteRecommendation | null>(null);
  const [isAiRecommendationLoading, setIsAiRecommendationLoading] = useState(false);
  const [aiRecommendationError, setAiRecommendationError] = useState<string | null>(null);
  const toast = useToast();

  const loadProposalData = async (quoteId: string) => {
    try {
      const proposalData = await quoteService.getProposal(quoteId);
      setProposal(proposalData);
      if (proposalData.pricingOptions && proposalData.pricingOptions.length > 0) {
        setSelectedOptionId(proposalData.pricingOptions.find((opt) => opt.isSelected)?.id);
      }
    } catch (err: any) {
      console.error('Error loading proposal data', err);
      toast?.error?.(err.message || 'Could not load proposal preview');
    }
  };

  const loadPricingOptions = async (quoteId: string) => {
    try {
      const options = await quoteService.getPricingOptions(quoteId);
      setPricingOptions(options);
      setSelectedOptionId(options.find((opt) => opt.isSelected)?.id);
    } catch (err: any) {
      console.error('Error loading pricing options', err);
      toast?.error?.(err.message || 'Could not load pricing options');
    }
  };

  const loadVersionHistory = async (quoteId: string) => {
    try {
      const history = await quoteService.getVersionHistory(quoteId);
      setVersions(history);
    } catch (err: any) {
      console.error('Error loading version history', err);
      toast?.error?.(err.message || 'Could not load version history');
    }
  };

  const loadAiAccuracy = async () => {
    try {
      const stats = await quoteService.getAiAccuracyStats('month');
      setAiStats(stats);
    } catch (err: any) {
      console.error('Error loading accuracy stats', err);
    }
  };

  const loadAiRecommendation = async (quoteId: string) => {
    setIsAiRecommendationLoading(true);
    setAiRecommendationError(null);
    try {
      const recommendation = await aiService.getQuoteRecommendations(quoteId);
      setAiRecommendation(recommendation);
    } catch (err: any) {
      console.error('Error loading AI quote recommendations', err);
      setAiRecommendationError(err?.message || 'AI quote enhancements are unavailable.');
    } finally {
      setIsAiRecommendationLoading(false);
    }
  };

  useEffect(() => {
    const fetchQuoteData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
        try {
          const quoteData = await quoteService.getById(id);
          setQuote(quoteData);

          loadProposalData(id);
          loadPricingOptions(id);
          loadVersionHistory(id);
          loadAiAccuracy();
          loadAiRecommendation(id);

          if (quoteData.clientId) {
            try {
              const clientData = await clientService.getById(quoteData.clientId);
      try {
        const quoteData = await quoteService.getById(id);
        setQuote(quoteData);

        loadProposalData(id);
        loadPricingOptions(id);
        loadVersionHistory(id);
        loadAiAccuracy();

        if (quoteData.clientId) {
          try {
            const clientData = await clientService.getById(quoteData.clientId);
            setClient(clientData);
          } catch (err) {
            console.error('Error fetching client data:', err);
          }
        }
      } catch (err: any) {
        console.error('Error fetching quote data:', err);
        setError(err.message || 'Failed to load quote data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuoteData();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string | any) => {
    if (!dateString || typeof dateString !== 'string') return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const aiQuoteItems = React.useMemo(() => {
    if (!aiRecommendation) return [];
    const items: { id: string; title: string; description: string; tag?: string; confidence?: number; meta?: string }[] = [];

    items.push({
      id: 'summary',
      title: 'Win-rate boost',
      description: aiRecommendation.summary,
      tag: 'Recommendation',
      confidence: aiRecommendation.expectedWinRateLift ? aiRecommendation.expectedWinRateLift / 100 : undefined,
      meta: aiRecommendation.nextBestAction,
    });

    aiRecommendation.upsellIdeas?.forEach((idea, idx) => {
      items.push({
        id: `upsell-${idx}`,
        title: 'Upsell idea',
        description: idea,
        tag: 'Upsell',
      });
    });

    aiRecommendation.pricingSuggestions?.forEach((suggestion, idx) => {
      items.push({
        id: `price-${idx}`,
        title: `${suggestion.optionLabel} pricing`,
        description: `Suggested ${formatCurrency(suggestion.suggestedPrice)}`,
        tag: 'Pricing',
        meta: suggestion.rationale,
      });
    });

    aiRecommendation.riskFlags?.forEach((flag, idx) => {
      items.push({
        id: `risk-${idx}`,
        title: 'Risk flag',
        description: flag,
        tag: 'Risk',
      });
    });

    return items;
  }, [aiRecommendation]);

  const handleRecommendOption = async (optionId: string) => {
    if (!id) return;
    setIsOptionLoading(true);
    try {
      const updated = await quoteService.recommendPricingOption(optionId);
      setPricingOptions((prev) => prev.map((opt) => ({ ...opt, isRecommended: opt.id === updated.id })));
      toast?.success?.('Option marked as featured');
    } catch (err: any) {
      console.error(err);
      toast?.error?.(err.message || 'Could not update recommendation');
    } finally {
      setIsOptionLoading(false);
    }
  };

  const handleSelectOption = async (optionId: string) => {
    if (!id) return;
    setIsOptionLoading(true);
    try {
      const result = await quoteService.selectPricingOption(id, optionId);
      setPricingOptions(result.options);
      setSelectedOptionId(result.selected.id);
      toast?.success?.('Customer-ready option highlighted');
    } catch (err: any) {
      console.error(err);
      toast?.error?.(err.message || 'Unable to select option');
    } finally {
      setIsOptionLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!id) return;
    setSavingVersion(true);
    try {
      const version = await quoteService.createVersion(id, 'UI snapshot');
      setVersions((prev) => [version, ...prev]);
      toast?.success?.('Version snapshot saved');
    } catch (err: any) {
      console.error(err);
      toast?.error?.(err.message || 'Unable to save version');
    } finally {
      setSavingVersion(false);
    }
  };

  const handleSubmitAccuracy = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !accuracyForm.actualPrice) {
      toast?.error?.('Provide the final price used');
      return;
    }
    try {
      await quoteService.recordAccuracy(id, parseFloat(accuracyForm.actualPrice), {
        notes: accuracyForm.notes,
        ai_suggestions_followed: accuracyForm.aiSuggestionsFollowed,
      });
      toast?.success?.('Accuracy feedback captured');
      loadAiAccuracy();
      setAccuracyForm({ actualPrice: '', notes: '', aiSuggestionsFollowed: false });
    } catch (err: any) {
      console.error(err);
      toast?.error?.(err.message || 'Unable to submit feedback');
    }
  };

  const handleBack = () => {
    if (quote?.clientId) {
      navigate(`/crm/clients/${quote.clientId}`);
    } else {
      navigate('/crm');
    }
  };

  const handleAccept = () => {
    if (window.confirm('Accept this quote?')) {
      alert('Accept quote functionality will be implemented next');
    }
  };

  const handleDecline = () => {
    if (window.confirm('Decline this quote?')) {
      alert('Decline quote functionality will be implemented next');
    }
  };

  const handleConvertToJob = () => {
    setPendingConversion('job');
    if (!quote?.clientId || !quote.propertyId) {
      setShowAssociationModal(true);
      return;
    }
    executeJobConversion(quote);
  };

  const executeJobConversion = async (quoteToConvert: Quote) => {
    try {
      const newJob = await quoteService.convertToJob(quoteToConvert.id);
      const updatedQuote = await quoteService.getById(quoteToConvert.id);
      setQuote(updatedQuote);

      if (updatedQuote.clientId) {
        try {
          const updatedClient = await clientService.getById(updatedQuote.clientId);
          setClient(updatedClient);
        } catch (clientErr) {
          console.error('Error refreshing client data after conversion:', clientErr);
        }
      }

      setLinkageMessages([`Created job ${newJob.jobNumber || newJob.id} from this quote.`]);
    } catch (err: any) {
      const message = getApiErrorMessage(err, 'Failed to convert quote to job');
      setLinkageMessages([`Conversion failed: ${message}`]);
      alert(message);
    } finally {
      setPendingConversion(null);
    }
  };

  const handleConvertToInvoice = () => {
    setPendingConversion('invoice');
    if (!quote?.clientId || !quote.propertyId) {
      setShowAssociationModal(true);
      return;
    }
    executeInvoiceConversion(quote);
  };

  const executeInvoiceConversion = async (quoteToConvert: Quote) => {
    try {
      const { invoice, quote: updatedQuote } = await quoteService.convertToInvoice(quoteToConvert.id);
      setQuote(updatedQuote);
      setCreatedInvoice(invoice);
      setLinkageMessages([
        `Created invoice ${invoice.invoiceNumber || invoice.id} from this quote.`,
        `Quote status updated to ${updatedQuote.status}.`
      ]);
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    }
  };

  const handleEdit = () => {
    alert('Edit quote functionality will be implemented next');
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
      alert('Delete quote functionality will be implemented next');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <SpinnerIcon className="h-12 w-12 text-brand-cyan-600 mx-auto" />
          <p className="mt-4 text-brand-gray-600">Loading quote data...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (quote && quote.status === 'Accepted' && quote.clientId && !quote.propertyId) {
      setLinkageMessages(['Property missing — add a property before scheduling work.']);
    }
  }, [quote]);

  if (error || !quote) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200">
        <p className="text-red-800">Error: {error || 'Quote not found'}</p>
        <button
          onClick={handleBack}
          className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          ← Back
        </button>
      </div>
    );
  }

  const clientName = client?.companyName ||
    (client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : '') ||
    quote.customerName ||
    'Unknown Client';

  const propertyAddress = quote.property 
    ? [
        quote.property?.addressLine1,
        quote.property?.addressLine2,
        [quote.property?.city, quote.property?.state].filter(Boolean).join(', '),
        quote.property?.zipCode,
      ].filter(Boolean).join(', ')
    : quote.jobLocation || 'N/A';

  const subtotal = quote.lineItems?.reduce((sum, item) => sum + (item.selected ? item.price : 0), 0) || parseFloat(quote.totalAmount as any) || 0;
  const discountAmount = parseFloat(quote.discountAmount as any) || 0;
  const taxAmount = parseFloat(quote.taxAmount as any) || 0;
  const grandTotal = parseFloat(quote.grandTotal as any) || (subtotal - discountAmount + taxAmount);

  const handleAssociationsCreated = ({ clientId, propertyId }: { clientId: string; propertyId: string }) => {
    setQuote(prev => prev ? { ...prev, clientId, propertyId } : prev);
    setLinkageMessages([]);
    if (!quote) return;
    if (pendingConversion === 'job') {
      executeJobConversion({ ...quote, clientId, propertyId });
    } else if (pendingConversion === 'invoice') {
      executeInvoiceConversion({ ...quote, clientId, propertyId });
    }
    setPendingConversion(null);
  };

  return (
    <div>
      <nav className="flex mb-4 text-sm text-brand-gray-600">
        <button onClick={handleBack} className="hover:text-brand-cyan-600">
          {quote.clientId ? 'Client' : 'CRM'}
        </button>
        {quote.clientId && client && (
          <>
            <span className="mx-2">/</span>
            <button onClick={handleBack} className="hover:text-brand-cyan-600">
              {clientName}
            </button>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-brand-gray-900 font-medium">Quote {quote.quoteNumber || quote.id}</span>
      </nav>

      {linkageMessages.length > 0 && (
        <div className="mb-4 space-y-2">
          {linkageMessages.map((message, idx) => (
            <div key={idx} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 9v2m0 4h.01M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">{message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {createdInvoice && (
        <div className="mb-4 bg-white border border-brand-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-brand-gray-600">Invoice Created</p>
              <p className="text-lg font-semibold text-brand-gray-900">{createdInvoice.invoiceNumber || createdInvoice.id}</p>
              <p className="text-sm text-brand-gray-600">Due {formatDate(createdInvoice.dueDate)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={createdInvoice.status} size="sm" />
              <div className="text-right">
                <p className="text-xs text-brand-gray-500">Balance Due</p>
                <p className="text-base font-semibold text-brand-gray-900">{formatCurrency(createdInvoice.amountDue || createdInvoice.grandTotal)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <QuoteIcon className="h-8 w-8 text-brand-cyan-600" />
                <h1 className="text-3xl font-bold text-brand-gray-900">Quote {quote.quoteNumber || `#${quote.id.slice(0, 8)}`}</h1>
                <StatusBadge status={quote.status} size="sm" />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-brand-gray-600">
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {clientName}
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Created {formatDate(quote.createdAt)}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-brand-gray-50 rounded-md border border-brand-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand-gray-900">Convert to Job</p>
                  <p className="text-xs text-brand-gray-600">Use existing IDs for scheduling.</p>
                </div>
                <button
                  onClick={handleConvertToJob}
                  className="px-3 py-2 bg-brand-cyan-600 text-white rounded-md hover:bg-brand-cyan-700 text-sm font-medium"
                >
                  One-click job
                </button>
              </div>
            </div>
            <div className="p-4 bg-brand-gray-50 rounded-md border border-brand-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand-gray-900">Generate Invoice</p>
                  <p className="text-xs text-brand-gray-600">Draft billing from this quote.</p>
                </div>
                <button
                  onClick={handleConvertToInvoice}
                  className="px-3 py-2 bg-brand-green-600 text-white rounded-md hover:bg-brand-green-700 text-sm font-medium"
                >
                  Build invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {quote.status === 'Sent' && (
          <>
            <button
              onClick={handleAccept}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
            >
              Accept
            </button>
            <button
            <button
              onClick={handleAccept}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
            >
              Accept
            </button>
            <button
            <button
              onClick={handleAccept}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
            >
              Accept
            </button>
            <button
              onClick={handleDecline}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 font-medium text-sm"
            >
              Decline
            </button>
          </>
        )}
        {quote.status === 'Accepted' && (
          <button
            onClick={handleConvertToJob}
            className="px-4 py-2 bg-brand-cyan-600 text-white rounded-md hover:bg-brand-cyan-700 font-medium text-sm"
          >
            Convert to Job
          </button>
        )}
        {quote.status !== 'Converted' && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 border border-brand-cyan-600 text-brand-cyan-600 rounded-md hover:bg-brand-cyan-50 font-medium text-sm"
          >
            Edit
          </button>
        )}
        <button
          onClick={handleDelete}
          className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 font-medium text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          {proposal && <ProposalPreview proposal={proposal} />}
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-brand-gray-900">Good/Better/Best</p>
                <p className="text-xs text-brand-gray-600">Let customers pick the right scope.</p>
              </div>
              <span className="text-xs text-brand-gray-500">Live</span>
            </div>
            <PricingOptionsGrid
              options={pricingOptions}
              onSelect={handleSelectOption}
              onRecommend={handleRecommendOption}
              isLoading={isOptionLoading}
              selectedOptionId={selectedOptionId}
            />
          </div>

          <QuoteVersionTimeline versions={versions} onSnapshot={handleSaveVersion} isSaving={savingVersion} />

          <div className="bg-white border border-brand-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-gray-900">AI Accuracy Loop</p>
                <p className="text-xs text-brand-gray-600">Close the loop with actuals to tune estimates.</p>
              </div>
              {aiStats && (
                <span className="text-xs px-2 py-1 rounded-full bg-brand-cyan-50 text-brand-cyan-700 border border-brand-cyan-100">
                  Avg score {aiStats.summary.avg_accuracy_score.toFixed(1)}
                </span>
              )}
            </div>

            <form className="mt-3 space-y-3" onSubmit={handleSubmitAccuracy}>
              <div>
                <label className="text-xs font-semibold text-brand-gray-600 block">Final price used</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-cyan-500"
                  value={accuracyForm.actualPrice}
                  onChange={(e) => setAccuracyForm((prev) => ({ ...prev, actualPrice: e.target.value }))}
                  placeholder="Enter actual invoice amount"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-gray-600 block">Notes</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-cyan-500"
                  rows={2}
                  value={accuracyForm.notes}
                  onChange={(e) => setAccuracyForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Why did the price change?"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-brand-gray-700">
                <input
                  type="checkbox"
                  checked={accuracyForm.aiSuggestionsFollowed}
                  onChange={(e) => setAccuracyForm((prev) => ({ ...prev, aiSuggestionsFollowed: e.target.checked }))}
                  className="h-4 w-4 text-brand-cyan-600 border-brand-gray-300 rounded"
                />
                Followed AI suggestions
              </label>
              <button
                type="submit"
                className="w-full px-3 py-2 rounded-md bg-brand-cyan-600 text-white text-sm font-semibold hover:bg-brand-cyan-700"
              >
                Send feedback
              </button>
              {aiStats && (
                <div className="mt-2 text-xs text-brand-gray-600 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-brand-gray-100 text-brand-gray-700">
                    Feedback rate {aiStats.summary.feedback_rate}%
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-800">
                    Variance avg {aiStats.summary.avg_variance_percentage}%
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
              <h2 className="text-xl font-semibold text-brand-gray-900 mb-4">Quote Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-brand-gray-500">Quote Number</label>
                  <p className="mt-1 text-brand-gray-900">{quote.quoteNumber || `#${quote.id.slice(0, 8)}`}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-gray-500">Version</label>
                  <p className="mt-1 text-brand-gray-900">{quote.version || 1}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-gray-500">Customer</label>
                  <p className="mt-1 text-brand-gray-900">{clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-gray-500">Property</label>
                  <p className="mt-1 text-brand-gray-900">
                    {quote.property?.propertyName || propertyAddress}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-gray-500">Created Date</label>
                  <p className="mt-1 text-brand-gray-900">{formatDate(quote.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-gray-500">Valid Until</label>
                  <p className="mt-1 text-brand-gray-900">{formatDate(quote.validUntil)}</p>
                </div>
                {quote.acceptedAt && (
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Accepted Date</label>
                    <p className="mt-1 text-brand-gray-900">{formatDate(quote.acceptedAt)}</p>
                  </div>
                )}
                {quote.approvedBy && (
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500">Approved By</label>
                    <p className="mt-1 text-brand-gray-900">{quote.approvedBy}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
              <h2 className="text-xl font-semibold text-brand-gray-900 mb-4">Line Items</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-gray-200">
                  <thead className="bg-brand-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-brand-gray-500 uppercase tracking-wider">
                        Selected
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-gray-200">
                    {quote.lineItems && quote.lineItems.length > 0 ? (
                      quote.lineItems.map((item, index) => (
                        <tr key={index} className={item.selected ? '' : 'opacity-50'}>
                          <td className="px-4 py-4 whitespace-pre-wrap text-sm text-brand-gray-900">
                            {item.description}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-brand-gray-900 text-right font-medium">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {item.selected ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                No
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-brand-gray-500">
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {quote.stumpGrindingPrice && parseFloat(quote.stumpGrindingPrice as any) > 0 && (
                <div className="mt-4 p-3 bg-brand-gray-50 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-brand-gray-700">Stump Grinding</span>
                    <span className="text-sm font-medium text-brand-gray-900">{formatCurrency(parseFloat(quote.stumpGrindingPrice as any))}</span>
                  </div>
                </div>
              )}
            </div>

            {(quote.specialInstructions || quote.termsAndConditions || quote.internalNotes) && (
              <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
                <h2 className="text-xl font-semibold text-brand-gray-900 mb-4">Notes & Terms</h2>
                
                {quote.specialInstructions && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-brand-gray-500 block mb-2">Special Instructions</label>
                    <p className="text-brand-gray-900 text-sm whitespace-pre-wrap">{quote.specialInstructions}</p>
                  </div>
                )}
                
                {quote.termsAndConditions && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-brand-gray-500 block mb-2">Terms & Conditions</label>
                    <p className="text-brand-gray-900 text-sm whitespace-pre-wrap">{quote.termsAndConditions}</p>
                  </div>
                )}
                
                {quote.internalNotes && (
                  <div>
                    <label className="text-sm font-medium text-brand-gray-500 block mb-2">Internal Notes</label>
                    <p className="text-brand-gray-900 text-sm whitespace-pre-wrap bg-yellow-50 p-3 rounded-md border border-yellow-200">
                      {quote.internalNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6 sticky top-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-brand-gray-900 flex items-center gap-2">
                    <QuoteIcon className="w-5 h-5 text-brand-cyan-600" />
                    AI quote enhancements
                  </h2>
                  <span className="rounded-full bg-brand-gray-100 px-2 py-1 text-[11px] font-medium text-brand-gray-700">AI</span>
                </div>

                {isAiRecommendationLoading && (
                  <div className="rounded-md border border-brand-gray-200 bg-brand-gray-50 p-3 text-sm text-brand-gray-700">
                    Calibrating recommendations…
                  </div>
                )}

                {aiRecommendationError && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    {aiRecommendationError}
                  </div>
                )}

                <AiInsightsPanel
                  title="Proposal copilot"
                  subtitle="Pricing, risk, and upsell ideas tailored to this quote"
                  items={aiQuoteItems}
                  icon="sparkles"
                />
              </div>

              <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
              <h2 className="text-xl font-semibold text-brand-gray-900 mb-4">Pricing Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-brand-gray-200">
                  <span className="text-sm text-brand-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-brand-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center pb-3 border-b border-brand-gray-200">
                    <span className="text-sm text-brand-gray-600">
                      Discount
                      {parseFloat(quote.discountPercentage as any) > 0 && ` (${quote.discountPercentage}%)`}
                    </span>
                    <span className="text-sm font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pb-3 border-b border-brand-gray-200">
                  <span className="text-sm text-brand-gray-600">
                    Tax
                    {parseFloat(quote.taxRate as any) > 0 && ` (${quote.taxRate}%)`}
                  </span>
                  <span className="text-sm font-medium text-brand-gray-900">{formatCurrency(taxAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-3">
                  <span className="text-lg font-semibold text-brand-gray-900">Total</span>
                  <span className="text-2xl font-bold text-brand-cyan-600">{formatCurrency(grandTotal)}</span>
                </div>

                {quote.depositAmount && parseFloat(quote.depositAmount as any) > 0 && (
                  <div className="mt-4 p-3 bg-brand-cyan-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-brand-gray-700">Deposit Required</span>
                      <span className="text-sm font-bold text-brand-cyan-700">{formatCurrency(parseFloat(quote.depositAmount as any))}</span>
                    </div>
                  </div>
                )}

                {quote.paymentTerms && (
                  <div className="mt-4 pt-4 border-t border-brand-gray-200">
                    <label className="text-xs font-medium text-brand-gray-500 block mb-1">Payment Terms</label>
                    <p className="text-sm text-brand-gray-900">{quote.paymentTerms}</p>
                  </div>
                )}
              </div>
              </div>

              {quote.signature && (
                <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-brand-gray-900 mb-3">Customer Signature</h2>
                  <div className="border border-brand-gray-200 rounded-md p-3 bg-brand-gray-50">
                    <img src={quote.signature} alt="Customer signature" className="w-full h-24 object-contain" />
                  </div>
                  {quote.acceptedAt && (
                    <p className="mt-2 text-xs text-brand-gray-500">Signed on {formatDate(quote.acceptedAt)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AssociationModal
        isOpen={showAssociationModal}
        onClose={() => {
          setShowAssociationModal(false);
          setPendingConversion(null);
        }}
        defaultName={clientName}
        onCreated={handleAssociationsCreated}
      />
    </div>
  );
};

export default QuoteDetail;
