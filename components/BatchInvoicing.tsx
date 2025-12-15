import React, { useState, useEffect } from 'react';
import { FileText, CheckSquare, Square, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface BatchCandidate {
  id: string;
  jobNumber?: string;
  customerName: string;
  clientName: string;
  clientEmail?: string;
  propertyAddress?: string;
  totalAmount: number;
  completedAt?: string;
  updatedAt: string;
}

interface BatchResult {
  created: Array<{ id: string; invoiceNumber: string; customerName: string; grandTotal: number }>;
  errors: Array<{ jobId: string; error: string }>;
}

interface BatchInvoicingProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

const BatchInvoicing: React.FC<BatchInvoicingProps> = ({ isOpen, onClose, onSuccess }) => {
  const [candidates, setCandidates] = useState<BatchCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
      setSelectedIds(new Set());
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/invoices/batch/candidates');
      const data = await response.json();
      if (data.success) {
        setCandidates(data.data);
      } else {
        setError(data.error || 'Failed to fetch candidates');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    }
  };

  const handleCreateInvoices = async () => {
    if (selectedIds.size === 0) return;

    setIsCreating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/invoices/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobIds: Array.from(selectedIds),
          paymentTerms,
          taxRate
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        setSelectedIds(new Set());
        fetchCandidates();
        if (onSuccess && data.data.created.length > 0) {
          onSuccess(data.data.created.length);
        }
      } else {
        setError(data.error || 'Failed to create invoices');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invoices');
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  const selectedTotal = candidates
    .filter(c => selectedIds.has(c.id))
    .reduce((sum, c) => sum + (c.totalAmount || 0), 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Batch Invoice Creation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 space-y-2">
              {result.created.length > 0 && (
                <div className="bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Created {result.created.length} invoice(s) successfully
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-500 text-yellow-200 px-4 py-3 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    {result.errors.length} job(s) failed:
                  </div>
                  <ul className="text-sm ml-7 space-y-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Net 90">Net 90</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <span className="ml-3 text-gray-400">Loading completed jobs...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No completed jobs found that need invoicing.</p>
              <p className="text-sm mt-1">All completed jobs already have invoices.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  {selectedIds.size === candidates.length ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                  {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-400">
                  {selectedIds.size} of {candidates.length} selected
                </span>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => toggleSelection(candidate.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(candidate.id)
                        ? 'bg-cyan-900/20 border-cyan-500'
                        : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        {selectedIds.has(candidate.id) ? (
                          <CheckSquare className="h-5 w-5 text-cyan-400" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">
                            {candidate.jobNumber ? `Job #${candidate.jobNumber}` : `Job ${candidate.id.slice(0, 8)}`}
                          </span>
                          <span className="text-cyan-400 font-semibold">
                            {formatCurrency(candidate.totalAmount)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {candidate.clientName || candidate.customerName}
                        </div>
                        {candidate.propertyAddress && (
                          <div className="text-sm text-gray-500 truncate">
                            {candidate.propertyAddress}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Completed: {formatDate(candidate.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-700 bg-[#0a1421]">
          <div className="text-sm text-gray-400">
            {selectedIds.size > 0 && (
              <>Selected total: <span className="text-cyan-400 font-semibold">{formatCurrency(selectedTotal)}</span></>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInvoices}
              disabled={selectedIds.size === 0 || isCreating}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Create {selectedIds.size} Invoice{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchInvoicing;
