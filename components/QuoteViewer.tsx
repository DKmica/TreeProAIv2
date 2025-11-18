import React from 'react';
import { Quote } from '../types';
import { X, FileText, Calendar, DollarSign, CheckCircle2, XCircle, Clock, FileSignature } from 'lucide-react';

interface QuoteViewerProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
}

export const QuoteViewer: React.FC<QuoteViewerProps> = ({ isOpen, onClose, quote }) => {
  if (!isOpen || !quote) return null;

  // Use totals from quote object if available, otherwise calculate from line items
  const subtotal = quote.totalAmount || quote.lineItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + item.price, 0) + (quote.stumpGrindingPrice || 0);
  
  const discount = quote.discountAmount || 0;
  const tax = quote.taxAmount || 0;
  const total = quote.grandTotal || (subtotal - discount + tax);

  const statusColors = {
    Draft: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    Sent: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    Accepted: 'bg-green-500/20 text-green-300 border-green-500/50',
    Declined: 'bg-red-500/20 text-red-300 border-red-500/50',
    Converted: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  };

  const statusIcons = {
    Draft: Clock,
    Sent: FileText,
    Accepted: CheckCircle2,
    Declined: XCircle,
    Converted: CheckCircle2,
  };

  const StatusIcon = statusIcons[quote.status];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-brand-navy-900 to-brand-navy-800 rounded-xl border border-brand-cyan-500/30 shadow-2xl w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-brand-navy-900 to-brand-navy-800 border-b border-brand-cyan-500/30 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-cyan-500/20 rounded-lg">
              <FileText className="h-6 w-6 text-brand-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Quote Details</h2>
              <p className="text-sm text-brand-gray-400">#{quote.quoteNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand-cyan-500/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-brand-gray-400" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-brand-gray-400 mb-1 block">Customer Name</label>
                <p className="text-white font-medium">{quote.customerName}</p>
              </div>

              {quote.jobLocation && (
                <div>
                  <label className="text-sm text-brand-gray-400 mb-1 block">Job Location</label>
                  <p className="text-white">{quote.jobLocation}</p>
                </div>
              )}

              <div>
                <label className="text-sm text-brand-gray-400 mb-1 block">Status</label>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${statusColors[quote.status]}`}>
                  <StatusIcon className="h-4 w-4" />
                  {quote.status}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-brand-gray-400 mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created Date
                </label>
                <p className="text-white">{new Date(quote.createdAt).toLocaleDateString()}</p>
              </div>

              {quote.validUntil && (
                <div>
                  <label className="text-sm text-brand-gray-400 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Valid Until
                  </label>
                  <p className="text-white">{new Date(quote.validUntil).toLocaleDateString()}</p>
                </div>
              )}

              {quote.acceptedAt && (
                <div>
                  <label className="text-sm text-brand-gray-400 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Accepted Date
                  </label>
                  <p className="text-white">{new Date(quote.acceptedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-brand-cyan-500/20 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-cyan-400" />
              Line Items
            </h3>
            <div className="bg-brand-navy-800/50 rounded-lg border border-brand-cyan-500/20 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-brand-navy-900/50 border-b border-brand-cyan-500/20">
                    <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray-300">Description</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-brand-gray-300">Price</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-brand-gray-300">Selected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-cyan-500/10">
                  {quote.lineItems.map((item, idx) => (
                    <tr key={idx} className={!item.selected ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 text-white">{item.description}</td>
                      <td className="px-4 py-3 text-right text-brand-cyan-400 font-medium">
                        ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.selected ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-brand-gray-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                  {quote.stumpGrindingPrice && quote.stumpGrindingPrice > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-white">Stump Grinding</td>
                      <td className="px-4 py-3 text-right text-brand-cyan-400 font-medium">
                        ${quote.stumpGrindingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto" />
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-navy-900/50 border-t border-brand-cyan-500/20">
                    <td className="px-4 py-3 text-white text-right" colSpan={2}>
                      Subtotal:
                    </td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {discount > 0 && (
                    <tr className="bg-brand-navy-900/50">
                      <td className="px-4 py-3 text-white text-right" colSpan={2}>
                        Discount {quote.discountPercentage > 0 && `(${quote.discountPercentage}%)`}:
                      </td>
                      <td className="px-4 py-3 text-right text-red-400 font-medium">
                        -${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {tax > 0 && (
                    <tr className="bg-brand-navy-900/50">
                      <td className="px-4 py-3 text-white text-right" colSpan={2}>
                        Tax {quote.taxRate > 0 && `(${quote.taxRate}%)`}:
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        ${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-brand-navy-900/70 border-t-2 border-brand-cyan-500/30">
                    <td className="px-4 py-4 text-white font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-brand-cyan-400" />
                      Grand Total
                    </td>
                    <td></td>
                    <td className="px-4 py-4 text-right text-brand-cyan-400 font-bold text-lg">
                      ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {quote.depositAmount && quote.depositAmount > 0 && (
            <div className="bg-brand-cyan-500/10 border border-brand-cyan-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-brand-gray-300">Deposit Required</span>
                <span className="text-brand-cyan-400 font-semibold text-lg">
                  ${quote.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {quote.paymentTerms && (
            <div>
              <label className="text-sm text-brand-gray-400 mb-2 block">Payment Terms</label>
              <div className="bg-brand-navy-800/50 rounded-lg border border-brand-cyan-500/20 p-4">
                <p className="text-white whitespace-pre-wrap">{quote.paymentTerms}</p>
              </div>
            </div>
          )}

          {quote.specialInstructions && (
            <div>
              <label className="text-sm text-brand-gray-400 mb-2 block">Special Instructions</label>
              <div className="bg-brand-navy-800/50 rounded-lg border border-brand-cyan-500/20 p-4">
                <p className="text-white whitespace-pre-wrap">{quote.specialInstructions}</p>
              </div>
            </div>
          )}

          {quote.signature && (
            <div>
              <label className="text-sm text-brand-gray-400 mb-2 flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Customer Signature
              </label>
              <div className="bg-white rounded-lg border border-brand-cyan-500/20 p-4">
                <img src={quote.signature} alt="Customer signature" className="max-h-32" />
              </div>
              {quote.acceptedAt && (
                <p className="text-sm text-brand-gray-400 mt-2">
                  Signed on {new Date(quote.acceptedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-r from-brand-navy-900 to-brand-navy-800 border-t border-brand-cyan-500/30 px-4 sm:px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2.5 bg-brand-cyan-500/20 hover:bg-brand-cyan-500/30 text-brand-cyan-400 rounded-lg font-medium transition-colors border border-brand-cyan-500/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
