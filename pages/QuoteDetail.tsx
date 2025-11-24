import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quote, Client } from '../types';
import { quoteService, clientService, jobService, invoiceService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import QuoteIcon from '../components/icons/QuoteIcon';
import AssociationModal from '../components/AssociationModal';
import StatusBadge from '../components/StatusBadge';

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [pendingConversion, setPendingConversion] = useState<'job' | 'invoice' | null>(null);
  const [linkageMessages, setLinkageMessages] = useState<string[]>([]);

  useEffect(() => {
    const fetchQuoteData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const quoteData = await quoteService.getById(id);
        setQuote(quoteData);
        
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
      const newJob = await jobService.create({
        quoteId: quoteToConvert.id,
        clientId: quoteToConvert.clientId,
        propertyId: quoteToConvert.propertyId,
        customerName: clientName,
        status: 'Unscheduled',
        assignedCrew: [],
        jobNumber: quoteToConvert.quoteNumber ? `JOB-${quoteToConvert.quoteNumber}` : undefined,
        jobLocation: propertyAddress,
      });
      setLinkageMessages([`Created job ${newJob.jobNumber || newJob.id} from this quote.`]);
    } catch (err: any) {
      alert(err.message || 'Failed to convert quote to job');
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
      const lineItems = quoteToConvert.lineItems?.map(item => ({
        description: item.description,
        price: item.price,
        selected: true,
      })) || [];

      const invoice = await invoiceService.create({
        clientId: quoteToConvert.clientId,
        propertyId: quoteToConvert.propertyId,
        customerName: clientName,
        jobId: undefined,
        status: 'Draft',
        lineItems,
        subtotal: subtotal,
        discountAmount: quoteToConvert.discountAmount || 0,
        discountPercentage: quoteToConvert.discountPercentage || 0,
        taxRate: quoteToConvert.taxRate || 0,
        taxAmount: quoteToConvert.taxAmount || 0,
        totalAmount: grandTotal,
        grandTotal: grandTotal,
        amountPaid: 0,
        amountDue: grandTotal,
        invoiceNumber: quoteToConvert.quoteNumber ? `INV-${quoteToConvert.quoteNumber}` : '',
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        paymentTerms: quoteToConvert.paymentTerms,
      });
      setLinkageMessages([`Created draft invoice ${invoice.invoiceNumber || invoice.id} from this quote.`]);
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
        quote.property?.zip,
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

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border border-brand-gray-200 p-6 sticky top-4">
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
              <div className="mt-6 bg-white rounded-lg shadow border border-brand-gray-200 p-6">
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
