import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateEstimate } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { AIEstimate, Quote, Customer } from '../types';
import SpinnerIcon from '../components/icons/SpinnerIcon';

const AiQuoteGenerator: React.FC = () => {
    const [images, setImages] = useState<File[]>([]);
    const [description, setDescription] = useState('');
    const [estimate, setEstimate] = useState<AIEstimate | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingText, setLoadingText] = useState('');

    const loadingMessages = useMemo(() => [
        'Analyzing images for tree type and size...',
        'Assessing job complexity and accessibility...',
        'Checking for proximity to structures or power lines...',
        'Calculating labor and equipment requirements...',
        'Compiling line items for the quote...',
        'Finalizing estimate details...'
    ], []);

    useEffect(() => {
        // Fix: Use ReturnType<typeof setInterval> for browser compatibility instead of NodeJS.Timeout.
        let textInterval: ReturnType<typeof setInterval> | null = null;
        if (isLoading) {
            let messageIndex = 0;
            setLoadingText(loadingMessages[messageIndex]);
            textInterval = setInterval(() => {
                messageIndex = (messageIndex + 1) % loadingMessages.length;
                setLoadingText(loadingMessages[messageIndex]);
            }, 2500);
        }

        return () => {
            if (textInterval) {
                clearInterval(textInterval);
            }
        };
    }, [isLoading, loadingMessages]);


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImages(Array.from(e.target.files));
        }
    };

    const handleGenerate = useCallback(async () => {
        if (images.length === 0 || !description) {
            setError("Please upload at least one image and provide a description.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setEstimate(null);

        try {
            const imagePayloads = await Promise.all(
                images.map(async (file) => ({
                    mimeType: file.type,
                    data: await fileToBase64(file),
                }))
            );

            const result = await generateEstimate(imagePayloads, description);
            setEstimate(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [images, description]);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-brand-navy-900">AI-Powered Quote Estimator</h2>
            <p className="mt-1 text-sm text-brand-navy-600">Upload customer photos and a job description to let Gemini generate an initial estimate.</p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                    <label htmlFor="job-description" className="block text-sm font-medium text-brand-navy-700">
                        Job Description
                    </label>
                    <div className="mt-1">
                        <textarea
                            id="job-description"
                            name="job-description"
                            rows={4}
                            className="block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm"
                            placeholder="e.g., 'Large oak tree in the backyard, close to the fence. Needs to be removed completely and stump ground down.'"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <div className="sm:col-span-6">
                    <label htmlFor="file-upload" className="block text-sm font-medium text-brand-navy-700">
                        Upload Photos
                    </label>
                    <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-brand-navy-300 px-6 pt-5 pb-6">
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-brand-navy-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-brand-navy-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-brand-cyan-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-cyan-500 focus-within:ring-offset-2 hover:text-brand-cyan-500">
                                    <span>Upload files</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/*" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-brand-navy-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                    </div>
                     {images.length > 0 && (
                        <div className="mt-2 text-sm text-brand-navy-500">
                            {images.length} file(s) selected: {images.map(f => f.name).join(', ')}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6">
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading || images.length === 0 || !description}
                    className="inline-flex w-full justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-navy-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? <SpinnerIcon className="h-5 w-5 mr-2" /> : null}
                    {isLoading ? 'Generating...' : 'Generate Estimate with AI'}
                </button>
            </div>
            
            {isLoading && (
                <div className="mt-6 p-4 rounded-lg bg-brand-navy-50 border border-brand-navy-200">
                    <div className="flex justify-center items-center space-x-2">
                        <div className="w-2.5 h-2.5 bg-brand-cyan-500 rounded-full animate-pulse"></div>
                        <div className="w-2.5 h-2.5 bg-brand-cyan-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2.5 h-2.5 bg-brand-cyan-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                    <p className="mt-3 text-center text-sm font-medium text-brand-navy-700 transition-opacity duration-500">
                        {loadingText}
                    </p>
                </div>
            )}
            
            {error && !isLoading && <div className="mt-4 rounded-md bg-red-50 p-4"><p className="text-sm font-medium text-red-800">{error}</p></div>}
            
            {estimate && !isLoading && (
                <div className="mt-8 border-t border-brand-navy-200 pt-6">
                    <h3 className="text-lg font-medium leading-6 text-brand-navy-900">AI Generated Estimate</h3>
                    <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-brand-navy-500">Price Range</dt>
                            <dd className="mt-1 text-2xl font-semibold text-brand-cyan-700">${estimate.estimated_price_range[0]} - ${estimate.estimated_price_range[1]}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-brand-navy-500">Confidence</dt>
                            <dd className="mt-1 text-lg text-brand-navy-900">{(estimate.confidence * 100).toFixed(0)}%</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-brand-navy-500">Difficulty</dt>
                            <dd className="mt-1 text-lg text-brand-navy-900">{estimate.difficulty}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-brand-navy-500">Rationale</dt>
                            <dd className="mt-1 text-sm text-brand-navy-900">{estimate.rationale}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-brand-navy-500">Suggested Line Items</dt>
                            <dd className="mt-1">
                                <ul className="divide-y divide-brand-navy-200 rounded-md border border-brand-navy-200">
                                    {estimate.line_items.map((item, index) => (
                                        <li key={index} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm">
                                            <div className="flex w-0 flex-1 items-center">
                                                <span className="ml-2 w-0 flex-1 truncate">{item.desc}</span>
                                            </div>
                                            <div className="ml-4 flex-shrink-0">
                                                <span>{item.qty} x ${item.unit_price.toFixed(2)} = </span>
                                                <span className="font-medium">${(item.qty * item.unit_price).toFixed(2)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

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
                <AiQuoteGenerator />
            </div>
        </div>
    );
};

export default Quotes;