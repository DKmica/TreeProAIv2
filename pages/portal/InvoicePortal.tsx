import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../../types';
import CheckBadgeIcon from '../components/icons/CheckBadgeIcon';
import SpinnerIcon from '../components/icons/SpinnerIcon';

interface InvoicePortalProps {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
}

const InvoicePortal: React.FC<InvoicePortalProps> = ({ invoices, setInvoices }) => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoice = useMemo(() => invoices.find(inv => inv.id === invoiceId), [invoices, invoiceId]);

  const handlePayNow = async () => {
    if (!invoice) return;
    
    setError(null);
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Unable to process payment. Please try again or contact support.');
      setIsProcessing(false);
    }
  };

  if (!invoice) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold text-red-600">Invoice Not Found</h2>
        <p className="mt-2 text-brand-gray-600">The requested invoice is invalid or no longer available.</p>
      </div>
    );
  }

  if (invoice.status === 'Paid') {
    return (
      <div className="text-center p-8 sm:p-12 bg-white rounded-lg shadow-lg">
        <CheckBadgeIcon className="mx-auto h-16 w-16 text-brand-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-brand-gray-900">Payment Received</h2>
        <p className="mt-2 text-brand-gray-600">This invoice was paid on {new Date(invoice.paidAt!).toLocaleDateString()}.</p>
        <p className="mt-1 text-brand-gray-600">Thank you for your business!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 bg-brand-gray-50 border-b">
        <div className="sm:flex sm:justify-between sm:items-start">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">Invoice for {invoice.customerName}</h1>
            <p className="text-sm text-brand-gray-600 mt-1">Invoice #: {invoice.id}</p>
          </div>
          <div className="mt-4 sm:mt-0 text-left sm:text-right">
            <p className="text-sm font-semibold text-brand-gray-700">Due Date</p>
            <p className="mt-1 text-sm font-bold text-red-600">{new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h2 className="text-lg font-semibold text-brand-gray-800">Services Rendered</h2>
        <div className="mt-4 flow-root">
          <div className="-mx-6">
            <table className="min-w-full">
              <tbody className="divide-y divide-brand-gray-200">
                {invoice.lineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-brand-gray-800">
                      <p className="font-medium">{item.description}</p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-brand-gray-900">${item.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-6 bg-brand-gray-50 border-t">
        <div className="text-right space-y-2">
          <p className="text-md font-semibold text-brand-gray-800">Total Amount Due:</p>
          <p className="text-4xl font-bold text-brand-gray-900">${invoice.amount.toFixed(2)}</p>
        </div>
      </div>

      {invoice.status !== 'Paid' && (
        <div className="p-6 border-t text-center">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <button 
            onClick={handlePayNow}
            disabled={isProcessing}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <SpinnerIcon className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </button>
          <p className="mt-4 text-xs text-brand-gray-500">Secure payment processing powered by Stripe</p>
        </div>
      )}
    </div>
  );
};

export default InvoicePortal;