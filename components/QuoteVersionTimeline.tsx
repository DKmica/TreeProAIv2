import React from 'react';
import { QuoteVersion } from '../types';

interface QuoteVersionTimelineProps {
  versions: QuoteVersion[];
  onSnapshot?: () => void;
  isSaving?: boolean;
}

const QuoteVersionTimeline: React.FC<QuoteVersionTimelineProps> = ({ versions, onSnapshot, isSaving }) => {
  return (
    <div className="bg-white border border-brand-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray-100">
        <div>
          <p className="text-sm font-semibold text-brand-gray-900">Version history</p>
          <p className="text-xs text-brand-gray-600">Snapshot quotes before sending updates to customers.</p>
        </div>
        {onSnapshot && (
          <button
            onClick={onSnapshot}
            className="px-3 py-2 text-sm font-semibold text-white bg-brand-cyan-600 rounded-md hover:bg-brand-cyan-700 disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save snapshot'}
          </button>
        )}
      </div>
      <div className="p-4 space-y-4">
        {versions && versions.length > 0 ? (
          versions
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((version) => (
              <div key={version.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-brand-cyan-50 border border-brand-cyan-100 text-brand-cyan-700 flex items-center justify-center font-semibold">
                  v{version.versionNumber}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-gray-900">{version.changeReason || 'Snapshot'}</p>
                    <p className="text-xs text-brand-gray-500">{new Date(version.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-brand-gray-600">
                    {version.changedBy ? `Edited by ${version.changedBy}` : 'System captured'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-brand-gray-700">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-brand-gray-100 border border-brand-gray-200">{version.lineItems.length} items</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-brand-cyan-50 border border-brand-cyan-100 text-brand-cyan-700">
                      Total {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(version.totalAmount)}
                    </span>
                    {version.terms && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">Terms updated</span>
                    )}
                  </div>
                  {version.notes && (
                    <p className="mt-1 text-xs text-brand-gray-700">{version.notes}</p>
                  )}
                </div>
              </div>
            ))
        ) : (
          <p className="text-sm text-brand-gray-600">No versions yet.</p>
        )}
      </div>
    </div>
  );
};

export default QuoteVersionTimeline;
