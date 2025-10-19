import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, Job, Customer } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

const AddInvoiceForm: React.FC<{
    jobs: Job[];
    customers: Customer[];
    onSave: (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'customerName'>) => void;
    onCancel: () => void;
}> = ({ jobs, customers, onSave, onCancel }) => {
    const completedJobs = jobs.filter(j => j.status === 'Completed');
    const [selectedJobId, setSelectedJobId] = useState<string>(completedJobs.length > 0 ? completedJobs[0].id : '');

    const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);
    const customerName = useMemo(() => customers.find(c => c.id === selectedJob?.customer_id)?.name, [customers, selectedJob]);

    const [formData, setFormData] = useState({
        total_amount: selectedJob?.job_price || 0,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        status: 'Draft' as Invoice['status'],
    });

    useEffect(() => {
        if (selectedJob) {
            setFormData(prev => ({ ...prev, total_amount: selectedJob.job_price || 0 }));
        }
    }, [selectedJob]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJob) {
            alert('Please select a job.');
            return;
        }
        onSave({
            job_id: selectedJob.id,
            customer_id: selectedJob.customer_id,
            ...formData,
            total_amount: Number(formData.total_amount),
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-navy-900 mb-4">Create New Invoice</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3"><label htmlFor="job_id" className="block text-sm font-medium leading-6 text-brand-navy-900">Completed Job</label><select id="job_id" name="job_id" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6">{completedJobs.map(j => <option key={j.id} value={j.id}>{j.id.substring(0,8)}... - {j.customerName}</option>)}</select></div>
                    <div className="sm:col-span-3"><label htmlFor="customerName" className="block text-sm font-medium leading-6 text-brand-navy-900">Customer</label><input type="text" value={customerName || ''} readOnly className="block w-full rounded-md border-0 bg-brand-navy-100 py-1.5 text-brand-navy-500 shadow-sm ring-1 ring-inset ring-brand-navy-300 sm:text-sm" /></div>
                    <div className="sm:col-span-2"><label htmlFor="total_amount" className="block text-sm font-medium leading-6 text-brand-navy-900">Amount ($)</label><input type="number" name="total_amount" id="total_amount" value={formData.total_amount} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm" /></div>
                    <div className="sm:col-span-2"><label htmlFor="issue_date" className="block text-sm font-medium leading-6 text-brand-navy-900">Issue Date</label><input type="date" name="issue_date" id="issue_date" value={formData.issue_date} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm" /></div>
                    <div className="sm:col-span-2"><label htmlFor="due_date" className="block text-sm font-medium leading-6 text-brand-navy-900">Due Date</label><input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm" /></div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6"><button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-navy-900">Cancel</button><button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600">Save Invoice</button></div>
            </form>
        </div>
    );
};

interface InvoicesProps {
  invoices: Invoice[];
  setInvoices: (updateFn: (prev: Invoice[]) => Invoice[]) => void;
  jobs: Job[];
  customers: Customer[];
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, setInvoices, jobs, customers }) => {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSaveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'customerName'>) => {
    if (!session) return;
    const { data, error } = await supabase
        .from('invoices')
        .insert({ ...invoiceData, user_id: session.user.id })
        .select()
        .single();
    
    if (error) {
        alert(error.message);
    } else if (data) {
        const customer = customers.find(c => c.id === data.customer_id);
        setInvoices(prev => [{ ...data, customerName: customer?.name || 'N/A' }, ...prev]);
        setShowAddForm(false);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: Invoice['status']) => {
    const { data, error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId)
        .select()
        .single();
    
    if (error) {
        alert(error.message);
    } else if (data) {
        const customer = customers.find(c => c.id === data.customer_id);
        const updatedInvoice = { ...data, customerName: customer?.name || 'N/A' };
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
    }
  };

  const filteredInvoices = useMemo(() => invoices.filter(invoice =>
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.total_amount.toString().includes(searchTerm) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.due_date.toLowerCase().includes(searchTerm.toLowerCase())
  ), [invoices, searchTerm]);

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
        case 'Paid': return 'bg-green-100 text-green-800';
        case 'Sent': return 'bg-blue-100 text-blue-800';
        case 'Overdue': return 'bg-red-100 text-red-800';
        default: return 'bg-yellow-100 text-yellow-800'; // Draft
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-navy-900">Invoices</h1>
          <p className="mt-2 text-sm text-brand-navy-700">A list of all invoices.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button type="button" onClick={() => setShowAddForm(s => !s)} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">
                {showAddForm ? 'Cancel' : 'Create Invoice'}
            </button>
        </div>
      </div>

      {showAddForm && <AddInvoiceForm jobs={jobs} customers={customers} onSave={handleSaveInvoice} onCancel={() => setShowAddForm(false)} />}

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
          aria-label="Search invoices"
        />
      </div>

      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-brand-navy-300">
                <thead className="bg-brand-navy-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Invoice ID</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Customer</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Amount</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Due Date</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">View</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy-200 bg-white">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{invoice.id.substring(0,8)}...</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{invoice.customerName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">${invoice.total_amount.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">
                        <select value={invoice.status} onChange={(e) => handleStatusChange(invoice.id, e.target.value as Invoice['status'])} className={`rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-medium ${getStatusColor(invoice.status)} focus:ring-2 focus:ring-brand-cyan-500`}>
                            <option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{invoice.due_date}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <a href="#" className="text-brand-cyan-600 hover:text-brand-cyan-900">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices;