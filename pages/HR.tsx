import React, { useState, useMemo } from 'react';
import { Employee, Certification, TimeOffRequest } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

// --- Sub-component for Employee Directory (from former Employees.tsx) ---
const AddEmployeeForm: React.FC<{
    onSave: (employee: Omit<Employee, 'id' | 'user_id' | 'created_at' | 'address' | 'coordinates'>) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        pay_rate: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            pay_rate: parseFloat(formData.pay_rate) || 0,
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-navy-900 mb-4">Add New Employee</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3"><label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-navy-900">Full Name</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-navy-900">Email</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="phone" className="block text-sm font-medium leading-6 text-brand-navy-900">Phone Number</label><input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="role" className="block text-sm font-medium leading-6 text-brand-navy-900">Job Title / Role</label><input type="text" name="role" id="role" value={formData.role} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="pay_rate" className="block text-sm font-medium leading-6 text-brand-navy-900">Pay Rate ($/hr)</label><input type="number" name="pay_rate" id="pay_rate" value={formData.pay_rate} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6"><button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-navy-900">Cancel</button><button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600">Save Employee</button></div>
            </form>
        </div>
    );
};

const EmployeeDirectory: React.FC<{ employees: Employee[], setEmployees: (updateFn: (prev: Employee[]) => Employee[]) => void }> = ({ employees, setEmployees }) => {
    const { session } = useSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const handleSaveEmployee = async (newEmployeeData: Omit<Employee, 'id' | 'user_id' | 'created_at' | 'address' | 'coordinates'>) => {
        if (!session) return;
        const { data, error } = await supabase
            .from('employees')
            .insert({ ...newEmployeeData, user_id: session.user.id })
            .select()
            .single();
        
        if (error) {
            alert(error.message);
        } else if (data) {
            setEmployees(prev => [{ ...data, address: '', coordinates: { lat: 0, lng: 0 } }, ...prev]);
            setShowAddForm(false);
        }
    };
    
    const filteredEmployees = useMemo(() => employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.phone || '').includes(searchTerm)
    ), [employees, searchTerm]);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="sm:flex sm:items-center"><div className="sm:flex-auto"><h3 className="text-xl font-bold text-brand-navy-900">Employee Directory</h3><p className="mt-2 text-sm text-brand-navy-700">Manage your crew and staff members.</p></div><div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none"><button onClick={() => setShowAddForm(s => !s)} type="button" className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">{showAddForm ? 'Cancel' : 'Add Employee'}</button></div></div>
            {showAddForm && <AddEmployeeForm onSave={handleSaveEmployee} onCancel={() => setShowAddForm(false)} />}
            <div className="mt-6"><input type="text" placeholder="Search employees by name, title, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" aria-label="Search employees" /></div>
            <div className="mt-4 flex flex-col"><div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8"><div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8"><div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"><table className="min-w-full divide-y divide-brand-navy-300"><thead className="bg-brand-navy-50"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Name</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Job Title</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Phone</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Pay Rate</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th></tr></thead><tbody className="divide-y divide-brand-navy-200 bg-white">{filteredEmployees.map((employee) => (<tr key={employee.id}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{employee.name}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{employee.role}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{employee.phone}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">${employee.pay_rate.toFixed(2)}/hr</td><td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"><a href="#" className="text-brand-cyan-600 hover:text-brand-cyan-900">Edit</a></td></tr>))}</tbody></table></div></div></div></div>
        </div>
    );
};


// --- Sub-component for Certification Tracking ---
const CertificationsTracker: React.FC<{ certifications: Certification[], employees: Employee[] }> = ({ certifications, employees }) => {
    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';

    const getExpiryColor = (dateString?: string) => {
        if (!dateString) return 'text-gray-500';
        const expiryDate = new Date(dateString);
        const today = new Date();
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(today.getDate() + 60);

        if (expiryDate < today) return 'text-red-600 font-bold';
        if (expiryDate < sixtyDaysFromNow) return 'text-yellow-600 font-semibold';
        return 'text-green-600';
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-brand-navy-900 mb-4">Certifications Matrix</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-navy-200">
                    <thead className="bg-brand-navy-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-navy-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-navy-500 uppercase tracking-wider">Certification</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-navy-500 uppercase tracking-wider">Expires On</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-brand-navy-200">
                        {certifications.map(cert => (
                            <tr key={cert.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-navy-900">{getEmployeeName(cert.employee_id)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-navy-700">{cert.name}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getExpiryColor(cert.expiry_date)}`}>
                                    {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Sub-component for Time Off Requests ---
const TimeOffManager: React.FC<{ requests: TimeOffRequest[], employees: Employee[] }> = ({ requests, employees }) => {
    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
    // Logic to approve/deny requests would go here
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-brand-navy-900 mb-4">Time Off Requests</h3>
            <ul className="divide-y divide-brand-navy-200">
                {requests.map(req => (
                    <li key={req.id} className="py-4">
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <p className="font-semibold text-brand-navy-800">{getEmployeeName(req.employee_id)}</p>
                                <p className="text-sm text-brand-navy-600">
                                    {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                </p>
                                <p className="text-xs italic text-brand-navy-500">{req.reason}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {req.status === 'Pending' ? (
                                    <>
                                        <button className="px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Approve</button>
                                        <button className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Deny</button>
                                    </>
                                ) : (
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${req.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {req.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- Main HR Page Component ---
interface HRProps {
    employees: Employee[];
    setEmployees: (updateFn: (prev: Employee[]) => Employee[]) => void;
    certifications: Certification[];
    timeOffRequests: TimeOffRequest[];
}

const HRPage: React.FC<HRProps> = ({ employees, setEmployees, certifications, timeOffRequests }) => {
    const [activeTab, setActiveTab] = useState('employees');

    const tabs = [
        { id: 'employees', name: 'Employee Directory' },
        { id: 'certifications', name: 'Certifications' },
        { id: 'timeoff', name: 'Time Off Requests' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-navy-900">Human Resources</h1>
            <p className="mt-2 text-sm text-brand-navy-700">Manage staff, certifications, and time off.</p>

            <div className="mt-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-brand-cyan-500 text-brand-cyan-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="mt-8">
                {activeTab === 'employees' && <EmployeeDirectory employees={employees} setEmployees={setEmployees} />}
                {activeTab === 'certifications' && <CertificationsTracker certifications={certifications} employees={employees} />}
                {activeTab === 'timeoff' && <TimeOffManager requests={timeOffRequests} employees={employees} />}
            </div>
        </div>
    );
};

export default HRPage;