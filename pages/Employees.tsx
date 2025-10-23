import React, { useState, useMemo, useEffect } from 'react';
import { Employee } from '../types';

const EmployeeForm: React.FC<{
    onSave: (employee: Partial<Employee>) => void;
    onCancel: () => void;
    initialData?: Employee | null;
}> = ({ onSave, onCancel, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        ssn: '',
        dob: '',
        jobTitle: '',
        payRate: '',
        hireDate: '',
        certifications: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                phone: initialData.phone,
                address: initialData.address,
                ssn: initialData.ssn,
                dob: initialData.dob,
                jobTitle: initialData.jobTitle,
                payRate: initialData.payRate.toString(),
                hireDate: initialData.hireDate,
                certifications: initialData.certifications
            });
        } else {
            setFormData({
                name: '',
                phone: '',
                address: '',
                ssn: '',
                dob: '',
                jobTitle: '',
                payRate: '',
                hireDate: '',
                certifications: ''
            });
        }
    }, [initialData]);

    const isEditing = !!initialData;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            payRate: parseFloat(formData.payRate) || 0,
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">{isEditing ? 'Edit Employee' : 'Add New Employee'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-gray-900">Full Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="phone" className="block text-sm font-medium leading-6 text-brand-gray-900">Phone Number</label>
                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="col-span-full">
                        <label htmlFor="address" className="block text-sm font-medium leading-6 text-brand-gray-900">Address</label>
                        <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="ssn" className="block text-sm font-medium leading-6 text-brand-gray-900">Social Security Number</label>
                        <input type="text" name="ssn" id="ssn" value={formData.ssn} onChange={handleChange} placeholder="XXX-XX-XXXX" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="dob" className="block text-sm font-medium leading-6 text-brand-gray-900">Date of Birth</label>
                        <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                     <div className="sm:col-span-3">
                        <label htmlFor="jobTitle" className="block text-sm font-medium leading-6 text-brand-gray-900">Job Title</label>
                        <input type="text" name="jobTitle" id="jobTitle" value={formData.jobTitle} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                     <div className="sm:col-span-3">
                        <label htmlFor="payRate" className="block text-sm font-medium leading-6 text-brand-gray-900">Pay Rate ($/hr)</label>
                        <input type="number" name="payRate" id="payRate" value={formData.payRate} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="hireDate" className="block text-sm font-medium leading-6 text-brand-gray-900">Hire Date</label>
                        <input type="date" name="hireDate" id="hireDate" value={formData.hireDate} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="col-span-full">
                         <label htmlFor="certifications" className="block text-sm font-medium leading-6 text-brand-gray-900">Certifications</label>
                         <textarea id="certifications" name="certifications" rows={3} value={formData.certifications} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                    <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">{isEditing ? 'Save Changes' : 'Save Employee'}</button>
                </div>
            </form>
        </div>
    );
};

interface EmployeesProps {
    employees: Employee[];
    // FIX: Correctly type the `setEmployees` prop to match `useState` setter.
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

const Employees: React.FC<EmployeesProps> = ({ employees, setEmployees }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [jobTitleFilter, setJobTitleFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Employee, direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

    const uniqueJobTitles = useMemo(() => [...new Set(employees.map(e => e.jobTitle))], [employees]);

    const handleCancel = () => {
        setShowForm(false);
        setEditingEmployee(null);
    };

    const handleMainButtonClick = () => {
        if (showForm) {
            handleCancel();
        } else {
            setEditingEmployee(null);
            setShowForm(true);
        }
    };

    const handleEditClick = (employee: Employee) => {
        setEditingEmployee(employee);
        setShowForm(true);
    };

    const handleArchiveEmployee = (employeeId: string) => {
        if (window.confirm('Are you sure you want to archive this employee?')) {
            setEmployees(prev => prev.filter(e => e.id !== employeeId));
        }
    };
    
    const handleSaveEmployee = (employeeData: Partial<Employee>) => {
        if (editingEmployee) {
            // Update
            setEmployees(prev => prev.map(e => 
                e.id === editingEmployee.id ? { ...e, ...employeeData } as Employee : e
            ));
        } else {
            // Create
            const newEmployee: Employee = {
                id: `emp-${Date.now()}`,
                coordinates: { lat: 0, lng: 0 },
                ...employeeData,
            } as Employee;
            setEmployees(prev => [newEmployee, ...prev]);
        }
        handleCancel();
    };
    
    const requestSort = (key: keyof Employee) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredEmployees = useMemo(() => {
        let filtered = employees.filter(e => 
            (e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.phone.includes(searchTerm)) &&
            (jobTitleFilter === 'all' || e.jobTitle === jobTitleFilter)
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === undefined || aValue === null || bValue === undefined || bValue === null) return 0;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [employees, searchTerm, jobTitleFilter, sortConfig]);
    
    const SortableHeader: React.FC<{ sortKey: keyof Employee, children: React.ReactNode }> = ({ sortKey, children }) => {
        const isSorted = sortConfig?.key === sortKey;
        const Icon = () => {
            if (!isSorted) return <span className="text-gray-400">↑↓</span>;
            return sortConfig?.direction === 'ascending' ? <span className="text-brand-gray-800">↑</span> : <span className="text-brand-gray-800">↓</span>;
        };
        return (
            <button onClick={() => requestSort(sortKey)} className="group inline-flex items-center">
                {children}
                <span className="ml-2 flex-none rounded text-brand-gray-400 group-hover:bg-brand-gray-200">
                    <Icon />
                </span>
            </button>
        );
    };

    return (
        <div>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-brand-gray-900">Employees</h1>
                    <p className="mt-2 text-sm text-brand-gray-700">Manage your crew and staff members.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button onClick={handleMainButtonClick} type="button" className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
                        {showForm ? 'Cancel' : 'Add Employee'}
                    </button>
                </div>
            </div>

            {showForm && <EmployeeForm onSave={handleSaveEmployee} onCancel={handleCancel} initialData={editingEmployee} />}
      
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full sm:max-w-xs rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    aria-label="Search employees"
                />
                 <select 
                    id="jobTitleFilter"
                    value={jobTitleFilter}
                    onChange={e => setJobTitleFilter(e.target.value)}
                    className="block w-full sm:max-w-xs rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    aria-label="Filter by job title"
                 >
                    <option value="all">All Job Titles</option>
                    {uniqueJobTitles.map(title => <option key={title} value={title}>{title}</option>)}
                 </select>
            </div>

            <div className="mt-4 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-brand-gray-300">
                                <thead className="bg-brand-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900"><SortableHeader sortKey="jobTitle">Job Title</SortableHeader></th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Phone</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900"><SortableHeader sortKey="hireDate">Hire Date</SortableHeader></th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Pay Rate</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-200 bg-white">
                                    {sortedAndFilteredEmployees.map((employee) => (
                                        <tr key={employee.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{employee.name}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{employee.jobTitle}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{employee.phone}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{employee.hireDate}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">${employee.payRate.toFixed(2)}/hr</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button onClick={() => handleEditClick(employee)} className="text-brand-green-600 hover:text-brand-green-900">Edit</button>
                                                <button onClick={() => handleArchiveEmployee(employee.id)} className="ml-4 text-red-600 hover:text-red-900">Archive</button>
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

export default Employees;