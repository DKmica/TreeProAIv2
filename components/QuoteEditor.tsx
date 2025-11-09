import React, { useState, useEffect } from 'react';
import { Quote, Client, Property, LineItem } from '../types';
import { quoteService, clientService } from '../services/apiService';
import XIcon from './icons/XIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';

interface QuoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => void;
  quote?: Quote;
}

interface FormData {
  clientId: string;
  propertyId: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Converted';
  paymentTerms: string;
  termsAndConditions: string;
  internalNotes: string;
  taxRate: string;
  discountPercentage: string;
  validUntil: string;
}

interface FormErrors {
  clientId?: string;
  lineItems?: string;
  taxRate?: string;
  discountPercentage?: string;
}

const QuoteEditor: React.FC<QuoteEditorProps> = ({ isOpen, onClose, onSave, quote }) => {
  const [formData, setFormData] = useState<FormData>({
    clientId: '',
    propertyId: '',
    status: 'Draft',
    paymentTerms: 'Net 30',
    termsAndConditions: '',
    internalNotes: '',
    taxRate: '0',
    discountPercentage: '0',
    validUntil: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', price: 0, selected: true }
  ]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (quote) {
      setFormData({
        clientId: quote.clientId || '',
        propertyId: quote.propertyId || '',
        status: quote.status,
        paymentTerms: quote.paymentTerms || 'Net 30',
        termsAndConditions: quote.termsAndConditions || '',
        internalNotes: quote.internalNotes || '',
        taxRate: quote.taxRate ? quote.taxRate.toString() : '0',
        discountPercentage: quote.discountPercentage ? quote.discountPercentage.toString() : '0',
        validUntil: quote.validUntil || '',
      });
      setLineItems(quote.lineItems && quote.lineItems.length > 0 ? quote.lineItems : [{ description: '', price: 0, selected: true }]);
      if (quote.clientId) {
        fetchProperties(quote.clientId);
      }
    } else {
      setFormData({
        clientId: '',
        propertyId: '',
        status: 'Draft',
        paymentTerms: 'Net 30',
        termsAndConditions: '',
        internalNotes: '',
        taxRate: '0',
        discountPercentage: '0',
        validUntil: '',
      });
      setLineItems([{ description: '', price: 0, selected: true }]);
      setProperties([]);
    }
    setErrors({});
    setApiError(null);
  }, [quote, isOpen]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const clientsData = await clientService.getAll();
      setClients(clientsData);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchProperties = async (clientId: string) => {
    if (!clientId) {
      setProperties([]);
      return;
    }
    setLoadingProperties(true);
    try {
      const propertiesData = await clientService.getProperties(clientId);
      setProperties(propertiesData);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const discountAmount = (subtotal * parseFloat(formData.discountPercentage || '0')) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * parseFloat(formData.taxRate || '0')) / 100;
    const grandTotal = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      grandTotal,
    };
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }

    const validLineItems = lineItems.filter(item => item.description.trim());
    if (validLineItems.length === 0) {
      newErrors.lineItems = 'At least one line item with description is required';
    }

    const taxRate = parseFloat(formData.taxRate || '0');
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      newErrors.taxRate = 'Tax rate must be between 0 and 100';
    }

    const discountPercentage = parseFloat(formData.discountPercentage || '0');
    if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
      newErrors.discountPercentage = 'Discount must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'clientId') {
      fetchProperties(value);
      setFormData(prev => ({ ...prev, propertyId: '' }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number | boolean) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    setLineItems(newLineItems);
    
    if (errors.lineItems) {
      setErrors(prev => ({ ...prev, lineItems: undefined }));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', price: 0, selected: true }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const newLineItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newLineItems);
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
      const validLineItems = lineItems.filter(item => item.description.trim());
      const totals = calculateTotals();
      
      const quoteData: Partial<Quote> = {
        clientId: formData.clientId || undefined,
        propertyId: formData.propertyId || undefined,
        status: formData.status,
        lineItems: validLineItems,
        paymentTerms: formData.paymentTerms,
        termsAndConditions: formData.termsAndConditions || undefined,
        internalNotes: formData.internalNotes || undefined,
        taxRate: parseFloat(formData.taxRate || '0'),
        discountPercentage: parseFloat(formData.discountPercentage || '0'),
        validUntil: formData.validUntil || undefined,
        totalAmount: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        version: 1,
        approvalStatus: 'pending',
      };

      let savedQuote: Quote;
      if (quote) {
        savedQuote = await quoteService.update(quote.id, quoteData);
      } else {
        savedQuote = await quoteService.create(quoteData);
      }

      onSave(savedQuote);
      onClose();
    } catch (err: any) {
      console.error('Error saving quote:', err);
      setApiError(err.message || 'Failed to save quote');
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
    if (!formData.clientId) return false;
    const validLineItems = lineItems.filter(item => item.description.trim());
    if (validLineItems.length === 0) return false;
    const taxRate = parseFloat(formData.taxRate || '0');
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) return false;
    const discountPercentage = parseFloat(formData.discountPercentage || '0');
    if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) return false;
    return true;
  };

  const totals = calculateTotals();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {quote ? 'Edit Quote' : 'Create Quote'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-1">
                  Client <span className="text-red-400">*</span>
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  disabled={loadingClients}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName || `${client.firstName} ${client.lastName}`}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="mt-1 text-sm text-red-400">{errors.clientId}</p>
                )}
              </div>

              <div>
                <label htmlFor="propertyId" className="block text-sm font-medium text-gray-300 mb-1">
                  Property (Optional)
                </label>
                <select
                  id="propertyId"
                  name="propertyId"
                  value={formData.propertyId}
                  onChange={handleChange}
                  disabled={loadingProperties || !formData.clientId}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                >
                  <option value="">Select a property...</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.propertyName || property.addressLine1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
                  Status <span className="text-red-400">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Declined">Declined</option>
                  <option value="Converted">Converted</option>
                </select>
              </div>

              <div>
                <label htmlFor="validUntil" className="block text-sm font-medium text-gray-300 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Line Items</h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-1" />
                  Add Item
                </button>
              </div>
              
              {errors.lineItems && (
                <p className="mb-2 text-sm text-red-400">{errors.lineItems}</p>
              )}

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        placeholder="Service description"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleLineItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        placeholder="Price"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Pricing</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-300 mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    id="discountPercentage"
                    name="discountPercentage"
                    value={formData.discountPercentage}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  {errors.discountPercentage && (
                    <p className="mt-1 text-sm text-red-400">{errors.discountPercentage}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="taxRate" className="block text-sm font-medium text-gray-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    id="taxRate"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  {errors.taxRate && (
                    <p className="mt-1 text-sm text-red-400">{errors.taxRate}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal:</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Discount:</span>
                  <span>-${totals.discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax:</span>
                  <span>${totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg border-t border-gray-600 pt-2">
                  <span>Total:</span>
                  <span>${totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-300 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  id="paymentTerms"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g., Net 30, Due on Receipt"
                />
              </div>
            </div>

            <div>
              <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-300 mb-1">
                Terms and Conditions
              </label>
              <textarea
                id="termsAndConditions"
                name="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                placeholder="Terms and conditions for this quote..."
              />
            </div>

            <div>
              <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-300 mb-1">
                Internal Notes
              </label>
              <textarea
                id="internalNotes"
                name="internalNotes"
                value={formData.internalNotes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                placeholder="Internal notes (not visible to client)..."
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              'Save Quote'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteEditor;
