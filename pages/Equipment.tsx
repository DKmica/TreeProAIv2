import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Equipment as EquipmentType } from '../types';
import { useEquipmentQuery } from '../hooks/useDataQueries';
import * as api from '../services/apiService';

interface AddEquipmentFormProps {
    onSave: (equipment: Partial<EquipmentType>) => void;
    onCancel: () => void;
    initialData?: EquipmentType | null;
}

const AddEquipmentForm: React.FC<AddEquipmentFormProps> = ({ onSave, onCancel, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        make: '',
        model: '',
        purchaseDate: '',
        lastServiceDate: '',
        status: 'Operational' as EquipmentType['status'],
        assignedTo: ''
    });
    
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                make: initialData.make,
                model: initialData.model,
                purchaseDate: initialData.purchaseDate,
                lastServiceDate: initialData.lastServiceDate,
                status: initialData.status,
                assignedTo: initialData.assignedTo || ''
            });
        } else {
            setFormData({
                name: '',
                make: '',
                model: '',
                purchaseDate: '',
                lastServiceDate: '',
                status: 'Operational' as EquipmentType['status'],
                assignedTo: ''
            });
        }
    }, [initialData]);

    const isEditing = !!initialData;

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
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">{isEditing ? 'Edit Equipment' : 'Add New Equipment'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-gray-900">Equipment Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="make" className="block text-sm font-medium leading-6 text-brand-gray-900">Make</label>
                        <input type="text" name="make" id="make" value={formData.make} onChange={handleChange} className="block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="model" className="block text-sm font-medium leading-6 text-brand-gray-900">Model</label>
                        <input type="text" name="model" id="model" value={formData.model} onChange={handleChange} className="block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="purchaseDate" className="block text-sm font-medium leading-6 text-brand-gray-900">Purchase Date</label>
                        <input type="date" name="purchaseDate" id="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
                    </div>
                     <div className="sm:col-span-3">
                        <label htmlFor="lastServiceDate" className="block text-sm font-medium leading-6 text-brand-gray-900">Last Service Date</label>
                        <input type="date" name="lastServiceDate" id="lastServiceDate" value={formData.lastServiceDate} onChange={handleChange} className="block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-brand-gray-900">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm">
                            <option>Operational</option>
                            <option>Needs Maintenance</option>
                            <option>Out of Service</option>
                        </select>
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="assignedTo" className="block text-sm font-medium leading-6 text-brand-gray-900">Assigned To</label>
                        <input type="text" name="assignedTo" id="assignedTo" value={formData.assignedTo} onChange={handleChange} className="block w-full rounded-md border border-brand-gray-600 bg-brand-gray-800 px-3 py-2 text-white shadow-sm placeholder:text-gray-400 focus:border-brand-cyan-500 focus:ring-1 focus:ring-brand-cyan-500 sm:text-sm" />
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                    <button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-500">{isEditing ? 'Save Changes' : 'Save Equipment'}</button>
                </div>
            </form>
        </div>
    );
};

const Equipment: React.FC = () => {
    const { data: equipment = [], isLoading, refetch } = useEquipmentQuery();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.openCreateForm) {
            setEditingEquipment(null);
            setShowAddForm(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);


    const handleCancel = () => {
        setShowAddForm(false);
        setEditingEquipment(null);
    };

    const handleMainButtonClick = () => {
        if (showAddForm) {
            handleCancel();
        } else {
            setEditingEquipment(null);
            setShowAddForm(true);
        }
    };

    const handleEditClick = (item: EquipmentType) => {
        setEditingEquipment(item);
        setShowAddForm(true);
    };

    const handleArchiveEquipment = async (equipmentId: string) => {
        if (window.confirm('Are you sure you want to archive this equipment?')) {
            try {
                await api.equipmentService.remove(equipmentId);
                refetch();
            } catch (error) {
                console.error('Failed to archive equipment:', error);
                alert('Failed to archive equipment');
            }
        }
    };
    
    const handleSaveEquipment = async (equipmentData: Partial<EquipmentType>) => {
        try {
            if (editingEquipment) {
                await api.equipmentService.update(editingEquipment.id, equipmentData);
            } else {
                await api.equipmentService.create({
                    name: equipmentData.name || 'N/A',
                    make: equipmentData.make || 'N/A',
                    model: equipmentData.model || 'N/A',
                    purchaseDate: equipmentData.purchaseDate || '',
                    lastServiceDate: equipmentData.lastServiceDate || '',
                    status: equipmentData.status || 'Operational',
                    assignedTo: equipmentData.assignedTo || undefined
                });
            }
            refetch();
            handleCancel();
        } catch (error) {
            console.error('Failed to save equipment:', error);
            alert('Failed to save equipment');
        }
    };
  
    const filteredEquipment = useMemo(() => equipment.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-brand-gray-900">Equipment</h1>
                    <p className="mt-2 text-sm text-brand-gray-700">A list of all company equipment.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button onClick={handleMainButtonClick} type="button" className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
                        {showAddForm ? 'Cancel' : 'Add Equipment'}
                    </button>
                </div>
            </div>

            {showAddForm && <AddEquipmentForm onSave={handleSaveEquipment} onCancel={handleCancel} initialData={editingEquipment} />}
      
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

            {/* Desktop Table View */}
            <div className="mt-4 hidden lg:flex lg:flex-col">
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
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-200 bg-white">
                                    {filteredEquipment.map((item) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">
                                                <Link to={`/equipment/${item.id}`} className="text-brand-green-600 hover:text-brand-green-800 hover:underline">
                                                    {item.name}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{`${item.make} ${item.model}`}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{item.assignedTo || 'N/A'}</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button onClick={() => handleEditClick(item)} className="text-brand-green-600 hover:text-brand-green-900">Edit</button>
                                                <button onClick={() => handleArchiveEquipment(item.id)} className="ml-4 text-red-600 hover:text-red-900">Archive</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="mt-4 lg:hidden space-y-4">
                {filteredEquipment.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                            <div>
                                <Link to={`/equipment/${item.id}`} className="font-semibold text-brand-green-600 hover:text-brand-green-800 hover:underline">
                                    {item.name}
                                </Link>
                                <p className="text-sm text-brand-gray-600 mt-1">{`${item.make} ${item.model}`}</p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>
                                {item.status}
                            </span>
                        </div>

                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-brand-gray-600">Assigned To:</span>
                                <span className="font-medium text-brand-gray-900">{item.assignedTo || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-brand-gray-100">
                            <button 
                                onClick={() => handleEditClick(item)} 
                                className="flex-1 px-3 py-2 text-sm font-medium text-brand-green-600 hover:text-brand-green-700 border border-brand-green-600 rounded-md hover:bg-brand-green-50"
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => handleArchiveEquipment(item.id)} 
                                className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-600 rounded-md hover:bg-red-50"
                            >
                                Archive
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Equipment;
