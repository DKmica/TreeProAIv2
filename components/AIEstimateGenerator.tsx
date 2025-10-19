import React, { useState, useCallback } from 'react';
import { generateAIEstimate } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { AIEstimate, Quote, Customer } from '../types';
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
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers.length > 0 ? customers[0].id : '');

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
            const result = await generateAIEstimate(imagePayloads, description);
            setEstimate(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [images, description]);

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

        const primaryService = estimate.service_estimates[0] || { min_usd: 0, max_usd: 0 };
        const price = (primaryService.min_usd + primaryService.max_usd) / 2;

        const { data, error } = await supabase.from('quotes').insert({
            customer_id: customer.id,
            user_id: session.user.id,
            status: 'Draft',
            total_price: price,
            quote_notes: `AI ASSESSMENT: ${estimate.detailed_assessment}`,
            service_items: estimate.service_estimates.map(s => ({
                desc: `${s.service_name}: ${s.description}`,
                qty: 1,
                unit_price: (s.min_usd + s.max_usd) / 2
            })),
        }).select().single();

        if (error) {
            alert(error.message);
        } else if (data) {
            setQuotes(prev => [{ ...data, customerName: customer.name, total_price: data.total_price }, ...prev]);
            alert(`Draft quote #${data.id} for ${customer.name} created successfully!`);
            setEstimate(null);
            setImages([]);
            setDescription('');
        }
    };

    const getSeverityColor = (severity: 'Low' | 'Medium' | 'High') => {
        switch (severity) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-green-100 text-green-800';
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-brand-navy-900">AI-Powered Visual Quoting</h2>
            <p className="mt-1 text-sm text-brand-navy-600">Upload customer photos and a job description to let Gemini generate a detailed analysis and quote.</p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6"><label htmlFor="job-description" className="block text-sm font-medium text-brand-navy-700">Job Description</label><textarea id="job-description" name="job-description" rows={4} className="mt-1 block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" placeholder="e.g., 'Large oak tree in the backyard, close to the fence...'" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="sm:col-span-6"><label htmlFor="file-upload" className="block text-sm font-medium text-brand-navy-700">Upload Photos</label><div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-brand-navy-300 px-6 pt-5 pb-6"><div className="space-y-1 text-center"><svg className="mx-auto h-12 w-12 text-brand-navy-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="flex text-sm text-brand-navy-600"><label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-brand-cyan-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-cyan-500 focus-within:ring-offset-2 hover:text-brand-cyan-500"><span>Upload files</span><input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/*" /></label><p className="pl-1">or drag and drop</p></div><p className="text-xs text-brand-navy-500">PNG, JPG, GIF up to 10MB</p></div></div>{images.length > 0 && <div className="mt-2 text-sm text-brand-navy-500">{images.length} file(s) selected: {images.map(f => f.name).join(', ')}</div>}</div>
            </div>

            <div className="mt-6">
                <button type="button" onClick={handleGenerate} disabled={isLoading || images.length === 0 || !description} className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 disabled:bg-brand-navy-300">
                    {isLoading ? <SpinnerIcon className="h-5 w-5 mr-2" /> : null}
                    {isLoading ? 'Analyzing...' : 'Generate AI Assessment & Quote'}
                </button>
            </div>

            {isLoading && <p className="text-center mt-4 text-brand-navy-600">AI is analyzing, please wait...</p>}
            {error && <p className="text-center mt-4 text-red-600">{error}</p>}

            {estimate && !isLoading && (
                <div className="mt-8 border-t border-brand-navy-200 pt-6">
                    <h3 className="text-lg font-bold text-brand-navy-900">AI Analysis Results</h3>
                    <div className="mt-4 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-lg bg-gray-50 p-4"><dt className="truncate text-sm font-medium text-gray-500">Tree Species</dt><dd className="mt-1 text-lg font-semibold tracking-tight text-gray-900">{estimate.tree_species}</dd></div>
                            <div className="rounded-lg bg-gray-50 p-4"><dt className="truncate text-sm font-medium text-gray-500">Est. Height</dt><dd className="mt-1 text-lg font-semibold tracking-tight text-gray-900">{estimate.estimated_height_feet} ft</dd></div>
                            <div className="rounded-lg bg-gray-50 p-4"><dt className="truncate text-sm font-medium text-gray-500">Est. Diameter</dt><dd className="mt-1 text-lg font-semibold tracking-tight text-gray-900">{estimate.estimated_diameter_inches} in</dd></div>
                        </div>
                        {/* Detailed Assessment */}
                        <div><h4 className="font-semibold text-brand-navy-800">Detailed Assessment</h4><p className="mt-1 text-sm text-brand-navy-700 bg-gray-50 p-3 rounded-md border">{estimate.detailed_assessment}</p></div>
                        {/* Hazards & Obstacles */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div><h4 className="font-semibold text-brand-navy-800">Identified Hazards</h4><ul className="mt-2 space-y-2">{estimate.hazards.map((h, i) => <li key={i} className="p-2 border rounded-md"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mr-2 ${getSeverityColor(h.severity)}`}>{h.severity}</span><strong>{h.name}:</strong> {h.description}</li>)}</ul></div>
                            <div><h4 className="font-semibold text-brand-navy-800">Site Obstacles</h4><ul className="mt-2 space-y-2">{estimate.obstacles.map((o, i) => <li key={i} className="p-2 border rounded-md"><strong>{o.name}:</strong> {o.description}</li>)}</ul></div>
                        </div>
                        {/* Job Details */}
                        <div><h4 className="font-semibold text-brand-navy-800">Job Details</h4><div className="mt-2 p-4 bg-gray-50 rounded-md border text-sm"><p><strong>Methodology:</strong> {estimate.job_details.methodology}</p><p><strong>Equipment:</strong> {estimate.job_details.equipment_needed.join(', ')}</p><p><strong>Manpower:</strong> {estimate.job_details.manpower_needed}</p><p><strong>Duration:</strong> {estimate.job_details.estimated_duration}</p></div></div>
                        {/* Service Estimates */}
                        <div><h4 className="font-semibold text-brand-navy-800">Service & Cost Estimates</h4><div className="mt-2 space-y-3">{estimate.service_estimates.map((s, i) => <div key={i} className="p-3 border rounded-md"><div className="flex justify-between items-center"><h5 className="font-semibold">{s.service_name}</h5><p className="font-bold text-green-700">${s.min_usd} - ${s.max_usd}</p></div><p className="text-sm text-gray-600">{s.description}</p></div>)}</div></div>
                    </div>
                    <div className="mt-6 border-t pt-4">
                        <label htmlFor="customer-select" className="block text-sm font-medium text-brand-navy-700">Assign to Customer & Save</label>
                        <div className="flex items-center gap-4 mt-1">
                            <select id="customer-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="block w-full rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 sm:text-sm">
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={handleSaveAsQuote} className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 flex-shrink-0">
                                Save as Draft Quote
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIEstimateGenerator;