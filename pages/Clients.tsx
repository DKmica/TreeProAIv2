import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkOrder } from '../types';
import { workOrderService } from '../services/apiService';
import { Card, CardContent } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import { MapPin, Phone, Mail, Briefcase, FileText, MoreHorizontal, Search } from 'lucide-react';

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

    return Array.from(map.values())
      .filter(
        (client) =>
          !search ||
          client.clientName.toLowerCase().includes(search.toLowerCase()) ||
          client.clientEmail?.toLowerCase().includes(search.toLowerCase()) ||
          client.propertyAddress?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [search, workOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-brand-gray-400">{clients.length} active clients</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray-500" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg bg-brand-gray-800 border border-brand-gray-700 text-white placeholder-brand-gray-500 focus:outline-none focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 transition-all w-56"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="grid gap-3">
        {clients.map((client) => (
          <Card
            key={client.clientId}
            className="hover:border-brand-gray-600 transition-colors cursor-pointer"
            onClick={() => navigate(`/work-orders?clientId=${client.clientId}`)}
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <Avatar name={client.clientName} size="lg" />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold text-white text-base">{client.clientName}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-brand-gray-400">
                      {client.clientEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{client.clientEmail}</span>
                        </span>
                      )}
                      {client.clientPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {client.clientPhone}
                        </span>
                      )}
                      {client.propertyAddress && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{client.propertyAddress}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{client.leads}</div>
                      <div className="text-xs text-brand-gray-500">Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{client.quotes}</div>
                      <div className="text-xs text-brand-gray-500">Quotes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{client.jobs}</div>
                      <div className="text-xs text-brand-gray-500">Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{client.invoices}</div>
                      <div className="text-xs text-brand-gray-500">Invoices</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/work-orders?clientId=${client.clientId}`);
                    }}
                    className="p-1.5 text-brand-gray-500 hover:text-white hover:bg-brand-gray-700 rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 && !error && (
        <div className="text-center py-16">
          <Briefcase className="h-10 w-10 text-brand-gray-600 mx-auto mb-3" />
          <p className="text-brand-gray-400 text-sm">No clients found</p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-2 text-xs text-brand-cyan-400 hover:text-brand-cyan-300">
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Clients;
