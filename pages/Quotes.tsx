import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkOrder } from '../types';
import { workOrderService } from '../services/apiService';
import { Card, CardContent } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import { DollarSign, Search, User, Plus, X, ChevronRight } from 'lucide-react';

const formatCurrency = (value?: number) => {
  if (!value) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    phone: '',
    description: '',
    estimatedValue: '',
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const clientId = searchParams.get('clientId') || undefined;
        const result = await workOrderService.getAll({ stage: 'quoting', clientId, pageSize: 200 });
        setWorkOrders(result.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load quotes');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [searchParams]);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerDetails: {
            firstName: formData.clientName.split(' ')[0] || formData.clientName,
            lastName: formData.clientName.split(' ').slice(1).join(' ') || '',
            email: formData.email,
            phone: formData.phone,
          },
          lineItems: [],
          status: 'Draft',
          specialInstructions: formData.description,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create quote');
      }
      const data = await response.json();
      setShowCreateModal(false);
      setFormData({ clientName: '', email: '', phone: '', description: '', estimatedValue: '' });
      navigate(`/quotes/${data.id}`);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    return workOrders.filter((wo) => {
      if (!searchTerm) return true;
      return (
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [searchTerm, workOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray-400">{filtered.length} quote{filtered.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-500" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-brand-gray-800 border border-brand-gray-700 rounded-lg text-white placeholder-brand-gray-500 focus:outline-none focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 transition-all w-52"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-cyan-600 text-white rounded-lg hover:bg-brand-cyan-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quote
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="grid gap-3">
        {filtered.map((quote) => (
          <Card
            key={quote.id}
            className="hover:border-brand-gray-600 cursor-pointer transition-colors"
            onClick={() => navigate(`/work-orders/${quote.id}`)}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Avatar name={quote.clientName || 'Quote'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{quote.title || 'Quote'}</h3>
                      <p className="text-xs text-brand-gray-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {quote.clientName || 'Unknown client'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {quote.estimatedValue && (
                        <span className="text-sm font-semibold text-brand-cyan-400 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatCurrency(quote.estimatedValue)}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Quoting
                      </span>
                      <ChevronRight className="w-4 h-4 text-brand-gray-600" />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-brand-gray-600">
                    Updated {new Date(quote.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && !error && (
        <div className="text-center py-16 text-brand-gray-500 text-sm">No quotes found</div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-gray-800 border border-brand-gray-700 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-700">
              <h3 className="text-base font-semibold text-white">Create New Quote</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-brand-gray-400 hover:text-white hover:bg-brand-gray-700 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              {createError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{createError}</div>
              )}
              <form onSubmit={handleCreateQuote} className="space-y-4">
                {[
                  { label: 'Client Name', key: 'clientName', type: 'text', required: true },
                  { label: 'Email', key: 'email', type: 'email', required: false },
                  { label: 'Phone', key: 'phone', type: 'tel', required: false },
                ].map(({ label, key, type, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-brand-gray-300 mb-1.5">{label}{required && ' *'}</label>
                    <input
                      type={type}
                      required={required}
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-brand-gray-900 border border-brand-gray-600 rounded-lg text-white focus:outline-none focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 transition-all"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-brand-gray-300 mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What work needs to be done?"
                    className="w-full px-3 py-2 text-sm bg-brand-gray-900 border border-brand-gray-600 rounded-lg text-white focus:outline-none focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-brand-cyan-600 text-white rounded-lg hover:bg-brand-cyan-500 transition-colors disabled:opacity-50"
                >
                  {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Quote'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
