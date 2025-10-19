import React, { useState, useMemo } from 'react';
import { Lead, Customer, FollowUpSequence, LeadFollowUp } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';
import { generateFollowUpSequence } from '../services/geminiService';
import SpinnerIcon from '../components/icons/SpinnerIcon';

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
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            notes: formData.notes,
        };
        onSave(leadData, customerData);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-navy-900 mb-4">Add New Lead</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3"><label htmlFor="customerName" className="block text-sm font-medium leading-6 text-brand-navy-900">Customer Name</label><input type="text" name="customerName" id="customerName" value={formData.customerName} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="customerEmail" className="block text-sm font-medium leading-6 text-brand-navy-900">Customer Email</label><input type="email" name="customerEmail" id="customerEmail" value={formData.customerEmail} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="customerPhone" className="block text-sm font-medium leading-6 text-brand-navy-900">Customer Phone</label><input type="tel" name="customerPhone" id="customerPhone" value={formData.customerPhone} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="source" className="block text-sm font-medium leading-6 text-brand-navy-900">Source</label><input type="text" name="source" id="source" value={formData.source} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-navy-900">Status</label><select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6"><option>New</option><option>Contacted</option><option>Qualified</option><option>Lost</option></select></div>
                    <div className="col-span-full"><label htmlFor="notes" className="block text-sm font-medium leading-6 text-brand-navy-900">Notes</label><textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={3} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6"><button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-navy-900">Cancel</button><button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600">Save Lead</button></div>
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
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeFollowUps, setActiveFollowUps] = useState<string[]>([]);
  const [loadingFollowUp, setLoadingFollowUp] = useState<string | null>(null);
  
  const handleSaveLead = async (leadData: Partial<Lead>, customerData: Partial<Customer>) => {
    if (!session) return;

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({ 
        name: customerData.name, 
        email: customerData.email, 
        phone: customerData.phone,
        user_id: session.user.id 
      })
      .select()
      .single();

    if (customerError) {
      alert(`Error creating customer: ${customerError.message}`);
      return;
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        customer_id: customer.id,
        user_id: session.user.id,
        source: leadData.source,
        status: leadData.status,
        notes: leadData.notes,
      })
      .select()
      .single();

    if (leadError) {
      alert(`Error creating lead: ${leadError.message}`);
      return;
    }

    const newCustomer = {
        ...customer,
        address: '',
        coordinates: { lat: 0, lng: 0 }
    };
    setCustomers(prev => [newCustomer, ...prev]);
    setLeads(prev => [{ ...lead, customer: newCustomer }, ...prev]);
    setShowAddForm(false);
  };

  const handleStartFollowUp = async (lead: Lead) => {
    setLoadingFollowUp(lead.id);
    try {
        const sequence = await generateFollowUpSequence(lead);
        
        let confirmationMessage = "AI has generated the following follow-up sequence:\n\n";
        sequence.steps.forEach((step, index) => {
            confirmationMessage += `--- Email ${index + 1} (after ${step.delay_days} days) ---\n`;
            confirmationMessage += `Subject: ${step.subject}\n`;
            confirmationMessage += `Content: ${step.content.substring(0, 100)}...\n\n`;
        });
        confirmationMessage += "Do you want to schedule this sequence?";

        if (window.confirm(confirmationMessage)) {
            const leadCreatedAt = new Date(lead.created_at);
            const followUpRecords = sequence.steps.map((step, index) => {
                const scheduledDate = new Date(leadCreatedAt);
                scheduledDate.setDate(leadCreatedAt.getDate() + step.delay_days);
                return {
                    lead_id: lead.id,
                    user_id: session?.user.id,
                    sequence_type: 'standard_follow_up',
                    step_index: index,
                    subject: step.subject,
                    content: step.content,
                    scheduled_for: scheduledDate.toISOString(),
                    status: 'scheduled'
                };
            });

            const { error } = await supabase.from('lead_follow_ups').insert(followUpRecords);
            if (error) throw error;

            setActiveFollowUps(prev => [...prev, lead.id]);
            alert('Follow-up sequence scheduled successfully!');
        }
    } catch (error: any) {
        alert(`Failed to start follow-up sequence: ${error.message}`);
    } finally {
        setLoadingFollowUp(null);
    }
  };

  const filteredLeads = useMemo(() => leads.filter(lead =>
    (lead.customer?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    lead.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.status.toLowerCase().includes(searchTerm.toLowerCase())
  ), [leads, searchTerm]);

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
        case 'New': return 'bg-blue-100 text-blue-800';
        case 'Contacted': return 'bg-yellow-100 text-yellow-800';
        case 'Qualified': return 'bg-green-100 text-green-800';
        case 'Lost': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center"><div className="sm:flex-auto"><h1 className="text-2xl font-bold text-brand-navy-900">Leads</h1><p className="mt-2 text-sm text-brand-navy-700">A list of all incoming leads.</p></div><div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none"><button type="button" onClick={() => setShowAddForm(s => !s)} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">{showAddForm ? 'Cancel' : 'Add Lead'}</button></div></div>
      {showAddForm && <AddLeadForm onSave={handleSaveLead} onCancel={() => setShowAddForm(false)} />}
      <div className="mt-6"><input type="text" placeholder="Search leads by customer, source, or status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" aria-label="Search leads" /></div>
      <div className="mt-4 flex flex-col"><div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8"><div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8"><div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"><table className="min-w-full divide-y divide-brand-navy-300"><thead className="bg-brand-navy-50"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Customer</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Source</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Status</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Created At</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-brand-navy-200 bg-white">{filteredLeads.map((lead) => (<tr key={lead.id}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{lead.customer?.name}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{lead.source}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(lead.status)}`}>{lead.status}</span></td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{new Date(lead.created_at).toLocaleDateString()}</td><td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">{activeFollowUps.includes(lead.id) ? (<span className="text-sm font-semibold text-green-600">Sequence Active</span>) : (<button onClick={() => handleStartFollowUp(lead)} disabled={loadingFollowUp === lead.id} className="inline-flex items-center text-brand-cyan-600 hover:text-brand-cyan-900 disabled:text-brand-navy-400 disabled:cursor-wait">{loadingFollowUp === lead.id && <SpinnerIcon className="h-4 w-4 mr-2" />}Start AI Follow-up</button>)}</td></tr>))}</tbody></table></div></div></div></div>
    </div>
  );
};

export default Leads;