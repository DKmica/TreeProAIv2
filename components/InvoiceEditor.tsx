import React, { useState, useEffect } from 'react';
import { Invoice, LineItem, BillingType, PaymentScheduleItem } from '../types';
import { invoiceService } from '../services/apiService';
import XIcon from './icons/XIcon';
import LineItemBuilder from './LineItemBuilder';
import { formatPhone } from '../utils/formatters';

interface InvoiceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  invoice?: Invoice;
  prefilledData?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
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
  billingType: BillingType;
  contractTotal: number;
  paymentSchedule: PaymentScheduleItem[];
}

interface FormErrors {
  customerName?: string;
  dueDate?: string;
  lineItems?: string;
  paymentSchedule?: string;
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
    billingType: 'single',
    contractTotal: 0,
    paymentSchedule: [],
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
        billingType: invoice.billingType || 'single',
        contractTotal: invoice.contractTotal || 0,
        paymentSchedule: invoice.paymentSchedule || [],
      });
    } else if (prefilledData) {
      setFormData(prev => ({
        ...prev,
        customerName: prefilledData.customerName || '',
        customerEmail: prefilledData.customerEmail || '',
        customerPhone: prefilledData.customerPhone || '',
        customerAddress: prefilledData.customerAddress || '',
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
        billingType: 'single',
        contractTotal: 0,
        paymentSchedule: [],
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

    if (formData.billingType !== 'single' && formData.paymentSchedule.length > 0) {
      const totalPercentage = formData.paymentSchedule.reduce((sum, item) => sum + item.percentage, 0);
      if (totalPercentage !== 100) {
        newErrors.paymentSchedule = `Payment schedule must total 100% (currently ${totalPercentage}%)`;
      }
      const hasInvalidPercentage = formData.paymentSchedule.some(item => item.percentage < 0 || item.percentage > 100);
      if (hasInvalidPercentage) {
        newErrors.paymentSchedule = 'Each payment percentage must be between 0% and 100%';
      }
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
        billingType: formData.billingType,
        contractTotal: formData.billingType !== 'single' ? formData.contractTotal : totals.grandTotal,
        paymentSchedule: formData.billingType !== 'single' ? formData.paymentSchedule : undefined,
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
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData(prev => ({ ...prev, customerPhone: formatted }));
                      }}
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

                  <div>
                    <label htmlFor="billingType" className="block text-sm font-medium text-gray-300 mb-1">
                      Billing Type
                    </label>
                    <select
                      id="billingType"
                      name="billingType"
                      value={formData.billingType}
                      onChange={(e) => {
                        const newType = e.target.value as BillingType;
                        setFormData(prev => {
                          const currentTotal = totals.grandTotal || prev.contractTotal || 0;
                          const newState = { ...prev, billingType: newType };
                          if (newType !== 'single') {
                            if (prev.contractTotal === 0) {
                              newState.contractTotal = currentTotal;
                            }
                            if (prev.paymentSchedule.length === 0 || prev.billingType === 'single') {
                              const defaultSchedule: PaymentScheduleItem[] = [];
                              if (newType === 'deposit') {
                                defaultSchedule.push(
                                  { name: 'Deposit', percentage: 50, amount: currentTotal * 0.5, dueDate: prev.issueDate, paid: false },
                                  { name: 'Final Payment', percentage: 50, amount: currentTotal * 0.5, dueDate: prev.dueDate, paid: false }
                                );
                              } else if (newType === 'milestone') {
                                defaultSchedule.push(
                                  { name: 'Milestone 1', percentage: 33, amount: currentTotal * 0.33, dueDate: prev.issueDate, paid: false },
                                  { name: 'Milestone 2', percentage: 33, amount: currentTotal * 0.33, dueDate: '', paid: false },
                                  { name: 'Final Payment', percentage: 34, amount: currentTotal * 0.34, dueDate: prev.dueDate, paid: false }
                                );
                              } else if (newType === 'final') {
                                defaultSchedule.push(
                                  { name: 'Final Payment', percentage: 100, amount: currentTotal, dueDate: prev.dueDate, paid: false }
                                );
                              }
                              newState.paymentSchedule = defaultSchedule;
                            }
                          }
                          return newState;
                        });
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="single">Single Invoice</option>
                      <option value="deposit">Deposit + Final</option>
                      <option value="milestone">Milestone Billing</option>
                      <option value="final">Final Invoice</option>
                    </select>
                  </div>

                  {formData.billingType !== 'single' && (
                    <div>
                      <label htmlFor="contractTotal" className="block text-sm font-medium text-gray-300 mb-1">
                        Total Contract Value
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">$</span>
                        <input
                          type="number"
                          id="contractTotal"
                          name="contractTotal"
                          value={formData.contractTotal}
                          onChange={(e) => {
                            const newTotal = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({
                              ...prev,
                              contractTotal: newTotal,
                              paymentSchedule: prev.paymentSchedule.map(item => ({
                                ...item,
                                amount: (newTotal * item.percentage) / 100
                              }))
                            }));
                          }}
                          step="0.01"
                          min="0"
                          className="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

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

            {formData.billingType !== 'single' && formData.paymentSchedule.length > 0 && (
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Payment Schedule</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newItem: PaymentScheduleItem = {
                        name: `Payment ${formData.paymentSchedule.length + 1}`,
                        percentage: 0,
                        amount: 0,
                        dueDate: '',
                        paid: false,
                      };
                      setFormData(prev => ({
                        ...prev,
                        paymentSchedule: [...prev.paymentSchedule, newItem],
                      }));
                    }}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    + Add Payment
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.paymentSchedule.map((item, index) => (
                    <div key={index} className="bg-gray-800 border border-gray-600 rounded-md p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...formData.paymentSchedule];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setFormData(prev => ({ ...prev, paymentSchedule: updated }));
                            }}
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Percentage</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={item.percentage}
                              onChange={(e) => {
                                const updated = [...formData.paymentSchedule];
                                const pct = parseFloat(e.target.value) || 0;
                                updated[index] = { 
                                  ...updated[index], 
                                  percentage: pct,
                                  amount: (formData.contractTotal * pct) / 100
                                };
                                setFormData(prev => ({ ...prev, paymentSchedule: updated }));
                              }}
                              step="1"
                              min="0"
                              max="100"
                              className="w-full px-2 py-1.5 pr-6 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                            />
                            <span className="absolute right-2 top-1.5 text-gray-400 text-sm">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Due Date</label>
                          <input
                            type="date"
                            value={item.dueDate}
                            onChange={(e) => {
                              const updated = [...formData.paymentSchedule];
                              updated[index] = { ...updated[index], dueDate: e.target.value };
                              setFormData(prev => ({ ...prev, paymentSchedule: updated }));
                            }}
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">
                            ${((formData.contractTotal * item.percentage) / 100).toFixed(2)}
                          </span>
                          {formData.paymentSchedule.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formData.paymentSchedule.filter((_, i) => i !== index);
                                setFormData(prev => ({ ...prev, paymentSchedule: updated }));
                              }}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-600">
                    <span className="text-gray-400">Total:</span>
                    <span className={`font-medium ${
                      formData.paymentSchedule.reduce((sum, item) => sum + item.percentage, 0) === 100 
                        ? 'text-green-400' 
                        : 'text-yellow-400'
                    }`}>
                      {formData.paymentSchedule.reduce((sum, item) => sum + item.percentage, 0)}%
                      {formData.paymentSchedule.reduce((sum, item) => sum + item.percentage, 0) !== 100 && (
                        <span className="ml-2 text-yellow-400">(should be 100%)</span>
                      )}
                    </span>
                  </div>
                  {errors.paymentSchedule && (
                    <p className="mt-2 text-sm text-red-400">{errors.paymentSchedule}</p>
                  )}
                </div>
              </div>
            )}

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
