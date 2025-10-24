import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Lead, Customer } from '../types';
import * as api from '../services/apiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';


interface AddLeadFormProps {
    onSave: (leadData: Partial<Lead>, customerData: Partial<Customer>) => Promise<void>;
    onCancel: () => void;
    initialData?: Lead | null;
}

const AddLeadForm: React.FC<AddLeadFormProps> = ({ onSave, onCancel, initialData }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        source: 'Website',
        status: 'New' as Lead['status'],
        description: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                customerName: initialData.customer.name,
                customerEmail: initialData.customer.email,
                customerPhone: initialData.customer.phone,
                source: initialData.source,
                status: initialData.status,
                description: initialData.description || '',
            });
        } else {
            // Reset for new entry
            setFormData({
                customerName: '',
                customerEmail: '',
                customerPhone: '',
                source: 'Website',
                status: 'New' as Lead['status'],
                description: '',
            });
        }
    }, [initialData]);

    const isEditing = !!initialData;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const customerData = {
            name: formData.customerName,
            email: formData.customerEmail,
            phone: formData.customerPhone,
        };
        const leadData = {
            source: formData.source,
            status: formData.status,
            description: formData.description,
            createdAt: new Date().toISOString().split('T')[0],
        };
        try {
            await onSave(leadData, customerData);
        } catch (error) {
            console.error("Failed to save lead:", error);
            alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">{isEditing ? 'Edit Lead' : 'Add New Lead'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="customerName" className="block text-sm font-medium leading-6 text-brand-gray-900">Customer Name</label>
                        <input type="text" name="customerName" id="customerName" value={formData.customerName} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="customerEmail" className="block text-sm font-medium leading-6 text-brand-gray-900">Customer Email</label>
                        <input type="email" name="customerEmail" id="customerEmail" value={formData.customerEmail} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="customerPhone" className="block text-sm font-medium leading-6 text-brand-gray-900">Customer Phone</label>
                        <input type="tel" name="customerPhone" id="customerPhone" value={formData.customerPhone} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="source" className="block text-sm font-medium leading-6 text-brand-gray-900">Source</label>
                        <input type="text" name="source" id="source" value={formData.source} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                     <div className="sm:col-span-3">
                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-gray-900">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                            <option>New</option>
                            <option>Contacted</option>
                            <option>Qualified</option>
                            <option>Lost</option>
                        </select>
                    </div>
                     <div className="col-span-full">
                        <label htmlFor="description" className="block text-sm font-medium leading-6 text-brand-gray-900">Description</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex items-center justify-center rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600 disabled:bg-brand-gray-400">
                        {isSaving && <SpinnerIcon className="h-5 w-5 mr-2" />}
                        {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Lead')}
                    </button>
                </div>
            </form>
        </div>
    );
};


interface LeadsProps {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const Leads: React.FC<LeadsProps> = ({ leads, setLeads, customers, setCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openCreateForm) {
        setEditingLead(null);
        setShowAddForm(true);
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);


  const handleEditClick = (lead: Lead) => {
      setEditingLead(lead);
      setShowAddForm(true);
  };
  
  const handleCancel = () => {
      setShowAddForm(false);
      setEditingLead(null);
  };
  
  const handleMainButtonClick = () => {
      if (showAddForm) {
          handleCancel();
      } else {
          setEditingLead(null);
          setShowAddForm(true);
      }
  };

  const handleArchiveLead = async (leadId: string) => {
    if (window.confirm('Are you sure you want to archive this lead?')) {
      try {
        await api.leadService.remove(leadId);
        setLeads(prev => prev.filter(lead => lead.id !== leadId));
      } catch (error) {
         console.error("Failed to archive lead:", error);
         alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
      }
    }
  };
  
  const handleSaveLead = async (leadData: Partial<Lead>, customerData: Partial<Customer>) => {
    if (editingLead) {
        // Update logic
        const updatedCustomerData = { 
            name: customerData.name, 
            email: customerData.email,
            phone: customerData.phone
        };
        const updatedCustomer = await api.customerService.update(editingLead.customer.id, updatedCustomerData);
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));

        const updatedLeadData = {
            source: leadData.source,
            status: leadData.status,
            description: leadData.description,
            customer: updatedCustomer // Embed the updated customer
        };
        const updatedLead = await api.leadService.update(editingLead.id, updatedLeadData);
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));

    } else {
        // Create new logic
        let customer = customers.find(c => c.email.toLowerCase() === customerData.email?.toLowerCase());
        if (!customer) {
            customer = await api.customerService.create({
                name: customerData.name || 'N/A',
                email: customerData.email || 'N/A',
                phone: customerData.phone || '',
                address: '',
                coordinates: {lat: 0, lng: 0}
            });
            setCustomers(prev => [customer!, ...prev]);
        }

        const newLeadData = {
            ...leadData,
            customer: customer
        } as Omit<Lead, 'id'>;

        const newLead = await api.leadService.create(newLeadData);
        setLeads(prev => [newLead, ...prev]);
    }
    
    handleCancel();
  };

  const filteredLeads = useMemo(() => leads.filter(lead =>
    lead.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.status.toLowerCase().includes(searchTerm.toLowerCase())
  ), [leads, searchTerm]);

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-gray-900">Leads</h1>
          <p className="mt-2 text-sm text-brand-gray-700">A list of all incoming leads.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button 
            type="button" 
            onClick={handleMainButtonClick}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
            {showAddForm ? 'Cancel' : 'Add Lead'}
          </button>
        </div>
      </div>

      {showAddForm && <AddLeadForm onSave={handleSaveLead} onCancel={handleCancel} initialData={editingLead} />}
      
      <div className="mt-6">
        <input
          type="text"
          placeholder="Search leads by customer, source, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
          aria-label="Search leads"
        />
      </div>

      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-brand-gray-300">
                <thead className="bg-brand-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Customer</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Source</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Created At</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200 bg-white">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="font-medium text-brand-gray-900">{lead.customer.name}</div>
                        <div className="text-brand-gray-500">{lead.customer.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{lead.source}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{lead.status}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{lead.createdAt}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => handleEditClick(lead)} className="text-brand-green-600 hover:text-brand-green-900">Edit</button>
                        <button onClick={() => handleArchiveLead(lead.id)} className="ml-4 text-red-600 hover:text-red-900">Archive</button>
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

export default Leads;
