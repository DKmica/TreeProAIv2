import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, Quote, Customer, Invoice, Employee } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';
import SpinnerIcon from '../components/icons/SpinnerIcon';

const JobForm: React.FC<{
    quotes: Quote[];
    customers: Customer[];
    employees: Employee[];
    onSave: (job: Partial<Job>) => void;
    onCancel: () => void;
    initialData?: Job | null;
}> = ({ quotes, customers, employees, onSave, onCancel, initialData }) => {
    const availableQuotes = quotes.filter(q => q.status === 'Accepted');
    
    const [formData, setFormData] = useState({
        id: initialData?.id || undefined,
        quote_id: initialData?.quote_id || (availableQuotes.length > 0 ? availableQuotes[0].id : ''),
        customer_id: initialData?.customer_id || (availableQuotes.length > 0 ? availableQuotes[0].customer_id : ''),
        date: initialData?.date || '',
        status: initialData?.status || ('Unscheduled' as Job['status']),
        assigned_crew: initialData?.assigned_crew || [],
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id,
                quote_id: initialData.quote_id || '',
                customer_id: initialData.customer_id,
                date: initialData.date || '',
                status: initialData.status,
                assigned_crew: initialData.assigned_crew || [],
            });
        }
    }, [initialData]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'quote_id') {
            const selectedQuote = quotes.find(q => q.id === value);
            setFormData(prev => ({
                ...prev,
                quote_id: selectedQuote ? selectedQuote.id : '',
                customer_id: selectedQuote ? selectedQuote.customer_id : '',
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value as any }));
        }
    };
    
    const handleCrewChange = (employeeId: string) => {
        setFormData(prev => ({
            ...prev,
            assigned_crew: prev.assigned_crew?.includes(employeeId)
                ? prev.assigned_crew.filter(id => id !== employeeId)
                : [...(prev.assigned_crew || []), employeeId]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.quote_id) {
            alert("Please select an accepted quote.");
            return;
        }
        onSave(formData);
    };

    const customerName = useMemo(() => {
        return customers.find(c => c.id === formData.customer_id)?.name || 'N/A';
    }, [formData.customer_id, customers]);

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-navy-900 mb-4">{initialData ? 'Edit Job' : 'Create New Job'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3"><label htmlFor="quote_id" className="block text-sm font-medium leading-6 text-brand-navy-900">Accepted Quote</label><select id="quote_id" name="quote_id" value={formData.quote_id} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6">{availableQuotes.length === 0 && <option disabled>No accepted quotes available</option>}{availableQuotes.map(quote => (<option key={quote.id} value={quote.id}>{`${quote.id.substring(0,8)} - ${quote.customerName}`}</option>))}</select></div>
                    <div className="sm:col-span-3"><label htmlFor="customerName" className="block text-sm font-medium leading-6 text-brand-navy-900">Customer</label><input type="text" name="customerName" id="customerName" value={customerName} readOnly className="block w-full rounded-md border-0 py-1.5 bg-brand-navy-100 text-brand-navy-500 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-0 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="date" className="block text-sm font-medium leading-6 text-brand-navy-900">Scheduled Date</label><input type="date" name="date" id="date" value={formData.date} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-navy-900">Status</label><select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6"><option>Unscheduled</option><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></div>
                    <div className="col-span-full"><label className="block text-sm font-medium leading-6 text-brand-navy-900">Assign Crew</label><div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-md border p-4">{employees.map(emp => (<div key={emp.id} className="relative flex items-start"><div className="flex h-6 items-center"><input id={`emp-form-${emp.id}`} type="checkbox" checked={formData.assigned_crew?.includes(emp.id)} onChange={() => handleCrewChange(emp.id)} className="h-4 w-4 rounded border-brand-navy-300 text-brand-cyan-600 focus:ring-brand-cyan-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor={`emp-form-${emp.id}`} className="font-medium text-brand-navy-900">{emp.name}</label></div></div>))}</div></div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6"><button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-navy-900">Cancel</button><button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600">Save Job</button></div>
            </form>
        </div>
    );
};

