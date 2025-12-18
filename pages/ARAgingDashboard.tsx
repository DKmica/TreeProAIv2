import React, { useState, useMemo, useEffect } from 'react';
import { Invoice } from '../types';
import { invoiceService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { AlertTriangle, TrendingUp, Clock, DollarSign, ChevronDown, ChevronRight, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type AgingBucket = 'Current' | '1-30' | '31-60' | '61-90' | '90+';

interface ClientAging {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  totalOutstanding: number;
  buckets: Record<AgingBucket, number>;
  invoices: Invoice[];
  oldestDueDate: Date;
}

const ARAgingDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedBucket, setSelectedBucket] = useState<AgingBucket | 'All'>('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await invoiceService.getAll();
        setInvoices(data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const getAgingBucket = (invoice: Invoice): AgingBucket => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    if (Number.isNaN(dueDate.getTime())) return 'Current';

    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Current';
    if (diffDays <= 30) return '1-30';
    if (diffDays <= 60) return '31-60';
    if (diffDays <= 90) return '61-90';
    return '90+';
  };

  const unpaidInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.status !== 'Paid' && 
      inv.status !== 'Void' && 
      inv.amountDue > 0
    );
  }, [invoices]);

  const agingSummary = useMemo(() => {
    const summary = {
      totalOutstanding: 0,
      buckets: {
        Current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      } as Record<AgingBucket, number>,
      counts: {
        Current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      } as Record<AgingBucket, number>,
    };

    unpaidInvoices.forEach((invoice) => {
      const due = Math.max(invoice.amountDue, 0);
      summary.totalOutstanding += due;
      const bucket = getAgingBucket(invoice);
      summary.buckets[bucket] = (summary.buckets[bucket] || 0) + due;
      summary.counts[bucket] = (summary.counts[bucket] || 0) + 1;
    });

    return summary;
  }, [unpaidInvoices]);

  const clientAging = useMemo((): ClientAging[] => {
    const clientMap = new Map<string, ClientAging>();

    unpaidInvoices.forEach((invoice) => {
      const clientId = invoice.clientId || 'unknown';
      const clientName = invoice.customerName || 'Unknown Client';
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          clientId,
          clientName,
          clientEmail: invoice.customerEmail,
          totalOutstanding: 0,
          buckets: { Current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          invoices: [],
          oldestDueDate: new Date(invoice.dueDate),
        });
      }

      const client = clientMap.get(clientId)!;
      const due = Math.max(invoice.amountDue, 0);
      const bucket = getAgingBucket(invoice);
      
      client.totalOutstanding += due;
      client.buckets[bucket] += due;
      client.invoices.push(invoice);
      
      const invDueDate = new Date(invoice.dueDate);
      if (invDueDate < client.oldestDueDate) {
        client.oldestDueDate = invDueDate;
      }
    });

    return Array.from(clientMap.values())
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [unpaidInvoices]);

  const filteredClients = useMemo(() => {
    if (selectedBucket === 'All') return clientAging;
    return clientAging.filter(client => client.buckets[selectedBucket] > 0);
  }, [clientAging, selectedBucket]);

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysOverdue = (dueDate: Date | string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getBucketColor = (bucket: AgingBucket) => {
    switch (bucket) {
      case 'Current':
        return 'bg-emerald-500';
      case '1-30':
        return 'bg-amber-500';
      case '31-60':
        return 'bg-orange-500';
      case '61-90':
        return 'bg-red-500';
      case '90+':
        return 'bg-rose-600';
    }
  };

  const getBucketBgColor = (bucket: AgingBucket) => {
    switch (bucket) {
      case 'Current':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '1-30':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case '31-60':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '61-90':
        return 'bg-red-100 text-red-800 border-red-200';
      case '90+':
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-8 w-8 text-brand-green-500" />
      </div>
    );
  }

  const overdueTotal = agingSummary.buckets['1-30'] + agingSummary.buckets['31-60'] + agingSummary.buckets['61-90'] + agingSummary.buckets['90+'];
  const overdueCount = agingSummary.counts['1-30'] + agingSummary.counts['31-60'] + agingSummary.counts['61-90'] + agingSummary.counts['90+'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-gray-900">A/R Aging Dashboard</h1>
        <p className="mt-1 text-sm text-brand-gray-600">
          Monitor accounts receivable aging and track overdue payments
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(agingSummary.totalOutstanding)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">{unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(agingSummary.buckets.Current)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">{agingSummary.counts.Current} invoice{agingSummary.counts.Current !== 1 ? 's' : ''} not yet due</p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">Total Overdue</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(overdueTotal)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-red-600">{overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Clients w/ Balance</p>
              <p className="text-2xl font-bold text-gray-900">{clientAging.length}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">Avg {formatCurrency(clientAging.length > 0 ? agingSummary.totalOutstanding / clientAging.length : 0)}/client</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aging Breakdown</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          {(['Current', '1-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((bucket) => {
            const amount = agingSummary.buckets[bucket];
            const count = agingSummary.counts[bucket];
            const percentage = agingSummary.totalOutstanding > 0 
              ? (amount / agingSummary.totalOutstanding * 100) 
              : 0;
            
            return (
              <button
                key={bucket}
                onClick={() => setSelectedBucket(selectedBucket === bucket ? 'All' : bucket)}
                className={`rounded-lg border p-4 transition-all ${
                  selectedBucket === bucket 
                    ? 'ring-2 ring-brand-cyan-500 border-brand-cyan-500' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getBucketBgColor(bucket)}`}>
                    {bucket === 'Current' ? 'Current' : `${bucket} Days`}
                  </span>
                  <span className="text-xs text-gray-500">{count}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(amount)}</p>
                <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getBucketColor(bucket)} rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{percentage.toFixed(1)}%</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Client Aging Detail
            {selectedBucket !== 'All' && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Filtered: {selectedBucket === 'Current' ? 'Current' : `${selectedBucket} Days`})
              </span>
            )}
          </h2>
          {selectedBucket !== 'All' && (
            <button
              onClick={() => setSelectedBucket('All')}
              className="text-sm text-brand-cyan-600 hover:text-brand-cyan-700"
            >
              Clear filter
            </button>
          )}
        </div>

        {filteredClients.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No outstanding invoices found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredClients.map((client) => {
              const isExpanded = expandedClients.has(client.clientId);
              const daysOverdue = getDaysOverdue(client.oldestDueDate);
              
              return (
                <div key={client.clientId}>
                  <button
                    onClick={() => toggleClient(client.clientId)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{client.clientName}</p>
                        <p className="text-sm text-gray-500">
                          {client.invoices.length} invoice{client.invoices.length !== 1 ? 's' : ''}
                          {daysOverdue > 0 && (
                            <span className="ml-2 text-red-600">
                              · Oldest: {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex items-center gap-2">
                        {(['Current', '1-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((bucket) => (
                          client.buckets[bucket] > 0 && (
                            <span
                              key={bucket}
                              className={`text-xs font-medium px-2 py-1 rounded ${getBucketBgColor(bucket)}`}
                            >
                              {formatCurrency(client.buckets[bucket])}
                            </span>
                          )
                        ))}
                      </div>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(client.totalOutstanding)}</p>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {client.invoices
                              .filter(inv => selectedBucket === 'All' || getAgingBucket(inv) === selectedBucket)
                              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                              .map((invoice) => {
                                const bucket = getAgingBucket(invoice);
                                const overdue = getDaysOverdue(invoice.dueDate);
                                
                                return (
                                  <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                      {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-500">
                                      {formatDate(invoice.issueDate)}
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      <span className={overdue > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                        {formatDate(invoice.dueDate)}
                                        {overdue > 0 && (
                                          <span className="ml-1 text-xs">({overdue}d)</span>
                                        )}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded ${getBucketBgColor(bucket)}`}>
                                        {bucket === 'Current' ? 'Current' : `${bucket} Days`}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">
                                      {formatCurrency(invoice.amountDue)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/invoices');
                                          }}
                                          className="p-1 text-gray-400 hover:text-brand-cyan-600"
                                          title="View Invoice"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </button>
                                        {invoice.customerEmail && (
                                          <a
                                            href={`mailto:${invoice.customerEmail}?subject=Invoice ${invoice.invoiceNumber || invoice.id} - Payment Reminder`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 text-gray-400 hover:text-brand-cyan-600"
                                            title="Send Reminder"
                                          >
                                            <Mail className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ARAgingDashboard;
