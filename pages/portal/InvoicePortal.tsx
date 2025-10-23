import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../../types';
import CheckBadgeIcon from '../../components/icons/CheckBadgeIcon';
import SpinnerIcon from '../../components/icons/SpinnerIcon';
import CreditCardIcon from '../../components/icons/CreditCardIcon';
import ShieldCheckIcon from '../../components/icons/ShieldCheckIcon';

interface InvoicePortalProps {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
}

const InvoicePortal: React.FC<InvoicePortalProps> = ({ invoices, setInvoices }) => {
  const { invoiceId } = useParams<{ invoiceId: string }>();

  const invoice = useMemo(() => invoices.find(i => i.id === invoiceId), [invoices, invoiceId]);
  
  const [isPaying, setIsPaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePay = () => {
    if (!invoice) return;
    setIsSaving(true);
    // Simulate network delay for payment processing
    setTimeout(() => {
      setInvoices(prevInvoices =>
        prevInvoices.map(i =>
          i.id === invoice.id
            ? {
                ...i,
                status: 'Paid',
                paidAt: new Date().toISOString(),
              }
            : i
        )
      );
      setIsSaving(false);
      setIsPaying(false);
    }, 2000);
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
            <h2 className="mt-4 text-2xl font-bold text-brand-gray-900">Payment Successful!</h2>
            <p className="mt-2 text-brand-gray-600">Thank you, {invoice.customerName}. Your payment for invoice {invoice.id} has been received.</p>
            <p className="mt-1 text-sm text-brand-gray-500">Paid on {new Date(invoice.paidAt!).toLocaleString()}</p>
        </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-brand-gray-50 border-b">
          <div className="sm:flex sm:justify-between sm:items-start">
              <div>
                <h1 className="text-2xl font-bold text-brand-gray-900">Invoice</h1>
                <p className="text-sm text-brand-gray-600 mt-1">For: {invoice.customerName}</p>
              </div>
              <div className="mt-4 sm:mt-0 text-left sm:text-right">
                <p className="text-sm font-semibold text-brand-gray-700">Invoice #{invoice.id}</p>
                <p className="mt-1 text-sm text-brand-gray-600">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
          </div>
        </div>
        
        <div className="p-6">
          <h2 className="text-lg font-semibold text-brand-gray-800">Summary</h2>
          <div className="mt-4 flow-root">
            <div className="-mx-6">
              <table className="min-w-full">
                <thead className="border-b border-brand-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-brand-gray-900">Service</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-brand-gray-900">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200">
                  {invoice.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-brand-gray-800">{item.description}</td>
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
            <p className="text-md font-semibold text-brand-gray-800">Total Due:</p>
            <p className="text-4xl font-bold text-brand-gray-900">${invoice.amount.toFixed(2)}</p>
          </div>
        </div>

        <div className="p-6 border-t text-center">
            <button onClick={() => setIsPaying(true)} className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2">
                <CreditCardIcon className="w-6 h-6 mr-3" />
                Pay with Card
            </button>
        </div>
      </div>

      {isPaying && (
         <div className="fixed inset-0 bg-brand-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative overflow-hidden">
              <div className="p-6 border-b text-center bg-brand-gray-50">
                <ShieldCheckIcon className="w-10 h-10 text-brand-green-600 mx-auto" />
                <h3 className="mt-3 text-lg font-semibold text-brand-gray-900">Secure Payment</h3>
                <p className="text-sm text-brand-gray-500">This is a simulated payment for demonstration.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="card-number" className="block text-sm font-medium text-brand-gray-700">Card Number</label>
                    <input type="text" id="card-number" disabled value="**** **** **** 4242" className="mt-1 block w-full rounded-md border-brand-gray-300 bg-brand-gray-100 shadow-sm sm:text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="expiry" className="block text-sm font-medium text-brand-gray-700">Expiry</label>
                        <input type="text" id="expiry" disabled value="12 / 25" className="mt-1 block w-full rounded-md border-brand-gray-300 bg-brand-gray-100 shadow-sm sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="cvc" className="block text-sm font-medium text-brand-gray-700">CVC</label>
                        <input type="text" id="cvc" disabled value="***" className="mt-1 block w-full rounded-md border-brand-gray-300 bg-brand-gray-100 shadow-sm sm:text-sm" />
                    </div>
                </div>
              </div>
              <div className="p-6 border-t bg-brand-gray-50">
                <button onClick={handlePay} disabled={isSaving} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-green-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-green-700 disabled:bg-brand-gray-400">
                    {isSaving && <SpinnerIcon className="w-5 h-5 mr-3" />}
                    {isSaving ? 'Processing...' : `Pay $${invoice.amount.toFixed(2)}`}
                </button>
                 <button onClick={() => setIsPaying(false)} disabled={isSaving} className="mt-3 w-full text-center text-sm font-semibold text-brand-gray-700 py-2 px-4 rounded-md hover:bg-brand-gray-100">Cancel</button>
              </div>
            </div>
         </div>
      )}
    </>
  );
};

export default InvoicePortal;