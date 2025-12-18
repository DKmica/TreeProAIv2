import React, { useState, useEffect } from 'react';
import { jobStateService } from '../services/apiService';
import JobStatusBadge from './JobStatusBadge';

interface StateHistoryTimelineProps {
  jobId: string;
}

interface StateTransition {
  id: string;
  jobId: string;
  fromState: string | null;
  toState: string;
  changedBy: string | null;
  changedByRole: string | null;
  changeSource: 'manual' | 'automation' | 'api';
  reason: string | null;
  notes: any;
  metadata: any;
  createdAt: string;
}

const StateHistoryTimeline: React.FC<StateHistoryTimelineProps> = ({ jobId }) => {
  const [history, setHistory] = useState<StateTransition[]>([]);
  const [currentState, setCurrentState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [jobId]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await jobStateService.getStateHistory(jobId);
      setHistory(response.history || []);
      setCurrentState(response.currentState || '');
    } catch (err: any) {
      console.error('Failed to load state history:', err);
      setError(err.message || 'Failed to load state history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatChangeSource = (source: string): string => {
    switch (source) {
      case 'manual':
        return 'Manual';
      case 'automation':
        return 'Automated';
      case 'api':
        return 'API';
      default:
        return source;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        <span className="ml-3 text-gray-400">Loading history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No state history available for this job.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">State History</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Current:</span>
          <JobStatusBadge status={currentState} size="sm" />
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>

        <div className="space-y-6">
          {history.map((transition, index) => (
            <div key={transition.id} className="relative pl-10">
              <div 
                className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                  index === 0 ? 'bg-cyan-500 border-cyan-400' : 'bg-gray-600 border-gray-500'
                }`}
                style={{ top: '0.5rem' }}
              ></div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {transition.fromState && (
                      <>
                        <JobStatusBadge status={transition.fromState} size="sm" />
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    <JobStatusBadge status={transition.toState} size="sm" />
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(transition.createdAt)}
                  </span>
                </div>

                {transition.reason && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-300">Reason:</p>
                    <p className="text-sm text-gray-400">{transition.reason}</p>
                  </div>
                )}

                {transition.notes && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-300">Notes:</p>
                    <p className="text-sm text-gray-400">{transition.notes}</p>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  {transition.changedBy && (
                    <span>
                      By: <span className="text-gray-400">{transition.changedBy}</span>
                      {transition.changedByRole && (
                        <span className="ml-1">({transition.changedByRole})</span>
                      )}
                    </span>
                  )}
                  <span>
                    Source: <span className="text-gray-400">{formatChangeSource(transition.changeSource)}</span>
                  </span>
                </div>

                {transition.metadata && Object.keys(transition.metadata).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      View metadata
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 bg-gray-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(transition.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StateHistoryTimeline;
