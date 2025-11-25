import React from 'react';
import SparklesIcon from './icons/SparklesIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import ClockIcon from './icons/ClockIcon';

export interface AiInsightItem {
  id: string;
  title: string;
  description: string;
  confidence?: number;
  tag?: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface Props {
  title: string;
  subtitle?: string;
  icon?: 'sparkles' | 'shield' | 'clock';
  items: AiInsightItem[];
}

const iconMap: Record<Props['icon'], React.ReactNode> = {
  sparkles: <SparklesIcon className="w-5 h-5 text-brand-cyan-600" />,
  shield: <ShieldCheckIcon className="w-5 h-5 text-brand-green-600" />,
  clock: <ClockIcon className="w-5 h-5 text-brand-orange-500" />,
};

const AiInsightsPanel: React.FC<Props> = ({ title, subtitle, icon = 'sparkles', items }) => {
  return (
    <div className="bg-white border border-brand-gray-200 rounded-lg shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-cyan-50">
            {iconMap[icon]}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-brand-gray-600">{subtitle}</p>}
          </div>
        </div>
        <div className="inline-flex items-center rounded-full bg-brand-gray-50 px-3 py-1 text-xs font-medium text-brand-gray-600">
          AI
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-brand-gray-200 p-3 text-sm text-brand-gray-500">
            No insights available yet for this context.
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-md border border-brand-gray-200 p-3 hover:border-brand-cyan-200 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-brand-gray-900 flex items-center space-x-2">
                  <span>{item.title}</span>
                  {item.tag && (
                    <span className="inline-flex items-center rounded-full bg-brand-cyan-50 px-2 py-0.5 text-[11px] font-medium text-brand-cyan-700">
                      {item.tag}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-brand-gray-700 whitespace-pre-line">{item.description}</p>
                {item.meta && <p className="mt-2 text-xs text-brand-gray-500">{item.meta}</p>}
              </div>
              {item.confidence !== undefined && (
                <div className="ml-3 rounded-md bg-brand-gray-50 px-2 py-1 text-[11px] font-medium text-brand-gray-600">
                  {(item.confidence * 100).toFixed(0)}% confident
                </div>
              )}
            </div>

            {item.onAction && item.actionLabel && (
              <div className="mt-3">
                <button
                  onClick={item.onAction}
                  className="inline-flex items-center rounded-md border border-brand-cyan-200 bg-brand-cyan-50 px-3 py-1.5 text-xs font-semibold text-brand-cyan-700 hover:bg-brand-cyan-100"
                >
                  {item.actionLabel}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiInsightsPanel;
