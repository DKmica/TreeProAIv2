import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkOrder } from '../types';
import { workOrderService } from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';

interface ClientSummary {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  propertyAddress?: string;
  totalWorkOrders: number;
  leads: number;
  quotes: number;
  jobs: number;
  invoices: number;
}

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await workOrderService.getAll({ pageSize: 500 });
        setWorkOrders(result.data);
      } catch (err: any) {
        console.error('Failed to load work orders for clients', err);
        setError(err.message || 'Failed to load clients');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const clients = useMemo<ClientSummary[]>(() => {
    const map = new Map<string, ClientSummary>();

    workOrders.forEach((wo) => {
      if (!wo.clientId) return;
      const existing = map.get(wo.clientId) || {
        clientId: wo.clientId,
        clientName: wo.clientName || 'Unknown client',
        clientEmail: wo.clientEmail,
        clientPhone: wo.clientPhone,
        propertyAddress: wo.propertyAddress,
        totalWorkOrders: 0,
        leads: 0,
        quotes: 0,
        jobs: 0,
        invoices: 0,
      };

      existing.totalWorkOrders += 1;
      if (wo.stage === 'lead') existing.leads += 1;
      if (wo.stage === 'quoting') existing.quotes += 1;
      if (['scheduled', 'in_progress', 'complete'].includes(wo.stage)) existing.jobs += 1;
      if (wo.stage === 'invoiced') existing.invoices += 1;

      map.set(wo.clientId, existing);
    });

    const list = Array.from(map.values());
    return list
      .filter((client) =>
        !search ||
        client.clientName.toLowerCase().includes(search.toLowerCase()) ||
        client.clientEmail?.toLowerCase().includes(search.toLowerCase()) ||
        client.propertyAddress?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [search, workOrders]);

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
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-gray-400">Active clients sourced from work orders</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div
            key={client.clientId}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/60 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{client.clientName}</h3>
                {client.propertyAddress && (
                  <p className="text-sm text-gray-400">{client.propertyAddress}</p>
                )}
                {client.clientEmail && (
                  <p className="text-sm text-gray-400">{client.clientEmail}</p>
                )}
                {client.clientPhone && (
                  <p className="text-sm text-gray-400">{client.clientPhone}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/work-orders?clientId=${client.clientId}`)}
                className="text-cyan-400 text-sm hover:text-cyan-300"
              >
                View work orders
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-700/50 rounded p-2">
                <div className="text-xs text-gray-400">Leads</div>
                <div className="text-white font-semibold">{client.leads}</div>
              </div>
              <div className="bg-gray-700/50 rounded p-2">
                <div className="text-xs text-gray-400">Quotes</div>
                <div className="text-white font-semibold">{client.quotes}</div>
              </div>
              <div className="bg-gray-700/50 rounded p-2">
                <div className="text-xs text-gray-400">Jobs</div>
                <div className="text-white font-semibold">{client.jobs}</div>
              </div>
              <div className="bg-gray-700/50 rounded p-2">
                <div className="text-xs text-gray-400">Invoices</div>
                <div className="text-white font-semibold">{client.invoices}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && !error && (
        <div className="text-center text-gray-500 py-12">No clients found in work orders</div>
      )}
    </div>
  );
};

export default Clients;
