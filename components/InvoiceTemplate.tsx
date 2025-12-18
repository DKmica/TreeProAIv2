import React from 'react';
import { Invoice } from '../types';
import XIcon from './icons/XIcon';

interface InvoiceTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ isOpen, onClose, invoice }) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden print:max-h-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-300 print:hidden">
          <h2 className="text-xl font-bold text-gray-900">Invoice Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 transition-colors p-1"
              type="button"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] print:max-h-none print:overflow-visible">
          <div className="p-8 print:p-12">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-green-700 mb-2">TreePro AI</h1>
                <p className="text-sm text-gray-600">Professional Tree Services</p>
                <p className="text-sm text-gray-600">123 Forest Lane</p>
                <p className="text-sm text-gray-600">Green City, ST 12345</p>
                <p className="text-sm text-gray-600">Phone: (555) 123-4567</p>
                <p className="text-sm text-gray-600">Email: info@treeproai.com</p>
              </div>

              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
                <div className="text-sm space-y-1">
                  <p><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber || invoice.id}</p>
                  <p><span className="font-semibold">Issue Date:</span> {formatDate(invoice.issueDate)}</p>
                  <p><span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate)}</p>
                  {invoice.sentDate && (
                    <p><span className="font-semibold">Sent Date:</span> {formatDate(invoice.sentDate)}</p>
                  )}
                  <p className="pt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                      invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                      invoice.status === 'Void' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8 pb-6 border-b border-gray-300">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</h3>
              <div className="text-sm text-gray-900">
                <p className="font-semibold text-lg">{invoice.customerName}</p>
                {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
                {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
                {invoice.customerAddress && (
                  <p className="whitespace-pre-line">{invoice.customerAddress}</p>
                )}
              </div>
            </div>

            {invoice.customerNotes && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-gray-700">{invoice.customerNotes}</p>
              </div>
            )}

            <table className="w-full mb-8">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.filter(item => item.selected).map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-4 text-gray-900">{item.description}</td>
                    <td className="py-3 px-4 text-right text-gray-900">${item.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-900 font-medium">${invoice.subtotal.toFixed(2)}</span>
                </div>
                
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-700">
                      Discount {invoice.discountPercentage > 0 ? `(${invoice.discountPercentage}%)` : ''}:
                    </span>
                    <span className="text-red-600">-${invoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-700">Tax ({invoice.taxRate}%):</span>
                    <span className="text-gray-900 font-medium">${invoice.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-3 border-t-2 border-gray-300 mt-2">
                  <span className="text-gray-900 font-bold text-lg">Total:</span>
                  <span className="text-gray-900 font-bold text-lg">${invoice.grandTotal.toFixed(2)}</span>
                </div>

                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-700">Amount Paid:</span>
                      <span className="text-green-600 font-medium">-${invoice.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t border-gray-300">
                      <span className="text-gray-900 font-bold">Amount Due:</span>
                      <span className="text-cyan-600 font-bold text-lg">${invoice.amountDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment History</h3>
                <table className="w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 border-b">Date</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 border-b">Method</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 border-b">Reference</th>
                      <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700 border-b">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2 px-3 text-sm text-gray-900">{formatDate(payment.paymentDate)}</td>
                        <td className="py-2 px-3 text-sm text-gray-900">{payment.paymentMethod}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{payment.referenceNumber || '-'}</td>
                        <td className="py-2 px-3 text-sm text-right text-green-600 font-medium">${payment.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-6 border-t border-gray-300">
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-semibold text-gray-900">Payment Terms: {invoice.paymentTerms}</p>
                {invoice.amountDue > 0 && (
                  <p className="text-red-600 font-medium">
                    Payment is due by {formatDate(invoice.dueDate)}
                  </p>
                )}
              </div>
              
              <div className="mt-6 text-xs text-gray-500 space-y-1">
                <p>Make checks payable to: TreePro AI</p>
                <p>Questions about this invoice? Contact us at (555) 123-4567 or info@treeproai.com</p>
                <p className="pt-2">Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:max-h-none,
          .print\\:max-h-none * {
            visibility: visible;
          }
          .print\\:max-h-none {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceTemplate;
