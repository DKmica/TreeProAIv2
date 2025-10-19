import React, { useState, useMemo } from 'react';
import { Equipment as EquipmentType, MaintenanceHistory } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

const MaintenanceHistoryModal: React.FC<{
    equipment: EquipmentType;
    history: MaintenanceHistory[];
    onClose: () => void;
}> = ({ equipment, history, onClose }) => {
    return (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                        <h3 className="text-lg font-semibold leading-6 text-brand-navy-900" id="modal-title">
                            Maintenance History for {equipment.name}
                        </h3>
                        <div className="mt-4">
                            <ul className="divide-y divide-gray-200">
                                {history.map(item => (
                                    <li key={item.id} className="py-3">
                                        <p className="text-sm font-medium text-brand-navy-800">{new Date(item.service_date).toLocaleDateString()} - Cost: ${item.cost?.toFixed(2) || 'N/A'}</p>
                                        <p className="text-sm text-brand-navy-600">{item.description}</p>
                                        {item.parts_used && <p className="text-xs text-brand-navy-500">Parts: {item.parts_used.join(', ')}</p>}
                                    </li>
                                ))}
                                {history.length === 0 && <p className="text-sm text-center text-brand-navy-500 py-4">No maintenance history recorded.</p>}
                            </ul>
                        </div>
                        <div className="mt-5 sm:mt-6">
                            <button type="button" onClick={onClose} className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-navy-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface EquipmentProps {
    equipment: EquipmentType[];
    setEquipment: (updateFn: (prev: EquipmentType[]) => EquipmentType[]) => void;
    maintenanceHistory: MaintenanceHistory[];
}

const Equipment: React.FC<EquipmentProps> = ({ equipment, setEquipment, maintenanceHistory }) => {
    const { session } = useSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | null>(null);

    const filteredEquipment = useMemo(() => equipment.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.status.toLowerCase().includes(searchTerm.toLowerCase())
    ), [equipment, searchTerm]);

    const getStatusColor = (status: EquipmentType['status']) => {
        switch (status) {
            case 'Operational': return 'bg-green-100 text-green-800';
            case 'Needs Maintenance': return 'bg-yellow-100 text-yellow-800';
            case 'Out of Service': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    return (
        <div>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-brand-navy-900">Equipment</h1>
                    <p className="mt-2 text-sm text-brand-navy-700">Manage all company assets, view maintenance history, and track status.</p>
                </div>
                {/* Add Equipment form can be triggered here */}
            </div>

            <div className="mt-6">
                <input type="text" placeholder="Search by name or status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 sm:text-sm" />
            </div>

            <div className="mt-4 flex flex-col">
                <div className="inline-block min-w-full py-2 align-middle">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full divide-y divide-brand-navy-300">
                            <thead className="bg-brand-navy-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Name</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Status</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Last Service</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Purchase Date</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Value</th>
                                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-navy-200 bg-white">
                                {filteredEquipment.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{item.name}</td>
                                        <td className="px-3 py-4 text-sm"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>{item.status}</span></td>
                                        <td className="px-3 py-4 text-sm text-brand-navy-500">{item.last_maintenance || 'N/A'}</td>
                                        <td className="px-3 py-4 text-sm text-brand-navy-500">{item.purchase_date || 'N/A'}</td>
                                        <td className="px-3 py-4 text-sm text-brand-navy-500">${item.value?.toLocaleString() || 'N/A'}</td>
                                        <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                            <button onClick={() => setSelectedEquipment(item)} className="text-brand-cyan-600 hover:text-brand-cyan-900">History</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedEquipment && (
                <MaintenanceHistoryModal
                    equipment={selectedEquipment}
                    history={maintenanceHistory.filter(h => h.equipment_id === selectedEquipment.id)}
                    onClose={() => setSelectedEquipment(null)}
                />
            )}
        </div>
    );
};

export default Equipment;