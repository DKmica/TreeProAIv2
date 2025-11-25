import React from 'react';
import { QuotePricingOption } from '../types';

interface PricingOptionsGridProps {
  options: QuotePricingOption[];
  onSelect: (optionId: string) => void;
  onRecommend: (optionId: string) => void;
  isLoading?: boolean;
  selectedOptionId?: string;
}

const tierColors: Record<string, string> = {
  Good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Better: 'bg-blue-50 text-blue-700 border-blue-200',
  Best: 'bg-purple-50 text-purple-700 border-purple-200'
};

const PricingOptionsGrid: React.FC<PricingOptionsGridProps> = ({ options, onSelect, onRecommend, isLoading, selectedOptionId }) => {
  if (!options || options.length === 0) {
    return (
      <div className="border border-dashed border-brand-gray-200 rounded-lg p-6 text-center text-brand-gray-600">
        No pricing options yet — add Good/Better/Best to present choices.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {options
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((option) => {
          const badgeStyles = tierColors[option.optionTier] || 'bg-brand-gray-50 text-brand-gray-800 border-brand-gray-200';
          const isSelected = option.isSelected || selectedOptionId === option.id;

          return (
            <div
              key={option.id}
              className={`rounded-lg border ${isSelected ? 'border-brand-cyan-500 shadow-lg shadow-brand-cyan-50' : 'border-brand-gray-200'} bg-white flex flex-col`}
            >
              <div className="flex items-start justify-between p-4 border-b border-brand-gray-100">
                <div className="space-y-1">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyles}`}>
                    {option.optionTier}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-brand-gray-900">{option.optionName}</p>
                    {option.isRecommended && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        Recommended
                      </span>
                    )}
                  </div>
                  {option.description && <p className="text-sm text-brand-gray-600">{option.description}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-gray-500">Total</p>
                  <p className="text-2xl font-bold text-brand-gray-900">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(option.total)}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 p-4">
                {option.features && option.features.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-gray-500 mb-1">Includes</p>
                    <ul className="space-y-1 text-sm text-brand-gray-700">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-cyan-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {option.exclusions && option.exclusions.length > 0 && (
                  <div className="bg-brand-gray-50 rounded-md p-3 border border-brand-gray-100">
                    <p className="text-xs font-semibold text-brand-gray-500 mb-1">Exclusions</p>
                    <ul className="space-y-1 text-xs text-brand-gray-700">
                      {option.exclusions.map((exclusion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1 w-1 rounded-full bg-brand-gray-400" />
                          <span>{exclusion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {option.warrantyInfo && (
                  <div className="flex items-center gap-2 text-xs text-brand-gray-600">
                    <svg className="h-4 w-4 text-brand-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6l7 3-7 3-7-3 7-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 11l7 3 7-3" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7 3 7-3" />
                    </svg>
                    {option.warrantyInfo}
                  </div>
                )}

                {option.estimatedDuration && (
                  <div className="flex items-center gap-2 text-xs text-brand-gray-600">
                    <svg className="h-4 w-4 text-brand-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3" />
                      <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                    </svg>
                    Est. duration {option.estimatedDuration}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-brand-gray-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => onSelect(option.id)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                    isSelected ? 'bg-brand-cyan-600 text-white hover:bg-brand-cyan-700' : 'border border-brand-gray-200 text-brand-gray-800 hover:border-brand-cyan-400 hover:text-brand-cyan-700'
                  }`}
                  disabled={isLoading}
                >
                  {isSelected ? 'Selected' : 'Present this option'}
                </button>
                <button
                  onClick={() => onRecommend(option.id)}
                  className="px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
                  disabled={isLoading}
                >
                  {option.isRecommended ? 'Featured' : 'Feature'}
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default PricingOptionsGrid;
