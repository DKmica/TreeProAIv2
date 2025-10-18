import React, { useState, useMemo } from 'react';
import { Equipment as EquipmentType } from '../types';

interface AddEquipmentFormProps {
    onSave: (equipment: Omit<EquipmentType, 'id'>) => void;
    onCancel: () => void;
}

const AddEquipmentForm: React.FC<AddEquipmentFormProps> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        makeModel: '',
        purchaseDate: '',
        lastServiceDate: '',
        status: 'Operational' as EquipmentType['status'],
        assignedTo: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">Add New Equipment</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-gray-900">Equipment Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="makeModel" className="block text-sm font-medium leading-6 text-brand-gray-900">Make / Model</label>
                        <input type="text" name="makeModel" id="makeModel" value={formData.makeModel} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="purchaseDate" className="block text-sm font-medium leading-6 text-brand-gray-900">Purchase Date</label>
                        <input type="date" name="purchaseDate" id="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                     <div className="sm:col-span-3">
                        <label htmlFor="lastServiceDate" className="block text-sm font-medium leading-6 text-brand-gray-900">Last Service Date</label>
                        <input type="date" name="lastServiceDate" id="lastServiceDate" value={formData.lastServiceDate} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-gray-900">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6">
                            <option>Operational</option>
                            <option>Needs Maintenance</option>
                            <option>Out of Service</option>
                        </select>
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="assignedTo" className="block text-sm font-medium leading-6 text-brand-gray-900">Assigned To</label>
                        <input type="text" name="assignedTo" id="assignedTo" value={formData.assignedTo} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                    <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">Save Equipment</button>
                </div>
            </form>
        </div>
    );
};

interface EquipmentProps {
    equipment: EquipmentType[];
    setEquipment: (updateFn: (prev: EquipmentType[]) => EquipmentType[]) => void;
}

const Equipment: React.FC<EquipmentProps> = ({ equipment, setEquipment }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const handleSaveEquipment = (newEquipmentData: Omit<EquipmentType, 'id'>) => {
        const newEquipmentItem: EquipmentType = {
            id: `equip${equipment.length + 1}-${Date.now()}`,
            ...newEquipmentData,
        };
        setEquipment(prev => [newEquipmentItem, ...prev]);
        setShowAddForm(false);
    };
  
    const filteredEquipment = useMemo(() => equipment.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.makeModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                    <h1 className="text-2xl font-bold text-brand-gray-900">Equipment</h1>
                    <p className="mt-2 text-sm text-brand-gray-700">A list of all company equipment.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button onClick={() => setShowAddForm(s => !s)} type="button" className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
                        {showAddForm ? 'Cancel' : 'Add Equipment'}
                    </button>
                </div>
            </div>

            {showAddForm && <AddEquipmentForm onSave={handleSaveEquipment} onCancel={() => setShowAddForm(false)} />}
      
            <div className="mt-6">
                <input
                    type="text"
                    placeholder="Search by name, model, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    aria-label="Search equipment"
                />
            </div>

            <div className="mt-4 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-brand-gray-300">
                                <thead className="bg-brand-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Make/Model</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Status</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Assigned To</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-200 bg-white">
                                    {filteredEquipment.map((item) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{item.name}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{item.makeModel}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{item.assignedTo || 'N/A'}</td>
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

export default Equipment;