const JobDetailModal: React.FC<{
    job: Job;
    employees: Employee[];
    onClose: () => void;
    onCreateInvoice: () => void;
    onSendOMW: (jobId: string, employeeId: string, eta: number) => void;
}> = ({ job, employees, onClose, onCreateInvoice, onSendOMW }) => {
    const [showOMWModal, setShowOMWModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<string>(job.assigned_crew?.[0] || '');
    const [eta, setEta] = useState(30);

    const assignedCrewMembers = useMemo(() => 
        employees.filter(emp => job.assigned_crew?.includes(emp.id)), 
    [employees, job.assigned_crew]);

    const handleSendOMW = () => {
        if (!selectedEmployee) {
            alert('Please select a crew member.');
            return;
        }
        onSendOMW(job.id, selectedEmployee, eta);
        setShowOMWModal(false);
    };

    return (
        <>
            <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                            <div>
                                <h3 className="text-lg font-semibold leading-6 text-brand-navy-900" id="modal-title">Job Details</h3>
                                <div className="mt-2">
                                    <dl className="divide-y divide-gray-200">
                                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-brand-navy-500">Job ID</dt><dd className="mt-1 text-sm text-brand-navy-900 sm:col-span-2 sm:mt-0">{job.id}</dd></div>
                                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-brand-navy-500">Customer</dt><dd className="mt-1 text-sm text-brand-navy-900 sm:col-span-2 sm:mt-0">{job.customerName}</dd></div>
                                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-brand-navy-500">Status</dt><dd className="mt-1 text-sm text-brand-navy-900 sm:col-span-2 sm:mt-0">{job.status}</dd></div>
                                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-brand-navy-500">Scheduled Date</dt><dd className="mt-1 text-sm text-brand-navy-900 sm:col-span-2 sm:mt-0">{job.date || 'Not scheduled'}</dd></div>
                                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-brand-navy-500">Assigned Crew</dt><dd className="mt-1 text-sm text-brand-navy-900 sm:col-span-2 sm:mt-0">{assignedCrewMembers.map(e => e.name).join(', ') || 'None'}</dd></div>
                                    </dl>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-3 sm:gap-3">
                                <button type="button" onClick={() => setShowOMWModal(true)} className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-1">On My Way</button>
                                {job.status === 'Completed' && <button type="button" onClick={onCreateInvoice} className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600 sm:col-start-2">Create Invoice</button>}
                                <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-navy-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-3 sm:mt-0">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showOMWModal && (
                 <div className="relative z-20" aria-labelledby="omw-modal-title" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg font-semibold leading-6 text-brand-navy-900" id="omw-modal-title">Send "On My Way" Notification</h3>
                                    <div className="mt-4 space-y-4">
                                        <div><label htmlFor="crew_leader" className="block text-sm font-medium text-brand-navy-700">Crew Leader</label><select id="crew_leader" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm">{assignedCrewMembers.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div>
                                        <div><label htmlFor="eta" className="block text-sm font-medium text-brand-navy-700">ETA (in minutes)</label><input type="number" id="eta" value={eta} onChange={e => setEta(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" /></div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    <button type="button" onClick={handleSendOMW} className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto">Send Notification</button>
                                    <button type="button" onClick={() => setShowOMWModal(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </>
    );
};

interface JobsProps {
  jobs: Job[];
  setJobs: (updateFn: (prev: Job[]) => Job[]) => void;
  quotes: Quote[];
  customers: Customer[];
  invoices: Invoice[];
  setInvoices: (updateFn: (prev: Invoice[]) => Invoice[]) => void;
  employees: Employee[];
}

const Jobs: React.FC<JobsProps> = ({ jobs, setJobs, quotes, customers, invoices, setInvoices, employees }) => {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  const handleSaveJob = async (jobData: Partial<Job>) => {
    if (!session) return;

    const { id, ...jobDetails } = jobData;

    const action = id
      ? supabase.from('jobs').update(jobDetails).eq('id', id)
      : supabase.from('jobs').insert({ ...jobDetails, user_id: session.user.id });

    const { data, error } = await action.select().single();

    if (error) {
      alert(error.message);
    } else if (data) {
      const customer = customers.find(c => c.id === data.customer_id);
      const processedJob = { ...data, customerName: customer?.name || 'N/A' };

      if (id) {
        setJobs(prev => prev.map(j => (j.id === data.id ? processedJob : j)));
      } else {
        setJobs(prev => [processedJob, ...prev]);
      }
      setShowAddForm(false);
      setEditingJob(null);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedJob || !session) return;
    if (invoices.some(inv => inv.job_id === selectedJob.id)) {
        alert('An invoice for this job already exists.');
        return;
    }
    const quote = quotes.find(q => q.id === selectedJob.quote_id);
    if (!quote) {
        alert('Associated quote not found.');
        return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        job_id: selectedJob.id,
        customer_id: selectedJob.customer_id,
        user_id: session.user.id,
        status: 'Draft',
        total_amount: quote.total_price,
        due_date: dueDate.toISOString().split('T')[0],
        issue_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else if (data) {
      const customer = customers.find(c => c.id === data.customer_id);
      setInvoices(prev => [{ ...data, customerName: customer?.name || 'N/A' }, ...prev]);
      alert(`Invoice ${data.id} created successfully!`);
      setSelectedJob(null);
      navigate('/invoices');
    }
  };

  const handleSendOMW = async (jobId: string, employeeId: string, eta: number) => {
    setIsSending(true);
    try {
        const { data, error } = await supabase.functions.invoke('send-omw-sms', {
            body: { job_id: jobId, employee_id: employeeId, eta_minutes: eta },
        });
        if (error) throw error;
        alert(data.message || 'Notification sent successfully!');
    } catch (err: any) {
        alert(`Error sending notification: ${err.message}`);
    } finally {
        setIsSending(false);
        setSelectedJob(null);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: Job['status']) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', jobId)
      .select()
      .single();
    
    if (error) {
      alert(error.message);
    } else if (data) {
      const customer = customers.find(c => c.id === data.customer_id);
      const updatedJob = { ...data, customerName: customer?.name || 'N/A' };
      setJobs(prevJobs => prevJobs.map(j => (j.id === jobId ? updatedJob : j)));
    }
  };

  const filteredJobs = useMemo(() => jobs.filter(job =>
    (job.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.date || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [jobs, searchTerm]);

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
        case 'Completed': return 'bg-green-100 text-green-800';
        case 'Scheduled': return 'bg-blue-100 text-blue-800';
        case 'In Progress': return 'bg-yellow-100 text-yellow-800';
        case 'Cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-brand-navy-100 text-brand-navy-800'; // Unscheduled
    }
  }

  return (
    <div>
        {isSending && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <SpinnerIcon className="h-12 w-12 text-white" />
            </div>
        )}
        <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
                <h1 className="text-2xl font-bold text-brand-navy-900">Jobs</h1>
                <p className="mt-2 text-sm text-brand-navy-700">A list of all jobs.</p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <button type="button" onClick={() => { setEditingJob(null); setShowAddForm(s => !s); }} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">
                    {showAddForm || editingJob ? 'Cancel' : 'Create Job'}
                </button>
            </div>
        </div>

        {(showAddForm || editingJob) && (
            <JobForm 
                quotes={quotes} 
                customers={customers} 
                employees={employees}
                onSave={handleSaveJob} 
                onCancel={() => { setShowAddForm(false); setEditingJob(null); }}
                initialData={editingJob}
            />
        )}

        <div className="mt-6">
            <input type="text" placeholder="Search by customer, status, or date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" aria-label="Search jobs" />
        </div>

        <div className="mt-4 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full divide-y divide-brand-navy-300">
                            <thead className="bg-brand-navy-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Job ID</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Customer</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Date</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Status</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-navy-200 bg-white">
                                {filteredJobs.map((job) => (
                                    <tr key={job.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{job.id.substring(0,8)}...</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{job.customerName}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{job.date || 'N/A'}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">
                                            <select value={job.status} onChange={(e) => handleStatusChange(job.id, e.target.value as Job['status'])} className={`rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-medium ${getStatusColor(job.status)} focus:ring-2 focus:ring-brand-cyan-500`}>
                                                <option>Unscheduled</option><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                                            <button onClick={() => setSelectedJob(job)} className="text-brand-cyan-600 hover:text-brand-cyan-900">View</button>
                                            <button onClick={() => { setEditingJob(job); setShowAddForm(true); }} className="text-brand-cyan-600 hover:text-brand-cyan-900">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        {selectedJob && <JobDetailModal job={selectedJob} employees={employees} onClose={() => setSelectedJob(null)} onCreateInvoice={handleCreateInvoice} onSendOMW={handleSendOMW} />}
    </div>
  )
};

export default Jobs;