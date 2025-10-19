import React, { useState, useMemo } from 'react';
import { Invoice, Job, Customer } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

const CreateInvoiceModal: React.FC<{
    jobs: Job[];
    onSave: (invoiceData: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'customerName' | 'status'>) => void;
    onClose: () => void;
}> = ({ jobs, onSave, onClose }) => {
    const completdJobsWithoutInvoice = jobs.filter(j => j.status === 'Completed'); // In a real app, you'd check if an invoice already exists
    const [jobId, setJobId] = useState(completdJobsWithoutInvoice[0]?.id || '');

    const handleSubmit = () => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        onSave({
            job_id: job.id,
            customer_id: job.customer_id,
            total_amount: job.job_price || 0,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
        });
    };

    return (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                    <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 text-left shadow-xl transition-all">
                        <h3 className="text-lg font-semibold leading-6 text-brand-navy-900" id="modal-title">Create New Invoice</h3>
                        <div className="mt-4">
                            <label htmlFor="job-select" className="block text-sm font-medium text-brand-navy-700">Select Completed Job</label>
                            <select
                                id="job-select"
                                value={jobId}
                                onChange={e => setJobId(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500 sm:text-sm"
                            >
                                {completdJobsWithoutInvoice.length === 0 && <option disabled>No completed jobs to invoice</option>}
                                {completdJobsWithoutInvoice.map(job => (
                                    <option key={job.id} value={job.id}>{job.customerName} - Job #{job.id.substring(0,8)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={onClose} type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSubmit} type="button" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 disabled:bg-gray-300" disabled={!jobId}>Create Invoice</button>
                        </div>
                    </div>
                </div>
            </div>
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
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSaveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'customerName' | 'status'>) => {
    if (!session) return;
    const { data, error } = await supabase
        .from('invoices')
        .insert({ ...invoiceData, user_id: session.user.id, status: 'Draft' })
        .select()
        .single();
    
    if (error) {
        alert(error.message);
    } else if (data) {
        const customer = customers.find(c => c.id === data.customer_id);
        setInvoices(prev => [{ ...data, customerName: customer?.name || 'N/A' }, ...prev]);
        setShowCreateModal(false);
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
            <button type="button" onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">
                Create Invoice
            </button>
        </div>
      </div>

      {showCreateModal && <CreateInvoiceModal jobs={jobs} onSave={handleSaveInvoice} onClose={() => setShowCreateModal(false)} />}

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