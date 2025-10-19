import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateEstimate } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { AIEstimate, Quote, Customer, LineItem } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

interface AIEstimateGeneratorProps {
    customers: Customer[];
    setQuotes: (updateFn: (prev: Quote[]) => Quote[]) => void;
}

const AIEstimateGenerator: React.FC<AIEstimateGeneratorProps> = ({ customers, setQuotes }) => {
    const { session } = useSession();
    const [images, setImages] = useState<File[]>([]);
    const [description, setDescription] = useState('');
    const [estimate, setEstimate] = useState<AIEstimate | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingText, setLoadingText] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers.length > 0 ? customers[0].id : '');
    const [editableLineItems, setEditableLineItems] = useState<LineItem[]>([]);

    useEffect(() => {
        if (customers.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(customers[0].id);
        }
    }, [customers, selectedCustomerId]);

    useEffect(() => {
        if (estimate) {
            setEditableLineItems(estimate.line_items);
        }
    }, [estimate]);

    const loadingMessages = useMemo(() => [
        'Analyzing images for tree type and size...',
        'Assessing job complexity and accessibility...',
        'Checking for proximity to structures or power lines...',
        'Calculating labor and equipment requirements...',
        'Compiling line items for the quote...',
        'Finalizing estimate details...'
    ], []);

    useEffect(() => {
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
            if (textInterval) clearInterval(textInterval);
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

    const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
        const updatedItems = [...editableLineItems];
        const itemToUpdate = { ...updatedItems[index] };
        
        if (field === 'desc') {
            itemToUpdate[field] = value as string;
        } else {
            itemToUpdate[field] = Number(value) || 0;
        }
        
        updatedItems[index] = itemToUpdate;
        setEditableLineItems(updatedItems);
    };

    const handleAddItem = () => {
        setEditableLineItems([...editableLineItems, { desc: '', qty: 1, unit_price: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setEditableLineItems(editableLineItems.filter((_, i) => i !== index));
    };

    const totalPrice = useMemo(() => {
        return editableLineItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
    }, [editableLineItems]);

    const handleSaveAsQuote = async () => {
        if (!estimate || !selectedCustomerId || !session) {
            alert("Cannot save quote. Missing estimate data, customer selection, or session.");
            return;
        }
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) {
            alert("Selected customer not found.");
            return;
        }

        const { data, error } = await supabase
            .from('quotes')
            .insert({
                customer_id: customer.id,
                user_id: session.user.id,
                status: 'Draft',
                total_price: totalPrice,
                quote_notes: `AI Rationale: ${estimate.rationale}`,
                service_items: editableLineItems,
            })
            .select()
            .single();

        if (error) {
            alert(error.message);
        } else if (data) {
            setQuotes(prev => [{ ...data, customerName: customer.name, amount: data.total_price }, ...prev]);
            alert(`Draft quote #${data.id} for ${customer.name} created successfully!`);
            setEstimate(null);
            setImages([]);
            setDescription('');
            setEditableLineItems([]);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-brand-navy-900">AI-Powered Quote Estimator</h2>
            <p className="mt-1 text-sm text-brand-navy-600">Upload customer photos and a job description to let Gemini generate an initial estimate.</p>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6"><label htmlFor="job-description" className="block text-sm font-medium text-brand-navy-700">Job Description</label><textarea id="job-description" name="job-description" rows={4} className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" placeholder="e.g., 'Large oak tree in the backyard, close to the fence...'" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="sm:col-span-6"><label htmlFor="file-upload" className="block text-sm font-medium text-brand-navy-700">Upload Photos</label><div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-brand-navy-300 px-6 pt-5 pb-6"><div className="space-y-1 text-center"><svg className="mx-auto h-12 w-12 text-brand-navy-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="flex text-sm text-brand-navy-600"><label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-brand-cyan-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-cyan-500 focus-within:ring-offset-2 hover:text-brand-cyan-500"><span>Upload files</span><input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/*" /></label><p className="pl-1">or drag and drop</p></div><p className="text-xs text-brand-navy-500">PNG, JPG, GIF up to 10MB</p></div></div>{images.length > 0 && <div className="mt-2 text-sm text-brand-navy-500">{images.length} file(s) selected: {images.map(f => f.name).join(', ')}</div>}</div>
            </div>
            <div className="mt-6"><button type="button" onClick={handleGenerate} disabled={isLoading || images.length === 0 || !description} className="inline-flex w-full justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-navy-300 disabled:cursor-not-allowed">{isLoading ? <SpinnerIcon className="h-5 w-5 mr-2" /> : null}{isLoading ? 'Generating...' : 'Generate Estimate with AI'}</button></div>
            {isLoading && <div className="mt-6 p-4 rounded-lg bg-brand-navy-50 border border-brand-navy-200"><div className="flex justify-center items-center space-x-2"><div className="w-2.5 h-2.5 bg-brand-cyan-500 rounded-full animate-pulse"></div><div className="w-2.5 h-2.5 bg-brand-cyan-500 rounded-full animate-pulse [animation-delay:0.2s]"></div><div className="w-2.5 h-2.5 bg-brand-cyan-500 rounded-full animate-pulse [animation-delay:0.4s]"></div></div><p className="mt-3 text-center text-sm font-medium text-brand-navy-700 transition-opacity duration-500">{loadingText}</p></div>}
            {error && !isLoading && <div className="mt-4 rounded-md bg-red-50 p-4"><p className="text-sm font-medium text-red-800">{error}</p></div>}
            
            {estimate && !isLoading && (
                <div className="mt-8 border-t border-brand-navy-200 pt-6">
                    <h3 className="text-lg font-bold leading-6 text-brand-navy-900">AI-Powered Assessment</h3>
                    <div className="mt-4 space-y-4 rounded-lg border border-brand-navy-200 bg-brand-navy-50 p-4">
                        <div>
                            <h4 className="font-semibold text-brand-navy-800">Species Identification</h4>
                            <p className="text-sm text-brand-navy-700">{estimate.species_identification}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-brand-navy-800">Size Estimation</h4>
                            <p className="text-sm text-brand-navy-700">{estimate.size_estimation}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-brand-navy-800">Health & Risk Assessment</h4>
                            <p className="text-sm text-brand-navy-700">{estimate.health_and_risk_assessment}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-brand-navy-800">Identified Obstacles & Hazards</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {estimate.identified_obstacles.map((obstacle, index) => (
                                    <span key={index} className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">{obstacle}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-bold leading-6 text-brand-navy-900">Suggested Services & Pricing</h3>
                        <p className="mt-1 text-sm text-brand-navy-600">Review and edit the AI's suggestions below before saving the quote.</p>
                        <div className="mt-4 overflow-x-auto rounded-md border">
                            <table className="min-w-full divide-y divide-brand-navy-200">
                                <thead className="bg-brand-navy-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-brand-navy-500 uppercase tracking-wider">Description</th>
                                        <th className="w-20 px-3 py-2 text-left text-xs font-medium text-brand-navy-500 uppercase tracking-wider">Qty</th>
                                        <th className="w-28 px-3 py-2 text-left text-xs font-medium text-brand-navy-500 uppercase tracking-wider">Unit Price</th>
                                        <th className="w-28 px-3 py-2 text-left text-xs font-medium text-brand-navy-500 uppercase tracking-wider">Total</th>
                                        <th className="w-12 relative px-3 py-2"><span className="sr-only">Remove</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-brand-navy-200">
                                    {editableLineItems.map((item, index) => (
                                        <tr key={index}>
                                            <td><input type="text" value={item.desc} onChange={(e) => handleItemChange(index, 'desc', e.target.value)} className="w-full border-0 border-b border-transparent focus:border-brand-cyan-500 focus:ring-0 sm:text-sm" /></td>
                                            <td><input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full border-0 border-b border-transparent focus:border-brand-cyan-500 focus:ring-0 sm:text-sm" /></td>
                                            <td><input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full border-0 border-b border-transparent focus:border-brand-cyan-500 focus:ring-0 sm:text-sm" /></td>
                                            <td className="px-3 py-2 text-sm text-brand-navy-900">${(item.qty * item.unit_price).toFixed(2)}</td>
                                            <td><button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1">X</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-brand-navy-50">
                                        <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-brand-navy-900">Total</td>
                                        <td className="px-3 py-2 text-sm font-bold text-brand-navy-900">${totalPrice.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <button type="button" onClick={handleAddItem} className="mt-2 rounded-md bg-brand-navy-100 px-3 py-1.5 text-sm font-semibold text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 hover:bg-brand-navy-200">+ Add Item</button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-brand-navy-200 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <label htmlFor="customer-select" className="block text-sm font-medium text-brand-navy-700">Assign to Customer</label>
                            <select id="customer-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="mt-1 block w-full sm:w-64 rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm">
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="mt-4 sm:mt-0">
                            <button type="button" onClick={handleSaveAsQuote} className="inline-flex w-full justify-center items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">Save as Draft Quote</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIEstimateGenerator;