import React, { useState, useEffect } from 'react';
import { Invoice, LineItem } from '../types';
import { invoiceService } from '../services/apiService';
import XIcon from './icons/XIcon';
import LineItemBuilder from './LineItemBuilder';

interface InvoiceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  invoice?: Invoice;
  prefilledData?: {
    customerName?: string;
    jobId?: string;
    lineItems?: LineItem[];
  };
}

interface FormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  lineItems: LineItem[];
  discountType: 'amount' | 'percentage';
  discountAmount: number;
  discountPercentage: number;
  taxRate: number;
  notes: string;
  customerNotes: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void';
  jobId?: string;
}

interface FormErrors {
  customerName?: string;
  dueDate?: string;
  lineItems?: string;
}

const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ isOpen, onClose, onSave, invoice, prefilledData }) => {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTerms: 'Net 30',
    lineItems: [],
    discountType: 'percentage',
    discountAmount: 0,
    discountPercentage: 0,
    taxRate: 0,
    notes: '',
    customerNotes: '',
    status: 'Draft',
    jobId: undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setFormData({
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail || '',
        customerPhone: invoice.customerPhone || '',
        customerAddress: invoice.customerAddress || '',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paymentTerms: invoice.paymentTerms,
        lineItems: invoice.lineItems,
        discountType: invoice.discountPercentage > 0 ? 'percentage' : 'amount',
        discountAmount: invoice.discountAmount,
        discountPercentage: invoice.discountPercentage,
        taxRate: invoice.taxRate,
        notes: invoice.notes || '',
        customerNotes: invoice.customerNotes || '',
        status: invoice.status,
        jobId: invoice.jobId,
      });
    } else if (prefilledData) {
      setFormData(prev => ({
        ...prev,
        customerName: prefilledData.customerName || '',
        jobId: prefilledData.jobId,
        lineItems: prefilledData.lineItems || [],
      }));
    } else {
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: defaultDueDate.toISOString().split('T')[0],
        paymentTerms: 'Net 30',
        lineItems: [],
        discountType: 'percentage',
        discountAmount: 0,
        discountPercentage: 0,
        taxRate: 0,
        notes: '',
        customerNotes: '',
        status: 'Draft',
        jobId: undefined,
      });
    }
    setErrors({});
    setApiError(null);
  }, [invoice, prefilledData, isOpen]);

  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.selected ? item.price : 0), 0);
    
    let discountAmount = 0;
    if (formData.discountType === 'percentage') {
      discountAmount = (subtotal * formData.discountPercentage) / 100;
    } else {
      discountAmount = formData.discountAmount;
    }

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * formData.taxRate) / 100;
    const grandTotal = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      grandTotal,
    };
  };

  const totals = calculateTotals();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (formData.lineItems.length === 0) {
      newErrors.lineItems = 'At least one line item is required';
    } else if (!formData.lineItems.some(item => item.selected && item.description.trim())) {
      newErrors.lineItems = 'At least one line item must have a description';
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

  const handleLineItemsChange = (lineItems: LineItem[]) => {
    setFormData(prev => ({ ...prev, lineItems }));
    if (errors.lineItems) {
      setErrors(prev => ({ ...prev, lineItems: undefined }));
    }
  };

  const handleStatusChange = (newStatus: FormData['status']) => {
    setFormData(prev => ({ ...prev, status: newStatus }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const invoiceData: Partial<Invoice> = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || undefined,
        customerPhone: formData.customerPhone || undefined,
        customerAddress: formData.customerAddress || undefined,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
        lineItems: formData.lineItems,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        discountPercentage: formData.discountType === 'percentage' ? formData.discountPercentage : 0,
        taxRate: formData.taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.grandTotal,
        grandTotal: totals.grandTotal,
        amountPaid: invoice?.amountPaid || 0,
        amountDue: totals.grandTotal - (invoice?.amountPaid || 0),
        notes: formData.notes || undefined,
        customerNotes: formData.customerNotes || undefined,
        status: formData.status,
        jobId: formData.jobId,
        amount: totals.grandTotal,
      };

      if (formData.status === 'Sent' && !invoice?.sentDate) {
        (invoiceData as any).sentDate = new Date().toISOString();
      }

      let savedInvoice: Invoice;
      if (invoice) {
        savedInvoice = await invoiceService.update(invoice.id, invoiceData);
      } else {
        savedInvoice = await invoiceService.create(invoiceData);
      }

      onSave(savedInvoice);
      onClose();
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      setApiError(err.message || 'Failed to save invoice');
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
    return (
      formData.customerName.trim() !== '' &&
      formData.dueDate !== '' &&
      formData.lineItems.length > 0 &&
      formData.lineItems.some(item => item.selected && item.description.trim())
    );
  };

  const getStatusColor = (status: FormData['status']) => {
    switch (status) {
      case 'Draft': return 'bg-yellow-500';
      case 'Sent': return 'bg-blue-500';
      case 'Paid': return 'bg-green-500';
      case 'Overdue': return 'bg-red-500';
      case 'Void': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {invoice ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(formData.status)}`}>
                {formData.status}
              </span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Customer Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-300 mb-1">
                      Customer Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="Enter customer name"
                    />
                    {errors.customerName && (
                      <p className="mt-1 text-sm text-red-400">{errors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-300 mb-1">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-300 mb-1">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-300 mb-1">
                      Customer Address
                    </label>
                    <textarea
                      id="customerAddress"
                      name="customerAddress"
                      value={formData.customerAddress}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                      placeholder="Full address"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Invoice Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="issueDate" className="block text-sm font-medium text-gray-300 mb-1">
                      Issue Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      id="issueDate"
                      name="issueDate"
                      value={formData.issueDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-1">
                      Due Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                    {errors.dueDate && (
                      <p className="mt-1 text-sm text-red-400">{errors.dueDate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-300 mb-1">
                      Payment Terms
                    </label>
                    <select
                      id="paymentTerms"
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Net 90">Net 90</option>
                    </select>
                  </div>

                  {formData.status === 'Draft' && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange('Sent')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        Mark as Sent
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <LineItemBuilder
                lineItems={formData.lineItems}
                onChange={handleLineItemsChange}
              />
              {errors.lineItems && (
                <p className="mt-1 text-sm text-red-400">{errors.lineItems}</p>
              )}
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Discounts & Taxes</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discount Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="discountType"
                        value="percentage"
                        checked={formData.discountType === 'percentage'}
                        onChange={handleChange}
                        className="mr-2 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-gray-200">Percentage (%)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="discountType"
                        value="amount"
                        checked={formData.discountType === 'amount'}
                        onChange={handleChange}
                        className="mr-2 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-gray-200">Fixed Amount ($)</span>
                    </label>
                  </div>
                </div>

                {formData.discountType === 'percentage' ? (
                  <div>
                    <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-300 mb-1">
                      Discount Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="discountPercentage"
                        name="discountPercentage"
                        value={formData.discountPercentage}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-2 text-gray-400">%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="discountAmount" className="block text-sm font-medium text-gray-300 mb-1">
                      Discount Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400">$</span>
                      <input
                        type="number"
                        id="discountAmount"
                        name="discountAmount"
                        value={formData.discountAmount}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="taxRate" className="block text-sm font-medium text-gray-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="taxRate"
                      name="taxRate"
                      value={formData.taxRate}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-400">%</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gray-800 border border-gray-600 rounded-md p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        Discount {formData.discountType === 'percentage' ? `(${formData.discountPercentage}%)` : ''}:
                      </span>
                      <span className="text-red-400">-${totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Tax ({formData.taxRate}%):</span>
                      <span className="text-white font-medium">${totals.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-600 pt-2 flex justify-between">
                    <span className="text-white font-bold text-lg">Grand Total:</span>
                    <span className="text-cyan-400 font-bold text-lg">${totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Notes for internal use (not visible to customer)"
                  />
                </div>

                <div>
                  <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-300 mb-1">
                    Customer Notes
                  </label>
                  <textarea
                    id="customerNotes"
                    name="customerNotes"
                    value={formData.customerNotes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Notes visible to customer on invoice"
                  />
                </div>
              </div>
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
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              `${invoice ? 'Update' : 'Create'} Invoice`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditor;
