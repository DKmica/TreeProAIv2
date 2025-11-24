import React, { useState, useEffect } from 'react';
import { exceptionQueueService } from '../services/exceptionQueueService';
import ExclamationTriangleIcon from '../components/icons/ExclamationTriangleIcon';

interface Exception {
  id: string;
  exception_type: string;
  entity_id: string;
  priority: string;
  quote_number?: string;
  job_number?: string;
  invoice_number?: string;
  customer_name: string;
  status: string;
  days_overdue?: number;
  amount_due?: number;
  created_at: string;
}

interface ExceptionQueueSummary {
  totalExceptions: number;
  criticalCount: number;
  highCount: number;
}

const ExceptionQueue: React.FC = () => {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [summary, setSummary] = useState<ExceptionQueueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_quotes' | 'overdue_invoices' | 'missing_forms' | 'follow_ups'>('all');

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      setIsLoading(true);
      const data = await exceptionQueueService.getAll();
      
      const allExceptions = [
        ...data.pendingQuotes,
        ...data.overdueInvoices,
        ...data.missingForms,
        ...data.followUps,
      ];
      
      setExceptions(allExceptions);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch exceptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (exceptionId: string) => {
    try {
      await exceptionQueueService.resolve(exceptionId);
      setExceptions(exceptions.filter(e => e.id !== exceptionId));
      if (summary) {
        setSummary({ ...summary, totalExceptions: Math.max(0, summary.totalExceptions - 1) });
      }
    } catch (error) {
      console.error('Failed to resolve exception:', error);
    }
  };

  const filteredExceptions = exceptions.filter(e => {
    if (filter === 'all') return true;
    return e.exception_type.replace('_', ' ') === filter.replace('_', ' ');
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'high':
        return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
      case 'medium':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      default:
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
    }
  };

  const getExceptionDescription = (exception: Exception) => {
    switch (exception.exception_type) {
      case 'quote_pending_approval':
        return `Quote ${exception.quote_number} awaiting approval`;
      case 'invoice_overdue':
        return `Invoice ${exception.invoice_number} is ${exception.days_overdue} days overdue (${exception.amount_due ? `$${exception.amount_due}` : 'amount pending'})`;
      case 'job_missing_forms':
        return `Job ${exception.job_number} missing required forms`;
      case 'quote_follow_up':
        return `Follow-up due for quote ${exception.quote_number}`;
      default:
        return 'Exception';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-brand-cyan-400">Loading exceptions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-bold text-white">Exception Queue</h1>
          </div>
          <p className="text-brand-gray-400">Manage pending approvals, overdue invoices, and follow-ups</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-brand-gray-900 border border-brand-gray-800 rounded-lg p-6">
              <p className="text-brand-gray-400 text-sm font-semibold uppercase">Total Exceptions</p>
              <p className="text-3xl font-bold text-white mt-2">{summary.totalExceptions}</p>
            </div>
            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-6">
              <p className="text-red-400 text-sm font-semibold uppercase">Critical</p>
              <p className="text-3xl font-bold text-red-400 mt-2">{summary.criticalCount}</p>
            </div>
            <div className="bg-orange-600/10 border border-orange-600/30 rounded-lg p-6">
              <p className="text-orange-400 text-sm font-semibold uppercase">High Priority</p>
              <p className="text-3xl font-bold text-orange-400 mt-2">{summary.highCount}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'pending_quotes', 'overdue_invoices', 'missing_forms', 'follow_ups'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-brand-cyan-600 text-white'
                  : 'bg-brand-gray-800 text-brand-gray-400 hover:bg-brand-gray-700'
              }`}
            >
              {f.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Exception List */}
        <div className="space-y-4">
          {filteredExceptions.length === 0 ? (
            <div className="bg-brand-gray-900 border border-brand-gray-800 rounded-lg p-8 text-center">
              <p className="text-brand-gray-400">No exceptions in this category</p>
            </div>
          ) : (
            filteredExceptions.map((exception) => (
              <div
                key={exception.id}
                className="bg-brand-gray-900 border border-brand-gray-800 rounded-lg p-6 hover:border-brand-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getPriorityColor(exception.priority)}`}>
                        {exception.priority.toUpperCase()}
                      </span>
                      <span className="text-sm text-brand-gray-400">
                        {new Date(exception.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-white font-semibold">{getExceptionDescription(exception)}</p>
                    <p className="text-brand-gray-400 text-sm mt-1">{exception.customer_name}</p>
                  </div>
                  <button
                    onClick={() => handleResolve(exception.id)}
                    className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExceptionQueue;
