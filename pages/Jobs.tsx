import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, Quote, Customer, Invoice, Employee, LineItem } from '../types';


// Helper to calculate total
const calculateQuoteTotal = (lineItems: LineItem[], stumpGrindingPrice: number): number => {
    const itemsTotal = lineItems.reduce((sum, item) => item.selected ? sum + item.price : sum, 0);
    return itemsTotal + (stumpGrindingPrice || 0);
};

// Common form component for adding and editing jobs
const JobForm: React.FC<{
    quotes: Quote[];
    employees: Employee[];
    onSave: (job: Job | Omit<Job, 'id'>) => void;
    onCancel: () => void;
    initialData?: Job;
}> = ({ quotes, employees, onSave, onCancel, initialData }) => {
    const availableQuotes = quotes.filter(q => q.status === 'Accepted'); 
    
    const [formData, setFormData] = useState({
        id: initialData?.id || '',
        quoteId: initialData?.quoteId || (availableQuotes.length > 0 ? availableQuotes[0].id : ''),
        customerName: initialData?.customerName || (availableQuotes.length > 0 ? availableQuotes[0].customerName : ''),
        scheduledDate: initialData?.scheduledDate || '',
        status: initialData?.status || ('Unscheduled' as Job['status']),
        assignedCrew: initialData?.assignedCrew || [],
        stumpGrindingPrice: initialData?.stumpGrindingPrice || 0,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id,
                quoteId: initialData.quoteId,
                customerName: initialData.customerName,
                scheduledDate: initialData.scheduledDate,
                status: initialData.status,
                assignedCrew: initialData.assignedCrew,
                stumpGrindingPrice: initialData.stumpGrindingPrice || 0,
            });
        } else {
            const defaultQuote = availableQuotes.length > 0 ? availableQuotes[0] : null;
            setFormData({
                id: '',
                quoteId: defaultQuote?.id || '',
                customerName: defaultQuote?.customerName || '',
                scheduledDate: '',
                status: 'Unscheduled',
                assignedCrew: [],
                stumpGrindingPrice: defaultQuote?.stumpGrindingPrice || 0,
            });
        }
    }, [initialData, quotes]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'quoteId') {
            const selectedQuote = quotes.find(q => q.id === value);
            setFormData(prev => ({
                ...prev,
                quoteId: selectedQuote ? selectedQuote.id : '',
                customerName: selectedQuote ? selectedQuote.customerName : '',
                stumpGrindingPrice: selectedQuote ? selectedQuote.stumpGrindingPrice : 0,
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
                        <label htmlFor="quoteId" className="block text-sm font-medium leading-6 text-brand-gray-900">Accepted Quote</label>
                        <select id="quoteId" name="quoteId" value={formData.quoteId} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                            {availableQuotes.length === 0 && <option disabled>No accepted quotes available</option>}
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
                     <div className="sm:col-span-3">
                        <label htmlFor="stumpGrindingPrice" className="block text-sm font-medium leading-6 text-brand-gray-900">Stump Grinding Price</label>
                        <input type="number" name="stumpGrindingPrice" id="stumpGrindingPrice" value={formData.stumpGrindingPrice} onChange={e => setFormData(prev => ({...prev, stumpGrindingPrice: parseFloat(e.target.value) || 0 }))} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
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

interface JobsProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  quotes: Quote[];
  customers: Customer[];
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  employees: Employee[];
}

const Jobs: React.FC<JobsProps> = ({ jobs, setJobs, quotes, invoices, setInvoices, employees }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const navigate = useNavigate();

  const handleCancel = () => {
    setShowForm(false);
    setEditingJob(null);
  };
  
  const handleMainButtonClick = () => {
      if (showForm) {
          handleCancel();
      } else {
          setEditingJob(null);
          setShowForm(true);
      }
  };

  const handleEditClick = (job: Job) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleArchiveJob = (jobId: string) => {
      if(window.confirm('Are you sure you want to archive this job?')) {
          setJobs(prev => prev.filter(j => j.id !== jobId));
      }
  };

  const handleSave = (jobData: Job | Omit<Job, 'id'>) => {
      if ('id' in jobData && jobData.id) { // Editing
          setJobs(prev => prev.map(j => j.id === jobData.id ? jobData as Job : j));
      } else { // Creating
          const newJob: Job = { id: `job-${Date.now()}`, ...jobData as Omit<Job, 'id'>};
          setJobs(prev => [newJob, ...prev]);
      }
      handleCancel();
  };

  const handleCreateInvoice = (job: Job) => {
    const quote = quotes.find(q => q.id === job.quoteId);
    if (!quote) {
        alert('Associated quote not found.');
        return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      jobId: job.id,
      customerName: job.customerName,
      status: 'Draft',
      amount: calculateQuoteTotal(quote.lineItems, quote.stumpGrindingPrice || 0),
      // FIX: Add missing `lineItems` property to satisfy the Invoice type.
      lineItems: quote.lineItems,
      dueDate: dueDate.toISOString().split('T')[0],
    };
    setInvoices(prev => [newInvoice, ...prev]);
    alert(`Invoice ${newInvoice.id} created successfully!`);
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
          <button type="button" onClick={handleMainButtonClick} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
              {showForm ? 'Cancel' : 'Create Job'}
          </button>
        </div>
      </div>
      
      {showForm && <JobForm quotes={quotes} employees={employees} onSave={handleSave} onCancel={handleCancel} initialData={editingJob || undefined} />}
      
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
                  {filteredJobs.map((job) => {
                      const isInvoiceCreated = invoices.some(inv => inv.jobId === job.id);
                      const canCreateInvoice = !isInvoiceCreated && job.status === 'Completed';
                      return (
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
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                            <button 
                                type="button" 
                                onClick={() => handleCreateInvoice(job)}
                                disabled={!canCreateInvoice}
                                title={isInvoiceCreated ? "Invoice already exists" : job.status !== 'Completed' ? "Job must be completed" : "Create Invoice"}
                                className="rounded bg-brand-green-50 px-2 py-1 text-xs font-semibold text-brand-green-600 shadow-sm hover:bg-brand-green-100 disabled:bg-brand-gray-100 disabled:text-brand-gray-400 disabled:cursor-not-allowed">
                                Invoice
                            </button>
                            <button onClick={() => handleEditClick(job)} className="text-brand-green-600 hover:text-brand-green-900">Edit</button>
                            <button onClick={() => handleArchiveJob(job.id)} className="text-red-600 hover:text-red-900">Archive</button>
                          </td>
                        </tr>
                      )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Jobs;