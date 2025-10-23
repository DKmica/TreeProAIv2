import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import EmployeeIcon from '../components/icons/EmployeeIcon';

const AddEmployeeForm: React.FC<{
    onSave: (employee: Omit<Employee, 'id'>) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            payRate: parseFloat(formData.payRate) || 0,
            coordinates: { lat: 0, lng: 0 } // Default coordinates, would be geocoded in a real app
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">Add New Employee</h2>
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
                    <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">Save Employee</button>
                </div>
            </form>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: string | number; valueColor?: string; subValue?: string }> = ({ label, value, valueColor = 'text-brand-gray-900', subValue }) => (
    <div className="overflow-hidden rounded-lg bg-brand-gray-50 px-4 py-5 text-center shadow-inner">
        <dt className="truncate text-sm font-medium text-brand-gray-500">{label}</dt>
        <dd className={`mt-1 text-3xl font-semibold tracking-tight ${valueColor}`}>
            {value} {subValue && <span className="text-lg font-normal text-brand-gray-500">{subValue}</span>}
        </dd>
    </div>
);

const EmployeeDetailModal: React.FC<{ employee: Employee | null; onClose: () => void }> = ({ employee, onClose }) => {
    if (!employee) return null;

    return (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <EmployeeIcon className="h-6 w-6 text-brand-green-600" />
                                </div>
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                    <h3 className="text-lg font-semibold leading-6 text-brand-gray-900" id="modal-title">{employee.name}</h3>
                                    <p className="text-sm text-brand-gray-500">{employee.jobTitle}</p>
                                </div>
                            </div>
                            <div className="mt-5 space-y-6">
                                {/* Performance Metrics */}
                                {employee.performanceMetrics && (
                                    <div>
                                        <h4 className="font-medium text-brand-gray-800 border-b pb-1 mb-2">Performance Metrics</h4>
                                        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                            <StatCard 
                                                label="Jobs Completed" 
                                                value={employee.performanceMetrics.jobsCompleted} 
                                            />
                                            <StatCard 
                                                label="Customer Rating" 
                                                value={employee.performanceMetrics.customerRating.toFixed(1)} 
                                                subValue="/ 5.0"
                                                valueColor={
                                                    employee.performanceMetrics.customerRating >= 4.5 ? 'text-brand-green-600' :
                                                    employee.performanceMetrics.customerRating >= 4.0 ? 'text-yellow-600' : 'text-red-600'
                                                }
                                            />
                                            <StatCard 
                                                label="Safety Incidents" 
                                                value={employee.performanceMetrics.safetyIncidents} 
                                                valueColor={
                                                    employee.performanceMetrics.safetyIncidents === 0 ? 'text-brand-green-600' : 'text-red-600'
                                                }
                                            />
                                        </dl>
                                    </div>
                                )}
                                {/* Certifications */}
                                <div>
                                    <h4 className="font-medium text-brand-gray-800 border-b pb-1 mb-2">Certifications</h4>
                                    <p className="text-sm text-brand-gray-700 whitespace-pre-wrap">{employee.certifications || 'No certifications listed.'}</p>
                                </div>
                                {/* Personal Information */}
                                <div>
                                    <h4 className="font-medium text-brand-gray-800 border-b pb-1 mb-2">Personal Information</h4>
                                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Phone</dt><dd className="mt-1 text-sm text-brand-gray-900">{employee.phone}</dd></div>
                                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-brand-gray-500">Hire Date</dt><dd className="mt-1 text-sm text-brand-gray-900">{employee.hireDate}</dd></div>
                                        <div className="sm:col-span-2"><dt className="text-sm font-medium text-brand-gray-500">Address</dt><dd className="mt-1 text-sm text-brand-gray-900">{employee.address}</dd></div>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-brand-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 sm:mt-0 sm:w-auto">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface EmployeesProps {
    employees: Employee[];
    setEmployees: (updateFn: (prev: Employee[]) => Employee[]) => void;
}

const Employees: React.FC<EmployeesProps> = ({ employees, setEmployees }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [jobTitleFilter, setJobTitleFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Employee, direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

    const uniqueJobTitles = useMemo(() => [...new Set(employees.map(e => e.jobTitle))], [employees]);

    const handleSaveEmployee = (newEmployeeData: Omit<Employee, 'id'>) => {
        const newEmployee: Employee = {
            id: `emp${employees.length + 1}-${Date.now()}`,
            ...newEmployeeData,
        };
        setEmployees(prev => [newEmployee, ...prev]);
        setShowAddForm(false);
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

                if (aValue === undefined || aValue === null || bValue === undefined || bValue === null) {
                    return 0;
                }
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
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
                    <button onClick={() => setShowAddForm(s => !s)} type="button" className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
                        {showAddForm ? 'Cancel' : 'Add Employee'}
                    </button>
                </div>
            </div>

            {showAddForm && <AddEmployeeForm onSave={handleSaveEmployee} onCancel={() => setShowAddForm(false)} />}
      
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
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">View</span></th>
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
                                                <button onClick={() => setSelectedEmployee(employee)} className="text-brand-green-600 hover:text-brand-green-900">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
        </div>
    );
};

export default Employees;
