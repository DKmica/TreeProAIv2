import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment } from '../../types';

export const useAppData = () => {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  const fetchData = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    };

    setLoading(true);
    setError(null);

    try {
      const [
        { data: customersData, error: customersError },
        { data: leadsData, error: leadsError },
        { data: quotesData, error: quotesError },
        { data: jobsData, error: jobsError },
        { data: invoicesData, error: invoicesError },
        { data: employeesData, error: employeesError },
        { data: equipmentData, error: equipmentError },
      ] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('jobs').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('equipment').select('*'),
      ]);

      if (customersError) throw new Error(`Customers: ${customersError.message}`);
      if (leadsError) throw new Error(`Leads: ${leadsError.message}`);
      if (quotesError) throw new Error(`Quotes: ${quotesError.message}`);
      if (jobsError) throw new Error(`Jobs: ${jobsError.message}`);
      if (invoicesError) throw new Error(`Invoices: ${invoicesError.message}`);
      if (employeesError) throw new Error(`Employees: ${employeesError.message}`);
      if (equipmentError) throw new Error(`Equipment: ${equipmentError.message}`);

      const customerMap = new Map(customersData?.map(c => [c.id, c]));

      const processedCustomers = customersData?.map(c => ({
        ...c,
        address: [c.street, c.city, c.state, c.zip_code].filter(Boolean).join(', '),
        coordinates: { lat: 0, lng: 0 } // Placeholder for map
      })) || [];
      setCustomers(processedCustomers);

      const processedLeads = leadsData?.map(l => ({
        ...l,
        customer: customerMap.get(l.customer_id)
      })) || [];
      setLeads(processedLeads);

      const processedQuotes = quotesData?.map(q => ({
        ...q,
        customerName: customerMap.get(q.customer_id)?.name || 'N/A',
      })) || [];
      setQuotes(processedQuotes);

      const processedJobs = jobsData?.map(j => ({
        ...j,
        customerName: customerMap.get(j.customer_id)?.name || 'N/A',
      })) || [];
      setJobs(processedJobs);

      const processedInvoices = invoicesData?.map(i => ({
        ...i,
        customerName: customerMap.get(i.customer_id)?.name || 'N/A',
      })) || [];
      setInvoices(processedInvoices);

      const processedEmployees = employeesData?.map(e => ({
        ...e,
        address: '', // Placeholder
        coordinates: { lat: 0, lng: 0 } // Placeholder for map
      })) || [];
      setEmployees(processedEmployees);

      setEquipment(equipmentData || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    error,
    customers, setCustomers,
    leads, setLeads,
    quotes, setQuotes,
    jobs, setJobs,
    invoices, setInvoices,
    employees, setEmployees,
    equipment, setEquipment,
  };
};