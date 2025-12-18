import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MaintenanceLog, MaintenanceAdvice } from '../types';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import SpinnerIcon from '../components/icons/SpinnerIcon';
import { generateMaintenanceAdvice } from '../services/geminiService';
import SparklesIcon from '../components/icons/SparklesIcon';
import WrenchScrewdriverIcon from '../components/icons/WrenchScrewdriverIcon';
import { useEquipmentQuery } from '../hooks/useDataQueries';
import * as api from '../services/apiService';

const AddMaintenanceLogForm: React.FC<{ onSave: (log: Omit<MaintenanceLog, 'id'>) => void }> = ({ onSave }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description) {
            alert('Please enter a description.');
            return;
        }
        onSave({ date, description, cost });
        setDescription('');
        setCost(0);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-brand-gray-50 rounded-lg border border-brand-gray-200 mt-4">
            <h4 className="font-semibold text-brand-gray-800 mb-2">Add New Maintenance Log</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm" />
                <input type="text" placeholder="Service description" value={description} onChange={e => setDescription(e.target.value)} required className="md:col-span-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm" />
                <input type="number" placeholder="Cost" value={cost} onChange={e => setCost(parseFloat(e.target.value) || 0)} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm" />
                <button type="submit" className="md:col-start-3 rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700">Save Log</button>
            </div>
        </form>
    );
};

const EquipmentDetail: React.FC = () => {
    const { equipmentId } = useParams<{ equipmentId: string }>();
    const { data: equipment = [], isLoading, refetch } = useEquipmentQuery();
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiAdvice, setAiAdvice] = useState<MaintenanceAdvice | null>(null);
    const [aiError, setAiError] = useState('');

    const item = useMemo(() => equipment.find(e => e.id === equipmentId), [equipment, equipmentId]);

    const handleGetAdvice = async () => {
        if (!item) return;
        setIsGenerating(true);
        setAiError('');
        setAiAdvice(null);
        try {
            const advice = await generateMaintenanceAdvice(item);
            setAiAdvice(advice);
        } catch (err: any) {
            setAiError(err.message || 'Could not fetch AI advice.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveLog = async (log: Omit<MaintenanceLog, 'id'>) => {
        if (!item) return;
        try {
            await api.addMaintenanceLog(item.id, log);
            refetch();
        } catch (error) {
            console.error('Failed to save maintenance log:', error);
            alert('Failed to save maintenance log');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
        );
    }

    if (!item) {
        return <div className="p-8 text-center">Equipment not found.</div>;
    }

    return (
        <div>
            <Link to="/equipment" className="inline-flex items-center text-sm font-semibold text-brand-green-600 hover:text-brand-green-800 mb-4">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Equipment List
            </Link>
            <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-brand-gray-900">{item.name}</h1>
                <p className="text-brand-gray-600">{item.make} {item.model}</p>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-b py-4">
                    <div><dt className="font-medium text-brand-gray-500">Status</dt><dd className="mt-1 text-brand-gray-900 font-semibold">{item.status}</dd></div>
                    <div><dt className="font-medium text-brand-gray-500">Assigned To</dt><dd className="mt-1 text-brand-gray-900">{item.assignedTo || 'N/A'}</dd></div>
                    <div><dt className="font-medium text-brand-gray-500">Purchase Date</dt><dd className="mt-1 text-brand-gray-900">{item.purchaseDate}</dd></div>
                    <div><dt className="font-medium text-brand-gray-500">Last Service</dt><dd className="mt-1 text-brand-gray-900">{item.lastServiceDate}</dd></div>
                </div>

                <div className="mt-6">
                    <h3 className="text-lg font-bold text-brand-gray-800">AI Maintenance Co-pilot</h3>
                    <button onClick={handleGetAdvice} disabled={isGenerating} className="mt-2 inline-flex items-center gap-x-2 rounded-md bg-brand-green-50 px-3.5 py-2.5 text-sm font-semibold text-brand-green-700 shadow-sm hover:bg-brand-green-100 disabled:opacity-50">
                        {isGenerating ? <SpinnerIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
                        {isGenerating ? 'Analyzing...' : 'Get AI Maintenance Advice'}
                    </button>
                    {aiError && <p className="mt-2 text-sm text-red-600">{aiError}</p>}
                    {aiAdvice && (
                        <div className="mt-4 p-4 bg-brand-green-50/50 rounded-lg border border-brand-green-200 animate-fade-in space-y-3">
                            <div>
                                <h4 className="font-semibold text-brand-green-900">Next Service Recommendation:</h4>
                                <p className="text-sm text-brand-green-800">{aiAdvice.next_service_recommendation}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-brand-green-900">Common Issues to Check:</h4>
                                <ul className="list-disc list-inside text-sm text-brand-green-800">
                                    {aiAdvice.common_issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <h3 className="text-lg font-bold text-brand-gray-800 flex items-center"><WrenchScrewdriverIcon className="w-5 h-5 mr-2" />Maintenance History</h3>
                    <div className="mt-4 flow-root">
                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <table className="min-w-full divide-y divide-brand-gray-300">
                                    <thead className="bg-brand-gray-50">
                                        <tr>
                                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-0">Date</th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Description</th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-gray-200 bg-white">
                                        {item.maintenanceHistory && item.maintenanceHistory.length > 0 ? (
                                            item.maintenanceHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                                <tr key={log.id}>
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-0">{log.date}</td>
                                                    <td className="px-3 py-4 text-sm text-brand-gray-500">{log.description}</td>
                                                    <td className="px-3 py-4 text-sm text-brand-gray-500">${log.cost.toFixed(2)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="text-center py-6 text-sm text-brand-gray-500">No maintenance history recorded.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <AddMaintenanceLogForm onSave={handleSaveLog} />
                </div>
            </div>
        </div>
    );
};

export default EquipmentDetail;
