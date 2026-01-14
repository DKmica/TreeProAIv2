import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkOrder } from '../types';
import { workOrderService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { Search, MapPin, User, Plus, X } from 'lucide-react';

const Leads: React.FC = () => {
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
    title: '',
    clientName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const clientId = searchParams.get('clientId') || undefined;
        const result = await workOrderService.getAll({ stage: 'lead', clientId, pageSize: 200 });
        setWorkOrders(result.data);
      } catch (err: any) {
        console.error('Failed to load leads from work orders', err);
        setError(err.message || 'Failed to load leads');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [searchParams]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerDetails: {
            firstName: formData.clientName.split(' ')[0] || formData.clientName,
            lastName: formData.clientName.split(' ').slice(1).join(' ') || '',
            email: formData.email,
            phone: formData.phone,
            addressLine1: formData.address,
          },
          source: 'Manual Entry',
          description: formData.description,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create lead');
      }
      setShowCreateModal(false);
      setFormData({ title: '', clientName: '', email: '', phone: '', address: '', description: '' });
      const result = await workOrderService.getAll({ stage: 'lead', pageSize: 200 });
      setWorkOrders(result.data);
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
        wo.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [searchTerm, workOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerIcon className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-400">Lead-stage work orders</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lead) => (
          <div
            key={lead.id}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/60 transition cursor-pointer"
            onClick={() => navigate(`/work-orders/${lead.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{lead.title || 'Lead'}</h3>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {lead.clientName || 'Unknown client'}
                </p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Lead</span>
            </div>
            {lead.propertyAddress && (
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {lead.propertyAddress}
              </p>
            )}
            <div className="mt-3 text-xs text-gray-500">
              Created {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !error && (
        <div className="text-center text-gray-500 py-10">No leads found in the work order pipeline</div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Create New Lead</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {createError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600"
                >
                  {creating ? <SpinnerIcon className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {creating ? 'Creating...' : 'Create Lead'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
