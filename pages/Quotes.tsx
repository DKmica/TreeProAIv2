import React, { useState, useMemo } from 'react';
import { Quote, Customer } from '../types';
import AIEstimateGenerator from '../components/AIEstimateGenerator';

interface AddQuoteFormProps {
    customers: Customer[];
    onSave: (quote: Omit<Quote, 'id' | 'leadId'>) => void;
    onCancel: () => void;
}

const AddQuoteForm: React.FC<AddQuoteFormProps> = ({ customers, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        customerName: customers.length > 0 ? customers[0].name : '',
        amount: '',
        status: 'Draft' as Quote['status'],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            amount: parseFloat(formData.amount) || 0,
            createdAt: new Date().toISOString().split('T')[0]
        });
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-navy-900 mb-4">Create New Quote</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="customerName" className="block text-sm font-medium leading-6 text-brand-navy-900">Customer</label>
                        <select 
                            id="customerName" 
                            name="customerName" 
                            value={formData.customerName} 
                            onChange={handleChange} 
                            className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6"
                            aria-label="Select a customer"
                        >
                             {customers.length === 0 && <option disabled>No customers available</option>}
                            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                     <div className="sm:col-span-3">
                        <label htmlFor="amount" className="block text-sm font-medium leading-6 text-brand-navy-900">Amount ($)</label>
                        <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-navy-900">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6">
                            <option>Draft</option>
                            <option>Sent</option>
                            <option>Accepted</option>
                            <option>Declined</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-navy-900">Cancel</button>
                    <button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600">Save Quote</button>
                </div>
            </form>
        </div>
    );
};

interface QuotesProps {
    quotes: Quote[];
    setQuotes: (updateFn: (prev: Quote[]) => Quote[]) => void;
    customers: Customer[];
}

const Quotes: React.FC<QuotesProps> = ({ quotes, setQuotes, customers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    
    const handleSaveQuote = (newQuoteData: Omit<Quote, 'id' | 'leadId'>) => {
        const newQuote: Quote = {
            id: `quote-${Date.now()}`,
            leadId: '',
            ...newQuoteData
        };
        setQuotes(prev => [newQuote, ...prev]);
        setShowAddForm(false);
    };

    const filteredQuotes = useMemo(() => quotes.filter(q =>
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.amount.toString().includes(searchTerm)
    ), [quotes, searchTerm]);

    const getStatusColor = (status: Quote['status']) => {
        switch (status) {
            case 'Accepted': return 'bg-green-100 text-green-800';
            case 'Sent': return 'bg-blue-100 text-blue-800';
            case 'Declined': return 'bg-red-100 text-red-800';
            default: return 'bg-brand-navy-100 text-brand-navy-800';
        }
    }

    return (
        <div>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-brand-navy-900">Quotes</h1>
                    <p className="mt-2 text-sm text-brand-navy-700">A list of all quotes sent to customers.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                     <button 
                        type="button" 
                        onClick={() => setShowAddForm(s => !s)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">
                        {showAddForm ? 'Cancel' : 'Create Quote'}
                    </button>
                </div>
            </div>

            {showAddForm && <AddQuoteForm customers={customers} onSave={handleSaveQuote} onCancel={() => setShowAddForm(false)} />}
            
            <div className="mt-6">
                <input
                    type="text"
                    placeholder="Search by customer, status, or amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                    aria-label="Search quotes"
                />
            </div>

            <div className="mt-4 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-brand-navy-300">
                                <thead className="bg-brand-navy-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Quote ID</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Customer</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Amount</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Status</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-navy-200 bg-white">
                                    {filteredQuotes.map((quote) => (
                                        <tr key={quote.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{quote.id}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{quote.customerName}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">${quote.amount.toFixed(2)}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(quote.status)}`}>
                                                    {quote.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{quote.createdAt}</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <a href="#" className="text-brand-cyan-600 hover:text-brand-cyan-900">Edit</a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 border-t border-brand-navy-200 pt-8">
                <AIEstimateGenerator customers={customers} setQuotes={setQuotes} />
            </div>
        </div>
    );
};

export default Quotes;