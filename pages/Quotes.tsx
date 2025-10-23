import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Quote, Customer, LineItem, AITreeEstimate } from '../types';

// Helper to calculate total
const calculateQuoteTotal = (lineItems: LineItem[], stumpGrindingPrice: number): number => {
    const itemsTotal = lineItems.reduce((sum, item) => item.selected ? sum + item.price : sum, 0);
    return itemsTotal + stumpGrindingPrice;
};

interface AddQuoteFormProps {
    customers: Customer[];
    onSave: (quote: Omit<Quote, 'id' | 'leadId'>) => void;
    onCancel: () => void;
    initialData?: Partial<Omit<Quote, 'id'| 'leadId'>>;
}

const AddQuoteForm: React.FC<AddQuoteFormProps> = ({ customers, onSave, onCancel, initialData }) => {
    const [customerName, setCustomerName] = useState(initialData?.customerName || (customers.length > 0 ? customers[0].name : ''));
    const [status, setStatus] = useState<Quote['status']>(initialData?.status || 'Draft');
    const [lineItems, setLineItems] = useState<LineItem[]>(initialData?.lineItems || [{ description: '', price: 0, selected: true }]);
    const [stumpGrindingPrice, setStumpGrindingPrice] = useState(initialData?.stumpGrindingPrice || 0);
    
    const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number | boolean) => {
        const updatedItems = [...lineItems];
        (updatedItems[index] as any)[field] = value;
        setLineItems(updatedItems);
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { description: '', price: 0, selected: true }]);
    };
    
    const removeLineItem = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            customerName,
            status,
            lineItems,
            stumpGrindingPrice,
            createdAt: new Date().toISOString().split('T')[0]
        });
    };

    const totalAmount = useMemo(() => calculateQuoteTotal(lineItems, stumpGrindingPrice), [lineItems, stumpGrindingPrice]);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">Create New Quote</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="customerName" className="block text-sm font-medium leading-6 text-brand-gray-900">Customer</label>
                        <select id="customerName" name="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                             {customers.length === 0 && <option disabled>No customers available</option>}
                            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-gray-900">Status</label>
                        <select id="status" name="status" value={status} onChange={e => setStatus(e.target.value as Quote['status'])} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                            <option>Draft</option>
                            <option>Sent</option>
                            <option>Accepted</option>
                            <option>Declined</option>
                        </select>
                    </div>
                </div>

                <div>
                    <h3 className="text-md font-semibold text-brand-gray-800">Line Items</h3>
                     <div className="mt-2 space-y-4">
                        {lineItems.map((item, index) => (
                             <div key={index} className="flex items-center space-x-2 p-2 bg-brand-gray-50 rounded-md">
                                <input type="checkbox" checked={item.selected} onChange={e => handleLineItemChange(index, 'selected', e.target.checked)} className="h-4 w-4 rounded border-brand-gray-300 text-brand-green-600 focus:ring-brand-green-600"/>
                                <input type="text" placeholder="Service description" value={item.description} onChange={e => handleLineItemChange(index, 'description', e.target.value)} className="flex-grow rounded-md border-0 py-1 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 sm:text-sm" />
                                <input type="number" placeholder="Price" value={item.price} onChange={e => handleLineItemChange(index, 'price', parseFloat(e.target.value) || 0)} className="w-28 rounded-md border-0 py-1 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 sm:text-sm" />
                                <button type="button" onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                </button>
                             </div>
                        ))}
                    </div>
                    <button type="button" onClick={addLineItem} className="mt-2 text-sm font-semibold text-brand-green-600 hover:text-brand-green-800">+ Add Line Item</button>
                </div>
                
                 <div>
                    <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input id="stumpGrinding" type="checkbox" checked={stumpGrindingPrice > 0} onChange={e => setStumpGrindingPrice(e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border-brand-gray-300 text-brand-green-600 focus:ring-brand-green-600" />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="stumpGrinding" className="font-medium text-brand-gray-900">Stump Grinding</label>
                        </div>
                        {stumpGrindingPrice > 0 && <input type="number" value={stumpGrindingPrice} onChange={e => setStumpGrindingPrice(parseFloat(e.target.value) || 0)} className="ml-4 w-28 rounded-md border-0 py-1 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 sm:text-sm" />}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                    <h3 className="text-lg font-bold text-brand-gray-900">Total: ${totalAmount.toFixed(2)}</h3>
                     <div className="flex items-center justify-end gap-x-6">
                        <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                        <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">Save Quote</button>
                    </div>
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
    const [initialFormData, setInitialFormData] = useState<Partial<Omit<Quote, 'id' | 'leadId'>> | undefined>(undefined);
    const location = useLocation();

    useEffect(() => {
        const aiEstimate = location.state?.aiEstimate as AITreeEstimate | undefined;
        if (aiEstimate) {
            const transformedLineItems: LineItem[] = aiEstimate.suggested_services.map(service => ({
                description: service.service_name,
                price: Math.round((service.price_range.min + service.price_range.max) / 2),
                selected: true
            }));
            
            setInitialFormData({
                lineItems: transformedLineItems,
                stumpGrindingPrice: 0,
            });
            setShowAddForm(true);
            // Clear location state to prevent re-triggering
            window.history.replaceState({}, document.title)
        }
    }, [location.state]);
    
    const handleSaveQuote = (newQuoteData: Omit<Quote, 'id' | 'leadId'>) => {
        const newQuote: Quote = {
            id: `quote-${Date.now()}`,
            leadId: '',
            ...newQuoteData
        };
        setQuotes(prev => [newQuote, ...prev]);
        setShowAddForm(false);
        setInitialFormData(undefined);
    };

    const filteredQuotes = useMemo(() => quotes.filter(q =>
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.status.toLowerCase().includes(searchTerm.toLowerCase())
    ), [quotes, searchTerm]);

    const getStatusColor = (status: Quote['status']) => {
        switch (status) {
            case 'Accepted': return 'bg-green-100 text-green-800';
            case 'Sent': return 'bg-blue-100 text-blue-800';
            case 'Declined': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    return (
        <div>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-brand-gray-900">Quotes</h1>
                    <p className="mt-2 text-sm text-brand-gray-700">A list of all quotes sent to customers.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                     <button 
                        type="button" 
                        onClick={() => { setShowAddForm(s => !s); setInitialFormData(undefined); }}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
                        {showAddForm ? 'Cancel' : 'Create Quote'}
                    </button>
                </div>
            </div>

            {showAddForm && <AddQuoteForm customers={customers} onSave={handleSaveQuote} onCancel={() => {setShowAddForm(false); setInitialFormData(undefined);}} initialData={initialFormData} />}
            
            <div className="mt-6">
                <input
                    type="text"
                    placeholder="Search by customer or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    aria-label="Search quotes"
                />
            </div>

            <div className="mt-4 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-brand-gray-300">
                                <thead className="bg-brand-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Quote ID</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Customer</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Amount</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Status</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-200 bg-white">
                                    {filteredQuotes.map((quote) => {
                                        const total = calculateQuoteTotal(quote.lineItems, quote.stumpGrindingPrice);
                                        return (
                                        <tr key={quote.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{quote.id}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{quote.customerName}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">${total.toFixed(2)}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(quote.status)}`}>
                                                    {quote.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{quote.createdAt}</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <a href="#" className="text-brand-green-600 hover:text-brand-green-900">Edit</a>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Quotes;