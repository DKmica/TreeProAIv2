import React, { useState, useEffect } from 'react';
import { Invoice, PaymentRecord } from '../types';
import { invoiceService } from '../services/apiService';
import XIcon from './icons/XIcon';
import DollarIcon from './icons/DollarIcon';

interface PaymentRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: (invoice: Invoice, payment?: PaymentRecord) => void;
  invoice: Invoice;
  defaultAmount?: number;
}

interface FormData {
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Check' | 'Credit Card' | 'Debit Card' | 'ACH' | 'Wire Transfer' | 'Other';
  referenceNumber: string;
  notes: string;
}

interface FormErrors {
  amount?: string;
  paymentDate?: string;
}

const PaymentRecorder: React.FC<PaymentRecorderProps> = ({ isOpen, onClose, onPaymentRecorded, invoice, defaultAmount }) => {
  const [formData, setFormData] = useState<FormData>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    referenceNumber: '',
    notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoice) {
      const remainingAmount = invoice.amountDue ?? invoice.grandTotal ?? invoice.totalAmount ?? 0;
      const presetAmount = defaultAmount ?? remainingAmount;
      setFormData({
        amount: presetAmount > 0 ? presetAmount : 0,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        referenceNumber: '',
        notes: '',
      });
      setErrors({});
      setApiError(null);
    }
  }, [defaultAmount, invoice, isOpen]);

  const getAmountDue = (): number => {
    return invoice.amountDue ?? invoice.grandTotal ?? invoice.totalAmount ?? 0;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const amountDue = getAmountDue();

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Payment amount must be greater than zero';
    } else if (formData.amount > amountDue + 0.01) {
      newErrors.amount = `Payment amount cannot exceed amount due ($${amountDue.toFixed(2)})`;
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const paymentData = {
        amount: formData.amount,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
      };

      const response = await invoiceService.recordPayment(invoice.id, paymentData);

      onPaymentRecorded({ ...response.invoice, payments: [response.payment, ...(invoice.payments || [])] }, response.payment);
      onClose();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setApiError(err.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isFormValid = () => {
    const amountDue = getAmountDue();
    return (
      formData.amount > 0 &&
      formData.amount <= amountDue + 0.01 &&
      formData.paymentDate !== ''
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-600 p-2 rounded-lg">
              <DollarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Record Payment</h2>
              <p className="text-sm text-gray-400">Invoice #{invoice.invoiceNumber || invoice.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-4 sm:px-6 py-4 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Invoice Total:</span>
                <span className="text-white font-medium">${(invoice.grandTotal ?? invoice.totalAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount Paid:</span>
                <span className="text-green-400 font-medium">${(invoice.amountPaid ?? 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-600 pt-2 flex justify-between">
                <span className="text-white font-bold">Amount Due:</span>
                <span className="text-cyan-400 font-bold text-lg">${getAmountDue().toFixed(2)}</span>
              </div>
            </div>

            {invoice.payments && invoice.payments.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Payment history</h3>
                  <span className="text-xs text-gray-400">{invoice.payments.length} record{invoice.payments.length === 1 ? '' : 's'}</span>
                </div>
                <div className="divide-y divide-gray-800 max-h-40 overflow-y-auto pr-1">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="py-2 text-sm flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-white">${(payment.amount ?? 0).toFixed(2)}</p>
                        <p className="text-gray-400 text-xs">{payment.paymentMethod} • {new Date(payment.paymentDate).toLocaleDateString()}</p>
                        {payment.referenceNumber && <p className="text-gray-500 text-xs">Ref: {payment.referenceNumber}</p>}
                      </div>
                      <span className="text-gray-400 text-xs text-right whitespace-nowrap">Recorded {new Date(payment.createdAt || payment.paymentDate).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">
                Payment Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-lg">$</span>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max={getAmountDue()}
                  className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-lg placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-400">{errors.amount}</p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount: getAmountDue() }))}
                  className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                >
                  Full Amount
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount: getAmountDue() / 2 }))}
                  className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                >
                  50%
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-300 mb-1">
                Payment Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                id="paymentDate"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {errors.paymentDate && (
                <p className="mt-1 text-sm text-red-400">{errors.paymentDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-300 mb-1">
                Payment Method <span className="text-red-400">*</span>
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="ACH">ACH / Bank Transfer</option>
                <option value="Wire Transfer">Wire Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-300 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                id="referenceNumber"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Check #, Transaction ID, etc."
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                placeholder="Additional notes about this payment..."
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Recording...
              </>
            ) : (
              <>
                <DollarIcon className="h-4 w-4 mr-2" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecorder;
