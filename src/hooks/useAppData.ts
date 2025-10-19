import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment, Certification, TimeOffRequest, JobCostingSummary } from '../../types';

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
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [jobCosting, setJobCosting] = useState<JobCostingSummary[]>([]);

  const fetchData = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    };

    setLoading(true);
    setError(null);

    try {
      const [
        customersRes,
        leadsRes,
        quotesRes,
        jobsRes,
        invoicesRes,
        employeesRes,
        equipmentRes,
        certificationsRes,
        timeOffRes,
        jobCostingRes,
      ] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('jobs').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('equipment').select('*'),
        supabase.from('certifications').select('*'),
        supabase.from('time_off_requests').select('*'),
        supabase.from('job_costing_summary').select('*'),
      ]);

      if (customersRes.error) throw new Error(`Customers: ${customersRes.error.message}`);
      if (leadsRes.error) throw new Error(`Leads: ${leadsRes.error.message}`);
      if (quotesRes.error) throw new Error(`Quotes: ${quotesRes.error.message}`);
      if (jobsRes.error) throw new Error(`Jobs: ${jobsRes.error.message}`);
      if (invoicesRes.error) throw new Error(`Invoices: ${invoicesRes.error.message}`);
      if (employeesRes.error) throw new Error(`Employees: ${employeesRes.error.message}`);
      if (equipmentRes.error) throw new Error(`Equipment: ${equipmentRes.error.message}`);
      if (certificationsRes.error) throw new Error(`Certifications: ${certificationsRes.error.message}`);
      if (timeOffRes.error) throw new Error(`Time Off Requests: ${timeOffRes.error.message}`);
      if (jobCostingRes.error) throw new Error(`Job Costing: ${jobCostingRes.error.message}`);

      const customersData = customersRes.data || [];
      const customerMap = new Map(customersData.map(c => [c.id, c]));

      setCustomers(customersData.map(c => ({
        ...c,
        address: [c.street, c.city, c.state, c.zip_code].filter(Boolean).join(', '),
        coordinates: { lat: c.lat || 0, lng: c.lng || 0 }
      })));
      
      setLeads((leadsRes.data || []).map(l => ({ ...l, customer: customerMap.get(l.customer_id) })));
      setQuotes((quotesRes.data || []).map(q => ({ ...q, customerName: customerMap.get(q.customer_id)?.name || 'N/A' })));
      setJobs((jobsRes.data || []).map(j => ({ ...j, customerName: customerMap.get(j.customer_id)?.name || 'N/A' })));
      setInvoices((invoicesRes.data || []).map(i => ({ ...i, customerName: customerMap.get(i.customer_id)?.name || 'N/A' })));
      setEmployees((employeesRes.data || []).map(e => ({ ...e, address: '', coordinates: { lat: 0, lng: 0 } })));
      setEquipment(equipmentRes.data || []);
      setCertifications(certificationsRes.data || []);
      setTimeOffRequests(timeOffRes.data || []);
      setJobCosting(jobCostingRes.data || []);

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
    certifications,
    timeOffRequests,
    jobCosting,
  };
};