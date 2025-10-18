import React, { useState, useMemo } from 'react';
import { Lead, Customer } from '../types';

interface AddLeadFormProps {
    onSave: (leadData: Partial<Lead>, customerData: Partial<Customer>) => void;
    onCancel: () => void;
}

const AddLeadForm: React.FC<AddLeadFormProps> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        source: 'Website',
        status: 'New' as Lead['status'],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customerData = {
            name: formData.customerName,
            email: formData.customerEmail,
            phone: formData.customerPhone,
        };
        const leadData = {
            source: formData.source,
            status: formData.status,
            createdAt: new Date().toISOString().split('T')[0],
        };
        onSave(leadData, customerData);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">Add New Lead</h2>
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
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                    <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">Save Lead</button>
                </div>
            </form>
        </div>
    );
};

interface LeadsProps {
    leads: Lead[];
    setLeads: (updateFn: (prev: Lead[]) => Lead[]) => void;
    customers: Customer[];
    setCustomers: (updateFn: (prev: Customer[]) => Customer[]) => void;
}

const Leads: React.FC<LeadsProps> = ({ leads, setLeads, setCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const handleSaveLead = (leadData: Partial<Lead>, customerData: Partial<Customer>) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: customerData.name || 'N/A',
      email: customerData.email || 'N/A',
      phone: customerData.phone || 'N/A',
      address: '',
      // FIX: Add missing 'coordinates' property to satisfy the Customer type.
      coordinates: { lat: 0, lng: 0 },
    };
    setCustomers(prev => [newCustomer, ...prev]);

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      customer: newCustomer,
      source: leadData.source || 'N/A',
      status: leadData.status || 'New',
      createdAt: leadData.createdAt || new Date().toISOString().split('T')[0],
    };
    setLeads(prev => [newLead, ...prev]);
    setShowAddForm(false);
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
            onClick={() => setShowAddForm(s => !s)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
            {showAddForm ? 'Cancel' : 'Add Lead'}
          </button>
        </div>
      </div>

      {showAddForm && <AddLeadForm onSave={handleSaveLead} onCancel={() => setShowAddForm(false)} />}
      
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
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200 bg-white">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{lead.customer.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{lead.source}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{lead.status}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{lead.createdAt}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <a href="#" className="text-brand-green-600 hover:text-brand-green-900">Edit</a>
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