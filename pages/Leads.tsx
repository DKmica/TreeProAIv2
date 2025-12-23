import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkOrder } from '../types';
import { workOrderService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { Search, MapPin, User } from 'lucide-react';

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};

export default Leads;
