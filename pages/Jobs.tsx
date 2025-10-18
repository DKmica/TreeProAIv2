import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, Quote, Customer, Invoice, Employee } from '../types';

// Common form component for adding and editing jobs
const JobForm: React.FC<{
    quotes: Quote[];
    employees: Employee[];
    onSave: (job: Job | Omit<Job, 'id'>) => void;
    onCancel: () => void;
    initialData?: Job;
}> = ({ quotes, employees, onSave, onCancel, initialData }) => {
    const availableQuotes = quotes; 
    
    const [formData, setFormData] = useState({
        id: initialData?.id || '',
        quoteId: initialData?.quoteId || (availableQuotes.length > 0 ? availableQuotes[0].id : ''),
        customerName: initialData?.customerName || (availableQuotes.length > 0 ? availableQuotes[0].customerName : ''),
        scheduledDate: initialData?.scheduledDate || '',
        status: initialData?.status || ('Unscheduled' as Job['status']),
        assignedCrew: initialData?.assignedCrew || [],
    });

    useEffect(() => {
        // If initialData is provided, it's an edit form.
        if (initialData) {
            setFormData({
                id: initialData.id,
                quoteId: initialData.quoteId,
                customerName: initialData.customerName,
                scheduledDate: initialData.scheduledDate,
                status: initialData.status,
                assignedCrew: initialData.assignedCrew,
            });
        }
    }, [initialData]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'quoteId') {
            const selectedQuote = quotes.find(q => q.id === value);
            setFormData(prev => ({
                ...prev,
                quoteId: selectedQuote ? selectedQuote.id : '',
                customerName: selectedQuote ? selectedQuote.customerName : '',
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value as any }));
        }
    };
    
    const handleCrewChange = (employeeId: string) => {
        setFormData(prev => ({
            ...prev,
            assignedCrew: prev.assignedCrew.includes(employeeId)
                ? prev.assignedCrew.filter(id => id !== employeeId)
                : [...prev.assignedCrew, employeeId]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.quoteId) {
            alert("Please select a quote.");
            return;
        }
        onSave(formData);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">{initialData ? 'Edit Job' : 'Create New Job'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="quoteId" className="block text-sm font-medium leading-6 text-brand-gray-900">Quote</label>
                        <select id="quoteId" name="quoteId" value={formData.quoteId} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                            {availableQuotes.length === 0 && <option disabled>No quotes available</option>}
                            {availableQuotes.map(quote => (<option key={quote.id} value={quote.id}>{`${quote.id} - ${quote.customerName}`}</option>))}
                        </select>
                    </div>
                     <div className="sm:col-span-3">
                         <label htmlFor="customerName" className="block text-sm font-medium leading-6 text-brand-gray-900">Customer</label>
                         <input type="text" name="customerName" id="customerName" value={formData.customerName} readOnly className="block w-full rounded-md border-0 py-1.5 bg-brand-gray-100 text-brand-gray-500 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-0 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="scheduledDate" className="block text-sm font-medium leading-6 text-brand-gray-900">Scheduled Date</label>
                        <input type="date" name="scheduledDate" id="scheduledDate" value={formData.scheduledDate} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-gray-900">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                            <option>Unscheduled</option>
                            <option>Scheduled</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Cancelled</option>
                        </select>
                    </div>
                    <div className="col-span-full">
                        <label className="block text-sm font-medium leading-6 text-brand-gray-900">Assign Crew</label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-md border p-4">
                            {employees.map(emp => (
                                <div key={emp.id} className="relative flex items-start">
                                    <div className="flex h-6 items-center">
                                        <input
                                            id={`emp-form-${emp.id}`}
                                            type="checkbox"
                                            checked={formData.assignedCrew.includes(emp.id)}
                                            onChange={() => handleCrewChange(emp.id)}
                                            className="h-4 w-4 rounded border-brand-gray-300 text-brand-green-600 focus:ring-brand-green-600"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm leading-6">
                                        <label htmlFor={`emp-form-${emp.id}`} className="font-medium text-brand-gray-900">{emp.name}</label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                    <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">Save Job</button>
                </div>
            </form>
        </div>
    );
};

const JobDetailModal: React.FC<{
  job: Job;
  quote?: Quote;
  customer?: Customer;
  employees: Employee[];
  onCreateInvoice: () => void;
  onEdit: () => void;
  onClose: () => void;
}> = ({ job, quote, customer, employees, onCreateInvoice, onEdit, onClose }) => {
    const assignedCrewMembers = useMemo(() => 
        employees.filter(e => job.assignedCrew.includes(e.id)),
    [employees, job.assignedCrew]);

  return (
    <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
      
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-green-100 sm:mx-0 sm:h-10 sm:w-10">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-brand-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg font-semibold leading-6 text-brand-gray-900" id="modal-title">Job Details - {job.id}</h3>
                  <div className="mt-4 space-y-6">
                    <div>
                      <h4 className="font-medium text-brand-gray-800 border-b pb-1 mb-2">Job Information</h4>
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Status</dt><dd className="mt-1 text-sm text-brand-gray-900">{job.status}</dd></div>
                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Scheduled Date</dt><dd className="mt-1 text-sm text-brand-gray-900">{job.scheduledDate || 'Not Scheduled'}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-sm font-medium text-brand-gray-500">Assigned Crew</dt><dd className="mt-1 text-sm text-brand-gray-900">{assignedCrewMembers.map(e => e.name).join(', ') || 'N/A'}</dd></div>
                      </dl>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-brand-gray-800 border-b pb-1 mb-2">Customer Information</h4>
                        {customer ? (
                          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Name</dt><dd className="mt-1 text-sm text-brand-gray-900">{customer.name}</dd></div>
                            <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Email</dt><dd className="mt-1 text-sm text-brand-gray-900">{customer.email}</dd></div>
                            <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Phone</dt><dd className="mt-1 text-sm text-brand-gray-900">{customer.phone}</dd></div>
                            <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Address</dt><dd className="mt-1 text-sm text-brand-gray-900"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`} target="_blank" rel="noopener noreferrer" className="text-brand-green-600 hover:text-brand-green-900 hover:underline">{customer.address}</a></dd></div>
                          </dl>
                        ) : (
                          <dd className="mt-1 text-sm text-brand-gray-900">Customer not found.</dd>
                        )}
                    </div>

                    {quote && (
                    <div>
                      <h4 className="font-medium text-brand-gray-800 border-b pb-1 mb-2">Associated Quote</h4>
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Quote ID</dt><dd className="mt-1 text-sm text-brand-gray-900">{quote.id}</dd></div>
                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Amount</dt><dd className="mt-1 text-sm text-brand-gray-900">${quote.amount.toFixed(2)}</dd></div>
                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Status</dt><dd className="mt-1 text-sm text-brand-gray-900">{quote.status}</dd></div>
                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Created At</dt><dd className="mt-1 text-sm text-brand-gray-900">{quote.createdAt}</dd></div>
                      </dl>
                    </div>)}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-brand-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button type="button" onClick={onCreateInvoice} className="inline-flex w-full justify-center rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 sm:ml-3 sm:w-auto">Create Invoice</button>
              <button type="button" onClick={onEdit} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 sm:mt-0 sm:w-auto">Edit Job</button>
              <button type="button" onClick={onClose} className="mt-3 mr-auto inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 sm:mt-0 sm:w-auto">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const navigate = useNavigate();

  const handleSaveJob = (newJobData: Omit<Job, 'id'>) => {
    const newJob: Job = { id: `job${jobs.length + 1}-${Date.now()}`, ...newJobData };
    setJobs(prev => [newJob, ...prev]);
    setShowAddForm(false);
  };

  const handleUpdateJob = (updatedJobData: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJobData.id ? updatedJobData : j));
    setEditingJob(null);
  };

  const handleViewJob = (job: Job) => setSelectedJob(job);
  const handleCloseModal = () => setSelectedJob(null);
  const handleEditJob = () => {
    if (selectedJob) {
      setEditingJob(selectedJob);
      setSelectedJob(null);
    }
  };

  const selectedQuote = useMemo(() => selectedJob ? quotes.find(q => q.id === selectedJob.quoteId) : undefined, [selectedJob, quotes]);
  const selectedCustomer = useMemo(() => selectedJob ? customers.find(c => c.name === selectedJob.customerName) : undefined, [selectedJob, customers]);

  const handleCreateInvoice = () => {
    if (!selectedJob || !selectedQuote) return;
    if (invoices.some(inv => inv.jobId === selectedJob.id)) {
        alert('An invoice for this job already exists.');
        return;
    }
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      jobId: selectedJob.id,
      customerName: selectedJob.customerName,
      status: 'Draft',
      amount: selectedQuote.amount,
      dueDate: dueDate.toISOString().split('T')[0],
    };
    setInvoices(prev => [newInvoice, ...prev]);
    alert(`Invoice ${newInvoice.id} created successfully!`);
    handleCloseModal();
    navigate('/invoices');
  };

  const handleStatusChange = (jobId: string, newStatus: Job['status']) => {
    setJobs(prevJobs => prevJobs.map(j => (j.id === jobId ? { ...j, status: newStatus } : j)));
  };

  const filteredJobs = useMemo(() => jobs.filter(job =>
    Object.values(job).some(value => value.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  ), [jobs, searchTerm]);

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-gray-900">Jobs</h1>
          <p className="mt-2 text-sm text-brand-gray-700">A list of all scheduled and active jobs.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button type="button" onClick={() => { setShowAddForm(true); setEditingJob(null); }} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">Create Job</button>
        </div>
      </div>
      
      {(showAddForm && !editingJob) && <JobForm quotes={quotes} employees={employees} onSave={handleSaveJob} onCancel={() => setShowAddForm(false)} />}
      {editingJob && <JobForm quotes={quotes} employees={employees} onSave={handleUpdateJob as any} onCancel={() => setEditingJob(null)} initialData={editingJob} />}
      
      <div className="mt-6">
        <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm" aria-label="Search jobs" />
      </div>

      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-brand-gray-300">
                <thead className="bg-brand-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Job ID</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Customer</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Scheduled Date</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200 bg-white">
                  {filteredJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{job.id}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{job.customerName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                         <select value={job.status} onChange={(e) => handleStatusChange(job.id, e.target.value as Job['status'])} className="block w-full rounded-md border-0 py-1 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                            <option>Unscheduled</option>
                            <option>Scheduled</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Cancelled</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{job.scheduledDate || 'N/A'}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => handleViewJob(job)} className="text-brand-green-600 hover:text-brand-green-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedJob && (<JobDetailModal job={selectedJob} quote={selectedQuote} customer={selectedCustomer} employees={employees} onCreateInvoice={handleCreateInvoice} onEdit={handleEditJob} onClose={handleCloseModal} />)}
    </div>
  );
};

export default Jobs;