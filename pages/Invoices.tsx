import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, PaymentRecord, Quote } from '../types';
import { invoiceService, jobService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import DollarIcon from '../components/icons/DollarIcon';
import InvoiceEditor from '../components/InvoiceEditor';
import PaymentRecorder from '../components/PaymentRecorder';
import InvoiceTemplate from '../components/InvoiceTemplate';
import StatusBadge from '../components/StatusBadge';
import { Download, Mail } from 'lucide-react';

type StatusFilter = 'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void';

interface InvoicesProps {
  invoices?: Invoice[];
  quotes?: Quote[];
}

const Invoices: React.FC<InvoicesProps> = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPaymentRecorderOpen, setIsPaymentRecorderOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [paymentPreset, setPaymentPreset] = useState<number | undefined>();
  const [isGeneratingLink, setIsGeneratingLink] = useState<string | null>(null);
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalInvoice, setEmailModalInvoice] = useState<Invoice | undefined>();
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingPdf, setIsSendingPdf] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getAll();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const calculateStatus = (invoice: Invoice): Invoice['status'] => {
    if (invoice.status === 'Void' || invoice.status === 'Paid') {
      return invoice.status;
    }
    
    if (invoice.amountDue <= 0) {
      return 'Paid';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (invoice.status === 'Sent' && dueDate < today) {
      return 'Overdue';
    }
    
    return invoice.status;
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(invoice => {
        const calculatedStatus = calculateStatus(invoice);
        return calculatedStatus === statusFilter;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        (invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.grandTotal.toString().includes(searchTerm)
      );
    }

    return filtered.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [invoices, statusFilter, searchTerm]);

  const getAgingColor = (bucket: string) => {
    switch (bucket) {
      case 'Current':
        return 'bg-emerald-100 text-emerald-800';
      case '1-30':
        return 'bg-amber-100 text-amber-800';
      case '31-60':
        return 'bg-orange-100 text-orange-800';
      case '61-90':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-rose-100 text-rose-800';
    }
  };

  const getStatusCounts = () => {
    return {
      All: invoices.length,
      Draft: invoices.filter(inv => calculateStatus(inv) === 'Draft').length,
      Sent: invoices.filter(inv => calculateStatus(inv) === 'Sent').length,
      Paid: invoices.filter(inv => calculateStatus(inv) === 'Paid').length,
      Overdue: invoices.filter(inv => calculateStatus(inv) === 'Overdue').length,
      Void: invoices.filter(inv => inv.status === 'Void').length,
    };
  };

  const statusCounts = getStatusCounts();

  const handleCreateInvoice = () => {
    setSelectedInvoice(undefined);
    setIsEditorOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditorOpen(true);
  };

  const handleRecordPayment = (invoice: Invoice, presetAmount?: number) => {
    setSelectedInvoice(invoice);
    setPaymentPreset(presetAmount);
    setIsPaymentRecorderOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsTemplateOpen(true);
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    if (invoice.status !== 'Draft') {
      alert('Only draft invoices can be sent');
      return;
    }

    if (window.confirm(`Mark invoice ${invoice.invoiceNumber || invoice.id} as sent?`)) {
      try {
        const updated = await invoiceService.update(invoice.id, {
          status: 'Sent',
          sentDate: new Date().toISOString(),
        });
        setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
        alert('Invoice marked as sent');
      } catch (error: any) {
        console.error('Error updating invoice:', error);
        alert('Failed to update invoice: ' + error.message);
      }
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber || invoice.id}? This action cannot be undone.`)) {
      try {
        await invoiceService.remove(invoice.id);
        setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        alert('Invoice deleted successfully');
      } catch (error: any) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice: ' + error.message);
      }
    }
  };

  const handleVoidInvoice = async (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to void invoice ${invoice.invoiceNumber || invoice.id}?`)) {
      try {
        const updated = await invoiceService.update(invoice.id, { status: 'Void' });
        setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
        alert('Invoice voided');
      } catch (error: any) {
        console.error('Error voiding invoice:', error);
        alert('Failed to void invoice: ' + error.message);
      }
    }
  };

  const handleCreateJobFromInvoice = async (invoice: Invoice) => {
    if (!invoice.clientId || !invoice.propertyId) {
      alert('Client and property are required before creating a job.');
      return;
    }

    try {
      const newJob = await jobService.create({
        clientId: invoice.clientId,
        propertyId: invoice.propertyId,
        customerName: invoice.customerName,
        quoteId: undefined,
        status: 'Unscheduled',
        assignedCrew: [],
        jobNumber: invoice.invoiceNumber ? `JOB-${invoice.invoiceNumber}` : undefined,
      });
      alert(`Job ${newJob.jobNumber || newJob.id} created from invoice.`);
    } catch (error: any) {
      alert(error.message || 'Failed to create job from invoice');
    }
  };

  const handleInvoiceSaved = (savedInvoice: Invoice) => {
    setInvoices(prev => {
      const existing = prev.find(inv => inv.id === savedInvoice.id);
      if (existing) {
        return prev.map(inv => inv.id === savedInvoice.id ? savedInvoice : inv);
      } else {
        return [savedInvoice, ...prev];
      }
    });
  };

  const handlePaymentRecorded = (updatedInvoice: Invoice, payment?: PaymentRecord) => {
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? {
      ...updatedInvoice,
      payments: payment ? [payment, ...(inv.payments || [])] : updatedInvoice.payments || inv.payments,
    } : inv));
    setSelectedInvoice(prev => prev && prev.id === updatedInvoice.id ? {
      ...updatedInvoice,
      payments: payment ? [payment, ...(prev.payments || [])] : updatedInvoice.payments || prev.payments,
    } : prev);
  };

  const getAgingBucket = (invoice: Invoice) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    if (Number.isNaN(dueDate.getTime())) return 'Current';

    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Current';
    if (diffDays <= 30) return '1-30';
    if (diffDays <= 60) return '31-60';
    if (diffDays <= 90) return '61-90';
    return '90+';
  };

  const agingSummary = useMemo(() => {
    const summary = {
      totalOutstanding: 0,
      buckets: {
        Current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      } as Record<string, number>,
    };

    invoices.forEach((invoice) => {
      const due = Math.max(invoice.amountDue, 0);
      summary.totalOutstanding += due;
      const bucket = getAgingBucket(invoice);
      summary.buckets[bucket] = (summary.buckets[bucket] || 0) + due;
    });

    return summary;
  }, [invoices]);

  const handleGeneratePaymentLink = async (invoice: Invoice) => {
    try {
      setIsGeneratingLink(invoice.id);
      const response = await invoiceService.generatePaymentLink(invoice.id);
      if (!response.paymentLink) {
        throw new Error('No payment link returned');
      }
      await navigator.clipboard.writeText(response.paymentLink);
      alert('Payment link copied to clipboard');
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      alert(error.message || 'Failed to generate payment link');
    } finally {
      setIsGeneratingLink(null);
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      setIsDownloadingPdf(invoice.id);
      await invoiceService.downloadPdf(invoice.id);
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      alert(error.message || 'Failed to download PDF');
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const handleSendPdf = (invoice: Invoice) => {
    setEmailModalInvoice(invoice);
    setEmailRecipient(invoice.customerEmail || '');
    setEmailSubject(`Invoice ${invoice.invoiceNumber || invoice.id}`);
    setEmailMessage('');
    setShowEmailModal(true);
  };

  const handleSendPdfSubmit = async () => {
    if (!emailModalInvoice || !emailRecipient) {
      alert('Please enter a recipient email address');
      return;
    }
    
    try {
      setIsSendingPdf(true);
      await invoiceService.sendPdf(
        emailModalInvoice.id,
        emailRecipient,
        emailSubject || undefined,
        emailMessage || undefined
      );
      alert('Invoice PDF sent successfully');
      setShowEmailModal(false);
      setEmailModalInvoice(undefined);
      setEmailRecipient('');
      setEmailSubject('');
      setEmailMessage('');
    } catch (error: any) {
      console.error('Error sending PDF:', error);
      alert(error.message || 'Failed to send PDF');
    } finally {
      setIsSendingPdf(false);
    }
  };

  const handleCloseEmailModal = () => {
    setShowEmailModal(false);
    setEmailModalInvoice(undefined);
    setEmailRecipient('');
    setEmailSubject('');
    setEmailMessage('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-8 w-8 text-brand-green-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-gray-900">Invoices</h1>
          <p className="mt-2 text-sm text-brand-gray-700">
            Manage invoices, record payments, and track outstanding balances
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleCreateInvoice}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green-600 text-white rounded-md hover:bg-brand-green-700 transition-colors shadow-sm"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Create Invoice
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total outstanding</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${agingSummary.totalOutstanding.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Across {invoices.length} invoices</p>
        </div>
        {(['Current', '1-30', '31-60', '61-90', '90+'] as const).map((bucket) => (
          <div key={bucket} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{bucket} days</p>
              <p className="text-xl font-semibold text-gray-900">${agingSummary.buckets[bucket].toFixed(2)}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAgingColor(bucket)}`}>
              {bucket}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
            {(['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Void'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${statusFilter === status
                    ? 'border-brand-green-500 text-brand-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {status}
                <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${
                  statusFilter === status ? 'bg-brand-green-100 text-brand-green-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search by invoice number, customer, or amount..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full max-w-md rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
          aria-label="Search invoices"
        />
      </div>

      {/* Desktop Table View */}
      <div className="mt-4 hidden lg:flex lg:flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-brand-gray-300">
                <thead className="bg-brand-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">
                      Invoice #
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">
                      Total
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">
                      Amount Due
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">
                      Due Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">
                      Aging
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                        {searchTerm || statusFilter !== 'All' ? 'No invoices found matching your criteria' : 'No invoices yet. Create your first invoice to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const displayStatus = calculateStatus(invoice);
                      const agingBucket = getAgingBucket(invoice);
                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">
                            {invoice.invoiceNumber || invoice.id}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-700">
                            {invoice.customerName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-700">
                            ${invoice.grandTotal.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={invoice.amountDue > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                              ${invoice.amountDue.toFixed(2)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <StatusBadge status={displayStatus} size="xs" />
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-700">
                            {formatDate(invoice.dueDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getAgingColor(agingBucket)}`}>
                              {agingBucket}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewInvoice(invoice)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                                title="View Invoice"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                View
                              </button>
                              
                              <button
                                onClick={() => handleEditInvoice(invoice)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                                title="Edit Invoice"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => handleDownloadPdf(invoice)}
                                disabled={isDownloadingPdf === invoice.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-60"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                                {isDownloadingPdf === invoice.id ? 'Downloading...' : 'PDF'}
                              </button>

                              <button
                                onClick={() => handleSendPdf(invoice)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                                title="Send PDF via Email"
                              >
                                <Mail className="h-4 w-4" />
                                Email
                              </button>

                              {displayStatus !== 'Paid' && displayStatus !== 'Void' && (
                                <button
                                  onClick={() => handleRecordPayment(invoice)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                  title="Record Payment"
                                >
                                  <DollarIcon className="h-4 w-4" />
                                  Pay
                                </button>
                              )}

                              {displayStatus !== 'Paid' && displayStatus !== 'Void' && invoice.amountDue > 0 && (
                                <button
                                  onClick={() => handleRecordPayment(invoice, Math.max(invoice.amountDue / 2, 0.01))}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                                  title="Record partial payment"
                                >
                                  Partial
                                </button>
                              )}

                              {invoice.status === 'Draft' && (
                                <button
                                  onClick={() => handleSendInvoice(invoice)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  title="Send Invoice"
                                >
                                  Send
                                </button>
                              )}

                              {invoice.status !== 'Void' && (
                                <button
                                  onClick={() => handleVoidInvoice(invoice)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                  title="Void Invoice"
                                >
                                  Void
                                </button>
                              )}

                              {!invoice.jobId && (
                                <button
                                  onClick={() => handleCreateJobFromInvoice(invoice)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-brand-cyan-600 text-white rounded hover:bg-brand-cyan-700 transition-colors"
                                  title="Create job from invoice"
                                >
                                  Create Job
                                </button>
                              )}

                              <button
                                onClick={() => handleGeneratePaymentLink(invoice)}
                                disabled={isGeneratingLink === invoice.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-60"
                                title="Copy payment link"
                              >
                                {isGeneratingLink === invoice.id ? 'Copying…' : 'Pay Link'}
                              </button>

                              <button
                                onClick={() => handleDeleteInvoice(invoice)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                title="Delete Invoice"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="mt-4 lg:hidden space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-500">
              {searchTerm || statusFilter !== 'All' ? 'No invoices found matching your criteria' : 'No invoices yet. Create your first invoice to get started.'}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const displayStatus = calculateStatus(invoice);
            const agingBucket = getAgingBucket(invoice);
            return (
              <div key={invoice.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-brand-gray-900">
                      {invoice.invoiceNumber || invoice.id}
                    </h3>
                    <p className="text-sm text-brand-gray-600 mt-1">{invoice.customerName}</p>
                  </div>
                  <StatusBadge status={displayStatus} size="xs" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-brand-gray-600">Total:</span>
                    <p className="font-semibold text-brand-gray-900">${invoice.grandTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-brand-gray-600">Amount Due:</span>
                    <p className={`font-semibold ${invoice.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${invoice.amountDue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-brand-gray-600">Aging:</span>
                    <p className={`font-semibold`}>
                      <span className={`px-2 py-1 rounded-full text-xs ${getAgingColor(agingBucket)}`}>{agingBucket}</span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-brand-gray-600">Due Date:</span>
                    <p className="font-medium text-brand-gray-900">{formatDate(invoice.dueDate)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-gray-100">
                  <button
                    onClick={() => handleViewInvoice(invoice)}
                    className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEditInvoice(invoice)}
                    className="flex-1 min-w-[100px] px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(invoice)}
                    disabled={isDownloadingPdf === invoice.id}
                    className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {isDownloadingPdf === invoice.id ? 'Downloading...' : 'PDF'}
                  </button>
                  <button
                    onClick={() => handleSendPdf(invoice)}
                    className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {displayStatus !== 'Paid' && displayStatus !== 'Void' && (
                    <button
                      onClick={() => handleRecordPayment(invoice)}
                      className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                    >
                      <DollarIcon className="h-4 w-4" />
                      Pay
                    </button>
                  )}
                  {displayStatus !== 'Paid' && displayStatus !== 'Void' && invoice.amountDue > 0 && (
                    <button
                      onClick={() => handleRecordPayment(invoice, Math.max(invoice.amountDue / 2, 0.01))}
                      className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium"
                    >
                      Partial
                    </button>
                  )}
                  {invoice.status === 'Draft' && (
                    <button
                      onClick={() => handleSendInvoice(invoice)}
                      className="flex-1 min-w-[100px] px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                    >
                      Send
                    </button>
                  )}
                  {invoice.status !== 'Void' && (
                    <button
                      onClick={() => handleVoidInvoice(invoice)}
                      className="flex-1 min-w-[100px] px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
                    >
                      Void
                    </button>
                  )}
                  {!invoice.jobId && (
                    <button
                      onClick={() => handleCreateJobFromInvoice(invoice)}
                      className="flex-1 min-w-[100px] px-3 py-2 bg-brand-cyan-600 text-white rounded hover:bg-brand-cyan-700 text-sm font-medium"
                    >
                      Create Job
                    </button>
                  )}
                  <button
                    onClick={() => handleGeneratePaymentLink(invoice)}
                    disabled={isGeneratingLink === invoice.id}
                    className="flex-1 min-w-[100px] px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
                  >
                    {isGeneratingLink === invoice.id ? 'Copying…' : 'Pay Link'}
                  </button>
                  <button
                    onClick={() => handleDeleteInvoice(invoice)}
                    className="flex-1 min-w-[100px] px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <InvoiceEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleInvoiceSaved}
        invoice={selectedInvoice}
      />

      {selectedInvoice && (
        <>
          <PaymentRecorder
            isOpen={isPaymentRecorderOpen}
            onClose={() => { setIsPaymentRecorderOpen(false); setPaymentPreset(undefined); }}
            onPaymentRecorded={handlePaymentRecorded}
            invoice={selectedInvoice}
            defaultAmount={paymentPreset}
          />

          <InvoiceTemplate
            isOpen={isTemplateOpen}
            onClose={() => setIsTemplateOpen(false)}
            invoice={selectedInvoice}
          />
        </>
      )}

      {showEmailModal && emailModalInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseEmailModal}
            />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Send Invoice PDF
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Send invoice {emailModalInvoice.invoiceNumber || emailModalInvoice.id} to the recipient via email.
                  </p>
                </div>
              </div>
              
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="emailRecipient" className="block text-sm font-medium text-gray-700">
                    Recipient Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="emailRecipient"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="emailSubject" className="block text-sm font-medium text-gray-700">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    placeholder="Invoice from Your Company"
                  />
                </div>
                
                <div>
                  <label htmlFor="emailMessage" className="block text-sm font-medium text-gray-700">
                    Message (optional)
                  </label>
                  <textarea
                    id="emailMessage"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    placeholder="Please find attached the invoice for your recent service..."
                  />
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleSendPdfSubmit}
                  disabled={isSendingPdf || !emailRecipient}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm"
                >
                  {isSendingPdf ? (
                    <>
                      <SpinnerIcon className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseEmailModal}
                  disabled={isSendingPdf}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:opacity-50 sm:col-start-1 sm:mt-0 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
