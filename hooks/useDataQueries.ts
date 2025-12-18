import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/apiService';
import { Client, Lead, Quote, Job, Invoice, Employee, Equipment } from '../types';

interface DashboardSummary {
  counts: {
    clients: number;
    leads: number;
    activeLeads: number;
    quotes: number;
    pendingQuotes: number;
    jobs: number;
    scheduledJobs: number;
    completedJobs: number;
    invoices: number;
    unpaidInvoices: number;
    employees: number;
    equipment: number;
  };
  recentActivity: {
    recentLeads: number;
    recentJobs: number;
    overdueInvoices: number;
  };
  revenue: {
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
  };
}

const STALE_TIME = 5 * 60 * 1000;
const DASHBOARD_STALE_TIME = 2 * 60 * 1000;

export function useClientsQuery() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => api.clientService.getAll(),
    staleTime: STALE_TIME,
  });
}

export function useLeadsQuery() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: () => api.leadService.getAll(),
    staleTime: STALE_TIME,
  });
}

export function useQuotesQuery() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: () => api.quoteService.getAll(),
    staleTime: STALE_TIME,
  });
}

export function useJobsQuery() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.jobService.getAll(),
    staleTime: STALE_TIME,
  });
}

export function useInvoicesQuery() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.invoiceService.getAll(),
    staleTime: STALE_TIME,
  });
}

export function useEmployeesQuery() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employeeService.getAll(),
    staleTime: STALE_TIME,
  });
}

export function useEquipmentQuery() {
  return useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.equipmentService.getAll(),
    staleTime: STALE_TIME,
  });
}

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.dashboardService.getSummary(),
    staleTime: DASHBOARD_STALE_TIME,
  });
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateClients: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    invalidateLeads: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
    invalidateQuotes: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
    invalidateJobs: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    invalidateInvoices: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    invalidateEmployees: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
    invalidateEquipment: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  };
}
