
import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import QuickBooksIcon from '../components/icons/QuickBooksIcon';
import StripeIcon from '../components/icons/StripeIcon';
import { syncInvoiceToQuickBooks } from '../services/quickbooksService';
import { createStripePaymentLink } from '../services/stripeService';
import ClipboardSignatureIcon from '../components/icons/ClipboardSignatureIcon';

interface InvoicesProps {
  invoices: Invoice[];
  quotes: any[]; // Kept quotes prop for potential future use, but not used in this version
}

const Invoices: React.FC<InvoicesProps> = ({ invoices }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStates, setLoadingStates] = useState<{[key: string]: {qb?: boolean, stripe?: boolean}}>({});
  const [linkCopied, setLinkCopied] = useState('');

  const handleCopyLink = (invoiceId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/portal/invoice/${invoiceId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(invoiceId);
    setTimeout(() => setLinkCopied(''), 2000);
  };

  const handleSyncQB = async (invoice: Invoice) => {
    setLoadingStates(prev => ({ ...prev, [invoice.id]: { ...prev[invoice.id], qb: true } }));
    try {
      const result = await syncInvoiceToQuickBooks(invoice);
      alert(`Successfully synced invoice ${invoice.id}. QuickBooks ID: ${result.qbInvoiceId}`);
    } catch (error: any) {
      alert(`Failed to sync invoice: ${error.message}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [invoice.id]: { ...prev[invoice.id], qb: false } }));
    }
  };

  const handlePayStripe = async (invoice: Invoice) => {
    setLoadingStates(prev => ({ ...prev, [invoice.id]: { ...prev[invoice.id], stripe: true } }));
     try {
      const result = await createStripePaymentLink(invoice);
      // In a real app, you would redirect to result.url
      alert(`Stripe payment link created (simulation): ${result.url}`);
    } catch (error: any) {
      alert(`Failed to create payment link: ${error.message}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [invoice.id]: { ...prev[invoice.id], stripe: false } }));
    }
  };

  const filteredInvoices = useMemo(() => invoices.filter(invoice =>
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.amount.toString().includes(searchTerm) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.dueDate.toLowerCase().includes(searchTerm.toLowerCase())
  ), [invoices, searchTerm]);

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
        case 'Paid': return 'bg-green-100 text-green-800';
        case 'Sent': return 'bg-blue-100 text-blue-800';
        case 'Overdue': return 'bg-red-100 text-red-800';
        default: return 'bg-yellow-100 text-yellow-800'; // Draft
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-gray-900">Invoices</h1>
          <p className="mt-2 text-sm text-brand-gray-700">A list of all invoices.</p>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
          aria-label="Search invoices"
        />
      </div>

      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-brand-gray-300">
                <thead className="bg-brand-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Invoice ID</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Customer</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Amount</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Due Date</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200 bg-white">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{invoice.id}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{invoice.customerName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">${invoice.amount.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{invoice.dueDate}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                        <div className="inline-flex rounded-md shadow-sm">
                            <a href={`#/portal/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center rounded-l-md bg-white px-2 py-1.5 text-sm font-semibold text-brand-gray-900 ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 focus:z-10">
                                Link
                            </a>
                            <button onClick={() => handleCopyLink(invoice.id)} type="button" className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2 py-1.5 text-sm font-semibold text-brand-gray-900 ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 focus:z-10" title="Copy public link">
                                <ClipboardSignatureIcon className="h-4 w-4 text-brand-gray-600" />
                                {linkCopied === invoice.id && <span className="absolute -top-7 -right-1 text-xs bg-brand-gray-800 text-white px-2 py-0.5 rounded">Copied!</span>}
                            </button>
                        </div>
                        <button onClick={() => handleSyncQB(invoice)} disabled={loadingStates[invoice.id]?.qb} className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 disabled:cursor-not-allowed disabled:opacity-50" title="Sync to QuickBooks">
                          {loadingStates[invoice.id]?.qb ? <SpinnerIcon className="h-4 w-4" /> : <QuickBooksIcon className="h-4 w-4" />}
                          QB
                        </button>
                        <button onClick={() => handlePayStripe(invoice)} disabled={loadingStates[invoice.id]?.stripe} className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 disabled:cursor-not-allowed disabled:opacity-50" title="Pay with Stripe">
                           {loadingStates[invoice.id]?.stripe ? <SpinnerIcon className="h-4 w-4" /> : <StripeIcon className="h-4 w-4" />}
                           Pay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
