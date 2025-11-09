import React, { useState, useEffect } from 'react';
import { jobStateService } from '../services/apiService';
import XIcon from './icons/XIcon';

interface StateTransitionControlProps {
  jobId: string;
  currentState: string;
  onStateChanged: (newState: string) => void;
}

interface AllowedTransition {
  state: string;
  allowed: boolean;
  blockedReasons: string[];
}

const StateTransitionControl: React.FC<StateTransitionControlProps> = ({ 
  jobId, 
  currentState, 
  onStateChanged 
}) => {
  const [transitions, setTransitions] = useState<AllowedTransition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTransitions();
  }, [jobId, currentState]);

  const loadTransitions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await jobStateService.getAllowedTransitions(jobId);
      setTransitions(response.transitions || []);
    } catch (err: any) {
      console.error('Failed to load allowed transitions:', err);
      setError(err.message || 'Failed to load transitions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransitionClick = (state: string) => {
    setSelectedState(state);
    setReason('');
    setNotes('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedState) return;

    setIsSubmitting(true);
    try {
      await jobStateService.transitionState(jobId, {
        toState: selectedState,
        reason: reason || undefined,
        notes: notes || undefined,
      });
      
      setShowModal(false);
      onStateChanged(selectedState);
    } catch (err: any) {
      console.error('Failed to transition state:', err);
      setError(err.message || 'Failed to transition state');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
    }
  };

  const allowedTransitions = transitions.filter(t => t.allowed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
        <span className="ml-2 text-gray-400">Loading transitions...</span>
      </div>
    );
  }

  if (error && !showModal) {
    return (
      <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allowedTransitions.length === 0 ? (
          <p className="text-gray-400 text-sm">No transitions available for current state</p>
        ) : (
          allowedTransitions.map((transition) => (
            <button
              key={transition.state}
              onClick={() => handleTransitionClick(transition.state)}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
              title={`Transition to ${transition.state.replace(/_/g, ' ')}`}
            >
              {transition.state.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))
        )}
      </div>

      {showModal && selectedState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={handleOverlayClick}
        >
          <div
            className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">
                Confirm State Transition
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                type="button"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <p className="text-gray-300 mb-4">
                    Transition job to: <span className="font-semibold text-white">
                      {selectedState.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </p>
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Brief reason for transition"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Additional details..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-[#0a1421]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Transitioning...
                    </>
                  ) : (
                    'Confirm Transition'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StateTransitionControl;
