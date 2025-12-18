import React from 'react';
import { LineItem } from '../types';
import PlusCircleIcon from './icons/PlusCircleIcon';
import XIcon from './icons/XIcon';

interface LineItemBuilderProps {
  lineItems: LineItem[];
  onChange: (lineItems: LineItem[]) => void;
  readonly?: boolean;
}

const LineItemBuilder: React.FC<LineItemBuilderProps> = ({ lineItems, onChange, readonly = false }) => {
  const handleAddLineItem = () => {
    onChange([...lineItems, { description: '', price: 0, selected: true }]);
  };

  const handleRemoveLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.selected ? item.price : 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-300">
          Line Items <span className="text-red-400">*</span>
        </label>
        {!readonly && (
          <button
            type="button"
            onClick={handleAddLineItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-md hover:bg-cyan-700 transition-colors"
          >
            <PlusCircleIcon className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      <div className="space-y-3">
        {lineItems.length === 0 && (
          <div className="text-center py-8 text-gray-400 border border-gray-600 rounded-md border-dashed">
            No line items. Click "Add Item" to get started.
          </div>
        )}

        {lineItems.map((item, index) => (
          <div key={index} className="bg-gray-800 border border-gray-600 rounded-md p-4">
            <div className="flex items-start gap-3">
              {!readonly && (
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => handleLineItemChange(index, 'selected', e.target.checked)}
                  className="mt-2 text-cyan-500 focus:ring-cyan-500 rounded"
                />
              )}
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                    disabled={readonly}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Service description"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleLineItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                      disabled={readonly}
                      step="0.01"
                      min="0"
                      className="w-full pl-7 pr-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleRemoveLineItem(index)}
                  className="mt-6 text-red-400 hover:text-red-300 transition-colors p-1"
                  title="Remove item"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {lineItems.length > 0 && (
        <div className="flex justify-end pt-3 border-t border-gray-600">
          <div className="text-right">
            <div className="text-sm text-gray-400">Subtotal</div>
            <div className="text-xl font-bold text-cyan-400">
              ${calculateTotal().toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineItemBuilder;
