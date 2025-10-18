import React, { useState, useMemo } from 'react';
import { Employee } from '../types';

interface AddEmployeeFormProps {
    onSave: (employee: Omit<Employee, 'id'>) => void;
    onCancel: () => void;
}

const AddEmployeeForm: React.FC<AddEmployeeFormProps> = ({ onSave, onCancel }) => {
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

interface EmployeesProps {
    employees: Employee[];
    setEmployees: (updateFn: (prev: Employee[]) => Employee[]) => void;
}

const Employees: React.FC<EmployeesProps> = ({ employees, setEmployees }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const handleSaveEmployee = (newEmployeeData: Omit<Employee, 'id'>) => {
        const newEmployee: Employee = {
            id: `emp${employees.length + 1}-${Date.now()}`,
            ...newEmployeeData,
        };
        setEmployees(prev => [newEmployee, ...prev]);
        setShowAddForm(false);
    };
    
    const filteredEmployees = useMemo(() => employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.phone.includes(searchTerm)
    ), [employees, searchTerm]);

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
      
            <div className="mt-6">
                <input
                    type="text"
                    placeholder="Search employees by name, title, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
                    aria-label="Search employees"
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
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Job Title</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Phone</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Address</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Pay Rate</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-200 bg-white">
                                    {filteredEmployees.map((employee) => (
                                        <tr key={employee.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{employee.name}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{employee.jobTitle}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{employee.phone}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(employee.address)}`} target="_blank" rel="noopener noreferrer" className="text-brand-green-600 hover:text-brand-green-900 hover:underline">
                                                  {employee.address}
                                                </a>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">${employee.payRate.toFixed(2)}/hr</td>
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

export default Employees;