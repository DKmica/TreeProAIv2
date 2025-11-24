import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Job, Quote, Customer, Invoice, Employee, LineItem, JobCost, PortalMessage, CustomerDetailsInput } from '../types';
import ClipboardSignatureIcon from '../components/icons/ClipboardSignatureIcon';
import ChatBubbleLeftRightIcon from '../components/icons/ChatBubbleLeftRightIcon';
import PortalMessaging from '../components/PortalMessaging';
import JobStatusBadge from '../components/JobStatusBadge';
import StateTransitionControl from '../components/StateTransitionControl';
import StateHistoryTimeline from '../components/StateHistoryTimeline';
import XIcon from '../components/icons/XIcon';
import TemplateSelector from '../components/TemplateSelector';
import JobForms from '../components/JobForms';
import InvoiceEditor from '../components/InvoiceEditor';
import { generateJobRiskAssessment } from '../services/geminiService';
import * as api from '../services/apiService';
import AssociationModal from '../components/AssociationModal';
import RecurringJobsPanel from '../components/RecurringJobsPanel';
import { formatPhone, formatZip, formatState, parseEquipment, lookupZipCode } from '../utils/formatters';


// Helper to calculate total
const calculateQuoteTotal = (lineItems: LineItem[], stumpGrindingPrice: number): number => {
    const itemsTotal = lineItems.reduce((sum, item) => item.selected ? sum + item.price : sum, 0);
    return itemsTotal + (stumpGrindingPrice || 0);
};

interface NewCustomerData {
    companyName: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
}

interface JobLocationData {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
}

// Common form component for adding and editing jobs
const JobForm: React.FC<{
    quotes: Quote[];
    employees: Employee[];
    onSave: (job: Job | Omit<Job, 'id'>) => Promise<void>;
    onCancel: () => void;
    initialData?: Job;
}> = ({ quotes, employees, onSave, onCancel, initialData }) => {
    const availableQuotes = quotes.filter(q => q.status === 'Accepted'); 
    
    const [formData, setFormData] = useState({
        id: initialData?.id || '',
        quoteId: initialData?.quoteId || (availableQuotes.length > 0 ? availableQuotes[0].id : ''),
        customerName: initialData?.customerName || (availableQuotes.length > 0 ? availableQuotes[0].customerName : ''),
        scheduledDate: initialData?.scheduledDate || '',
        status: initialData?.status || ('Unscheduled' as Job['status']),
        assignedCrew: initialData?.assignedCrew || [],
        stumpGrindingPrice: initialData?.stumpGrindingPrice ? initialData.stumpGrindingPrice.toString() : '',
        jobLocation: initialData?.jobLocation || '',
        specialInstructions: initialData?.specialInstructions || '',
        equipmentNeeded: initialData?.equipmentNeeded || [],
        estimatedHours: initialData?.estimatedHours ? initialData.estimatedHours.toString() : '',
    });

    const [jobLocationData, setJobLocationData] = useState<JobLocationData>({
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
    });

    const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
    const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>({
        companyName: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
    });
    const [errors, setErrors] = useState<{[key: string]: string}>({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id,
                quoteId: initialData.quoteId,
                customerName: initialData.customerName,
                scheduledDate: initialData.scheduledDate,
                status: initialData.status,
                assignedCrew: initialData.assignedCrew,
                stumpGrindingPrice: initialData.stumpGrindingPrice || 0,
                jobLocation: initialData.jobLocation || '',
                specialInstructions: initialData.specialInstructions || '',
                equipmentNeeded: initialData.equipmentNeeded || [],
                estimatedHours: initialData.estimatedHours || 0,
            });
            setCustomerMode(initialData.quoteId ? 'existing' : 'new');
        } else {
            const defaultQuote = availableQuotes.length > 0 ? availableQuotes[0] : null;
            setFormData({
                id: '',
                quoteId: defaultQuote?.id || '',
                customerName: defaultQuote?.customerName || '',
                scheduledDate: '',
                status: 'Unscheduled',
                assignedCrew: [],
                stumpGrindingPrice: defaultQuote?.stumpGrindingPrice || 0,
                jobLocation: '',
                specialInstructions: '',
                equipmentNeeded: [],
                estimatedHours: 0,
            });
            setCustomerMode('existing');
            setNewCustomerData({
                companyName: '',
                firstName: '',
                lastName: '',
                phone: '',
                email: '',
                addressLine1: '',
                addressLine2: '',
                city: '',
                state: '',
                zipCode: '',
            });
        }
        setErrors({});
    }, [initialData, quotes]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'quoteId') {
            const selectedQuote = quotes.find(q => q.id === value);
            setFormData(prev => ({
                ...prev,
                quoteId: selectedQuote ? selectedQuote.id : '',
                customerName: selectedQuote ? selectedQuote.customerName : '',
                stumpGrindingPrice: selectedQuote ? selectedQuote.stumpGrindingPrice : 0,
            }));
            // Extract address from quote's property if available
            if (selectedQuote?.property) {
                setJobLocationData({
                    addressLine1: selectedQuote.property.addressLine1 || '',
                    addressLine2: selectedQuote.property.addressLine2 || '',
                    city: selectedQuote.property.city || '',
                    state: selectedQuote.property.state || '',
                    zipCode: selectedQuote.property.zipCode || '',
                });
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value as any }));
        }
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleJobLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;
        
        if (name === 'phone') {
            formattedValue = formatPhone(value);
        } else if (name === 'zipCode') {
            formattedValue = formatZip(value);
        } else if (name === 'state') {
            formattedValue = formatState(value);
        }
        
        setJobLocationData(prev => ({ ...prev, [name]: formattedValue }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;
        
        if (name === 'phone') {
            formattedValue = formatPhone(value);
        } else if (name === 'zipCode') {
            formattedValue = formatZip(value);
        } else if (name === 'state') {
            formattedValue = formatState(value);
        }
        
        setNewCustomerData(prev => ({ ...prev, [name]: formattedValue }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleCustomerModeChange = (mode: 'existing' | 'new') => {
        setCustomerMode(mode);
        if (mode === 'new') {
            setFormData(prev => ({ 
                ...prev, 
                quoteId: '', 
                customerName: '',
                stumpGrindingPrice: 0
            }));
        }
    };
    
    const handleCrewChange = (employeeId: string) => {
        setFormData(prev => ({
            ...prev,
            assignedCrew: prev.assignedCrew.includes(employeeId)
                ? prev.assignedCrew.filter(id => id !== employeeId)
                : [...prev.assignedCrew, employeeId]
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: {[key: string]: string} = {};

        if (customerMode === 'existing') {
            if (!formData.quoteId) {
                newErrors.quoteId = 'Please select a quote';
            }
        } else {
            if (!newCustomerData.firstName.trim()) {
                newErrors.firstName = 'First name is required';
            }
            if (!newCustomerData.lastName.trim()) {
                newErrors.lastName = 'Last name is required';
            }
            if (!newCustomerData.phone.trim()) {
                newErrors.phone = 'Phone number is required';
            }
            if (!newCustomerData.email.trim()) {
                newErrors.email = 'Email address is required';
            }
            if (!newCustomerData.addressLine1.trim()) {
                newErrors.addressLine1 = 'Address is required';
            }
            if (!newCustomerData.city.trim()) {
                newErrors.city = 'City is required';
            }
            if (!newCustomerData.state.trim()) {
                newErrors.state = 'State is required';
            }
            if (!newCustomerData.zipCode.trim()) {
                newErrors.zipCode = 'Zip code is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            let clientId: string | undefined;
            let customerDetails: CustomerDetailsInput | undefined;
            let customerName = formData.customerName;

            if (customerMode === 'existing') {
                const selectedQuote = quotes.find(q => q.id === formData.quoteId);
                clientId = selectedQuote?.clientId;
                if (!clientId) {
                    alert('Selected quote is missing client information.');
                    return;
                }
            } else {
                customerDetails = {
                    firstName: newCustomerData.firstName,
                    lastName: newCustomerData.lastName,
                    companyName: newCustomerData.companyName || undefined,
                    phone: newCustomerData.phone,
                    email: newCustomerData.email,
                    addressLine1: newCustomerData.addressLine1,
                    addressLine2: newCustomerData.addressLine2 || undefined,
                    city: newCustomerData.city,
                    state: newCustomerData.state,
                    zipCode: newCustomerData.zipCode,
                    country: 'USA'
                };
                customerName = newCustomerData.companyName || `${newCustomerData.firstName} ${newCustomerData.lastName}`;
            }

            const jobData: Partial<Job> & { customerDetails?: CustomerDetailsInput } = {
                ...formData,
                customerName,
            };

            if (clientId) {
                jobData.clientId = clientId;
            }
            if (customerDetails) {
                jobData.customerDetails = customerDetails;
            }

            await onSave(jobData as Job | Omit<Job, 'id'>);
        } catch (error: any) {
            alert(`Failed to create customer/job: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="bg-[#0f1c2e] p-6 rounded-lg shadow my-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">{initialData ? 'Edit Job' : 'Create New Job'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="col-span-full">
                        <label className="block text-sm font-medium leading-6 text-gray-300 mb-2">Customer Source *</label>
                        <div className="flex gap-6">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="customerMode"
                                    value="existing"
                                    checked={customerMode === 'existing'}
                                    onChange={(e) => handleCustomerModeChange(e.target.value as 'existing' | 'new')}
                                    className="mr-2 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span className="text-gray-300">From Accepted Quote</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="customerMode"
                                    value="new"
                                    checked={customerMode === 'new'}
                                    onChange={(e) => handleCustomerModeChange(e.target.value as 'existing' | 'new')}
                                    className="mr-2 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span className="text-gray-300">Create New Customer</span>
                            </label>
                        </div>
                    </div>

                    {customerMode === 'existing' ? (
                        <>
                            <div className="sm:col-span-3">
                                <label htmlFor="quoteId" className="block text-sm font-medium leading-6 text-gray-300">Accepted Quote *</label>
                                <select id="quoteId" name="quoteId" value={formData.quoteId} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6">
                                    <option value="">Select a quote...</option>
                                    {availableQuotes.map(quote => (<option key={quote.id} value={quote.id}>{`${quote.id} - ${quote.customerName}`}</option>))}
                                </select>
                                {errors.quoteId && <p className="mt-1 text-sm text-red-400">{errors.quoteId}</p>}
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="customerName" className="block text-sm font-medium leading-6 text-gray-300">Customer</label>
                                <input type="text" name="customerName" id="customerName" value={formData.customerName} readOnly className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-0 sm:text-sm sm:leading-6" />
                            </div>
                        </>
                    ) : (
                        <div className="col-span-full p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4">New Customer Information</h3>
                            
                            <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                                <div className="col-span-full">
                                    <label htmlFor="companyName" className="block text-sm font-medium leading-6 text-gray-300">Company Name (Optional)</label>
                                    <input
                                        type="text"
                                        id="companyName"
                                        name="companyName"
                                        value={newCustomerData.companyName}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="Enter company name"
                                    />
                                </div>

                                <div className="sm:col-span-3">
                                    <label htmlFor="firstName" className="block text-sm font-medium leading-6 text-gray-300">First Name *</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={newCustomerData.firstName}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="First name"
                                    />
                                    {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>}
                                </div>

                                <div className="sm:col-span-3">
                                    <label htmlFor="lastName" className="block text-sm font-medium leading-6 text-gray-300">Last Name *</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={newCustomerData.lastName}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="Last name"
                                    />
                                    {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>}
                                </div>

                                <div className="sm:col-span-3">
                                    <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-300">Phone Number *</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={newCustomerData.phone}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="(555) 123-4567"
                                    />
                                    {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
                                </div>

                                <div className="sm:col-span-3">
                                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-300">Email Address *</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={newCustomerData.email}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="email@example.com"
                                    />
                                    {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                                </div>

                                <div className="col-span-full">
                                    <label htmlFor="addressLine1" className="block text-sm font-medium leading-6 text-gray-300">Address Line 1 *</label>
                                    <input
                                        type="text"
                                        id="addressLine1"
                                        name="addressLine1"
                                        value={newCustomerData.addressLine1}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="Street address"
                                    />
                                    {errors.addressLine1 && <p className="mt-1 text-sm text-red-400">{errors.addressLine1}</p>}
                                </div>

                                <div className="col-span-full">
                                    <label htmlFor="addressLine2" className="block text-sm font-medium leading-6 text-gray-300">Address Line 2 (Optional)</label>
                                    <input
                                        type="text"
                                        id="addressLine2"
                                        name="addressLine2"
                                        value={newCustomerData.addressLine2}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="Apt, suite, unit, etc."
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="city" className="block text-sm font-medium leading-6 text-gray-300">City *</label>
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={newCustomerData.city}
                                        onChange={handleNewCustomerChange}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="City"
                                    />
                                    {errors.city && <p className="mt-1 text-sm text-red-400">{errors.city}</p>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="state" className="block text-sm font-medium leading-6 text-gray-300">State *</label>
                                    <input
                                        type="text"
                                        id="state"
                                        name="state"
                                        value={newCustomerData.state}
                                        onChange={handleNewCustomerChange}
                                        maxLength={2}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="CA"
                                    />
                                    {errors.state && <p className="mt-1 text-sm text-red-400">{errors.state}</p>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="zipCode" className="block text-sm font-medium leading-6 text-gray-300">Zip Code *</label>
                                    <input
                                        type="text"
                                        id="zipCode"
                                        name="zipCode"
                                        value={newCustomerData.zipCode}
                                        onChange={(e) => {
                                            const zip = formatZip(e.target.value);
                                            handleNewCustomerChange({ target: { name: 'zipCode', value: zip } } as any);
                                            if (zip.length === 5) {
                                                const lookup = lookupZipCode(zip);
                                                if (lookup) {
                                                    handleNewCustomerChange({ target: { name: 'city', value: lookup.city } } as any);
                                                    handleNewCustomerChange({ target: { name: 'state', value: lookup.state } } as any);
                                                }
                                            }
                                        }}
                                        maxLength={5}
                                        className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                        placeholder="12345"
                                    />
                                    {errors.zipCode && <p className="mt-1 text-sm text-red-400">{errors.zipCode}</p>}
                                </div>
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    setJobLocationData({
                                        addressLine1: newCustomerData.addressLine1,
                                        addressLine2: newCustomerData.addressLine2,
                                        city: newCustomerData.city,
                                        state: newCustomerData.state,
                                        zipCode: newCustomerData.zipCode,
                                    });
                                }}
                                className="mt-3 w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-medium transition-colors"
                            >
                                Use as Job Location
                            </button>
                        </div>
                    )}
                    <div className="sm:col-span-3">
                        <label htmlFor="scheduledDate" className="block text-sm font-medium leading-6 text-gray-300">Scheduled Date</label>
                        <input type="date" name="scheduledDate" id="scheduledDate" value={formData.scheduledDate} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-gray-300">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6">
                            <option>Unscheduled</option>
                            <option>Scheduled</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Cancelled</option>
                        </select>
                    </div>
                     <div className="sm:col-span-3">
                        <label htmlFor="stumpGrindingPrice" className="block text-sm font-medium leading-6 text-gray-300">Stump Grinding Price</label>
                        <input type="number" name="stumpGrindingPrice" id="stumpGrindingPrice" value={formData.stumpGrindingPrice} onChange={e => setFormData(prev => ({...prev, stumpGrindingPrice: e.target.value }))} className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" placeholder=" " />
                    </div>
                    
                    <div className="col-span-full">
                        <h3 className="text-md font-semibold text-white mb-3">Job Location</h3>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                            <div className="col-span-full">
                                <label htmlFor="locationAddress1" className="block text-sm font-medium leading-6 text-gray-300">Street Address</label>
                                <input type="text" id="locationAddress1" name="addressLine1" value={jobLocationData.addressLine1} onChange={handleJobLocationChange} placeholder="123 Oak Street" className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
                            </div>
                            <div className="col-span-full">
                                <label htmlFor="locationAddress2" className="block text-sm font-medium leading-6 text-gray-300">Address Line 2 (Optional)</label>
                                <input type="text" id="locationAddress2" name="addressLine2" value={jobLocationData.addressLine2} onChange={handleJobLocationChange} placeholder="Apt, suite, etc." className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="locationCity" className="block text-sm font-medium leading-6 text-gray-300">City</label>
                                <input type="text" id="locationCity" name="city" value={jobLocationData.city} onChange={handleJobLocationChange} placeholder="Los Angeles" className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="locationState" className="block text-sm font-medium leading-6 text-gray-300">State</label>
                                <input type="text" id="locationState" name="state" value={jobLocationData.state} onChange={handleJobLocationChange} maxLength={2} placeholder="CA" className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6 uppercase" />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="locationZip" className="block text-sm font-medium leading-6 text-gray-300">Zip Code</label>
                                <input type="text" id="locationZip" name="zipCode" value={jobLocationData.zipCode} onChange={handleJobLocationChange} maxLength={5} placeholder="90001" className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
                            </div>
                        </div>
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="estimatedHours" className="block text-sm font-medium leading-6 text-gray-300">Estimated Hours</label>
                        <input type="number" name="estimatedHours" id="estimatedHours" value={formData.estimatedHours} onChange={e => setFormData(prev => ({...prev, estimatedHours: e.target.value }))} min="0" step="0.5" className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" placeholder=" " />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="equipmentNeeded" className="block text-sm font-medium leading-6 text-gray-300">Equipment Needed</label>
                        <input type="text" name="equipmentNeeded" id="equipmentNeeded" value={formData.equipmentNeeded.join(', ')} onChange={e => setFormData(prev => ({...prev, equipmentNeeded: parseEquipment(e.target.value) }))} placeholder="e.g. Chainsaw Chipper, Stump Grinder" className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="col-span-full">
                        <label htmlFor="specialInstructions" className="block text-sm font-medium leading-6 text-gray-300">Special Instructions / Notes</label>
                        <textarea name="specialInstructions" id="specialInstructions" value={formData.specialInstructions} onChange={e => setFormData(prev => ({...prev, specialInstructions: e.target.value }))} rows={3} placeholder="Gate code, parking instructions, special considerations, etc." className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="col-span-full">
                        <label className="block text-sm font-medium leading-6 text-gray-300">Assign Crew</label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-md border border-gray-600 bg-gray-800/50 p-4">
                            {employees.map(emp => (
                                <div key={emp.id} className="relative flex items-start">
                                    <div className="flex h-6 items-center">
                                        <input
                                            id={`emp-form-${emp.id}`}
                                            type="checkbox"
                                            checked={formData.assignedCrew.includes(emp.id)}
                                            onChange={() => handleCrewChange(emp.id)}
                                            className="h-4 w-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm leading-6">
                                        <label htmlFor={`emp-form-${emp.id}`} className="font-medium text-gray-300">{emp.name}</label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-gray-300 hover:text-white">Cancel</button>
                    <button type="submit" className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">Save Job</button>
                </div>
            </form>
        </div>
    );
};

interface JobsProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  quotes: Quote[];
  customers: Customer[];
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  employees: Employee[];
}

const Jobs: React.FC<JobsProps> = ({ jobs, setJobs, quotes, invoices, setInvoices, employees }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [linkCopied, setLinkCopied] = useState('');
  const [viewingMessages, setViewingMessages] = useState<Job | null>(null);
  const [viewingJobDetail, setViewingJobDetail] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'transitions' | 'history'>('info');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
  const [invoicePrefilledData, setInvoicePrefilledData] = useState<{ customerName?: string; jobId?: string; lineItems?: LineItem[] } | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const [linkageWarnings, setLinkageWarnings] = useState<string[]>([]);
  const [associationJob, setAssociationJob] = useState<Job | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);

  useEffect(() => {
    if (location.state?.openCreateForm) {
        setEditingJob(null);
        setShowForm(true);
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const warnings = jobs
      .filter(job => job.status === 'Completed' && !invoices.some(inv => inv.jobId === job.id))
      .map(job => `Job ${job.jobNumber || job.id.slice(0, 8)} is completed with no invoice.`);
    setLinkageWarnings(warnings);
  }, [jobs, invoices]);


  const handleCancel = () => {
    setShowForm(false);
    setEditingJob(null);
  };
  
  const handleMainButtonClick = () => {
      if (showForm) {
          handleCancel();
      } else {
          setEditingJob(null);
          setShowForm(true);
      }
  };

  const handleEditClick = (job: Job) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleArchiveJob = async (jobId: string) => {
      if(!window.confirm('Are you sure you want to archive this job?')) {
          return;
      }

      try {
          await api.jobService.remove(jobId);
          setJobs(prev => prev.filter(j => j.id !== jobId));
      } catch (error: any) {
          console.error('Failed to archive job', error);
          alert(`Failed to archive job: ${error.message || 'Unknown error'}`);
      }
  };

  const handleSave = async (jobData: Job | Omit<Job, 'id'>) => {
      try {
          if ('id' in jobData && jobData.id) { // Editing
              const { id, ...updatePayload } = jobData as Job;
              const updatedJob = await api.jobService.update(id, updatePayload);
              setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
          } else { // Creating
              const quote = quotes.find(q => q.id === jobData.quoteId);
              if (!quote) {
                  alert('Cannot create job: Associated quote not found.');
                  return;
              }

              let riskAssessment: { risk_level: 'Low' | 'Medium' | 'High' | 'Critical'; jha_required: boolean };
              try {
                  console.log('Generating AI risk assessment...');
                  const assessment = await generateJobRiskAssessment(quote, quote.customerUploads || []);
                  console.log('AI Risk Assessment:', assessment);
                  riskAssessment = { risk_level: assessment.risk_level, jha_required: assessment.jha_required };
              } catch (err) {
                  console.error('AI risk assessment failed:', err);
                  riskAssessment = { risk_level: 'Medium', jha_required: true };
              }

              const newJobPayload = {
                  ...(jobData as Omit<Job, 'id'>),
                  riskLevel: riskAssessment.risk_level,
                  jhaRequired: riskAssessment.jha_required
              };

              const newJob = await api.jobService.create(newJobPayload);
              setJobs(prev => [newJob, ...prev]);
          }
          handleCancel();
      } catch (error: any) {
          console.error('Failed to save job', error);
          alert(`Failed to save job: ${error.message || 'Unknown error'}`);
      }
  };

  const handleCreateInvoice = (job: Job) => {
    const quote = quotes.find(q => q.id === job.quoteId);
    if (!quote) {
        alert('Associated quote not found.');
        return;
    }

    const lineItems: LineItem[] = quote.lineItems.map(item => ({
      description: item.description,
      price: item.price,
      selected: item.selected
    }));

    if (quote.stumpGrindingPrice && quote.stumpGrindingPrice > 0) {
      lineItems.push({
        description: 'Stump Grinding',
        price: quote.stumpGrindingPrice,
        selected: true
      });
    }

    setInvoicePrefilledData({
      customerName: job.customerName,
      jobId: job.id,
      lineItems: lineItems
    });
    setIsInvoiceEditorOpen(true);
  };

  const handleInvoiceSaved = (savedInvoice: Invoice) => {
    setInvoices(prev => {
      const existing = prev.find(inv => inv.id === savedInvoice.id);
      if (existing) {
        return prev.map(inv => inv.id === savedInvoice.id ? savedInvoice : inv);
      } else {
        return [savedInvoice, ...prev];
      }
    });
    alert('Invoice created successfully!');
  };

  const handleCopyLink = (jobId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/portal/job/${jobId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(jobId);
    setTimeout(() => setLinkCopied(''), 2000);
  };
  
  const handleSendMessage = (text: string) => {
    if (!viewingMessages) return;
    const newMessage: PortalMessage = {
        sender: 'company',
        text,
        timestamp: new Date().toISOString(),
    };
    setJobs(prev => prev.map(j => 
        j.id === viewingMessages.id 
            ? { ...j, messages: [...(j.messages || []), newMessage] } 
            : j
    ));
    setViewingMessages(prev => prev ? { ...prev, messages: [...(prev.messages || []), newMessage] } : null);
  };

  const handleStatusChange = (jobId: string, newStatus: Job['status']) => {
    setJobs(prevJobs => prevJobs.map(j => {
      if (j.id === jobId) {
        const updatedJob = { ...j, status: newStatus };

        // If status is changing TO 'Completed' and costs haven't been calculated yet
        if (newStatus === 'Completed' && !updatedJob.costs) {
          // 1. Calculate labor cost
          let laborCost = 0;
          if (updatedJob.workStartedAt && updatedJob.workEndedAt && updatedJob.assignedCrew.length > 0) {
            const startTime = new Date(updatedJob.workStartedAt).getTime();
            const endTime = new Date(updatedJob.workEndedAt).getTime();
            const durationHours = (endTime - startTime) / (1000 * 60 * 60);

            const totalCrewHourlyRate = updatedJob.assignedCrew.reduce((sum, empId) => {
              const employee = employees.find(e => e.id === empId);
              return sum + (employee?.payRate || 0);
            }, 0);
            
            laborCost = durationHours * totalCrewHourlyRate;
          }

          // 2. Simulated operational costs
          const equipmentCost = 100; // Simulated cost for equipment usage
          const materialsCost = 20;  // Simulated cost for materials
          const disposalCost = 80;   // Simulated cost for debris disposal

          // 3. Total cost
          const totalCost = laborCost + equipmentCost + materialsCost + disposalCost;

          const jobCost: JobCost = {
            labor: parseFloat(laborCost.toFixed(2)),
            equipment: equipmentCost,
            materials: materialsCost,
            disposal: disposalCost,
            total: parseFloat(totalCost.toFixed(2)),
          };
          
          return { ...updatedJob, costs: jobCost };
        }
        return updatedJob;
      }
      return j;
    }));
  };

  const handleStateChanged = async (jobId: string, newState: string) => {
    try {
      const updatedJob = await api.jobService.getById(jobId);
      setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? updatedJob : j));
      if (viewingJobDetail?.id === jobId) {
        setViewingJobDetail(updatedJob);
      }
    } catch (error: any) {
      console.error('Failed to refresh job after state change:', error);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const newJob = await api.jobTemplateService.useTemplate(templateId);
      setJobs(prev => [newJob, ...prev]);
      setShowTemplateSelector(false);
    } catch (error: any) {
      console.error('Failed to create job from template:', error);
      alert(`Failed to create job from template: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRecurringJobCreated = (job: Job) => {
    setJobs(prevJobs => {
      const filtered = prevJobs.filter(existing => existing.id !== job.id);
      return [job, ...filtered];
    });
  };

  const handleViewDetails = (job: Job) => {
    setViewingJobDetail(job);
    setActiveTab('info');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setViewingJobDetail(null);
    }
  };

  const handleAssociationsCreated = async ({ clientId, propertyId }: { clientId: string; propertyId: string }) => {
    if (!associationJob) return;
    try {
      const updated = await api.jobService.update(associationJob.id, { clientId, propertyId });
      setJobs(prev => prev.map(job => job.id === updated.id ? updated : job));
      setViewingJobDetail(prev => (prev && prev.id === updated.id ? updated : prev));
      setAssociationJob(null);
      setShowAssociationModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to attach associations');
    }
  };

  const filteredJobs = useMemo(() => jobs.filter(job =>
    Object.values(job).some(value => value.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  ), [jobs, searchTerm]);

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-gray-900">Jobs</h1>
          <p className="mt-2 text-sm text-brand-gray-700">A list of all scheduled and active jobs.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-2">
          <button type="button" onClick={() => setShowTemplateSelector(true)} className="inline-flex items-center justify-center rounded-md border border-brand-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-gray-700 shadow-sm hover:bg-brand-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">
              Create from Template
          </button>
          <button type="button" onClick={handleMainButtonClick} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
              {showForm ? 'Cancel' : 'Create Job'}
          </button>
        </div>
      </div>
      
      {showForm && <JobForm quotes={quotes} employees={employees} onSave={handleSave} onCancel={handleCancel} initialData={editingJob || undefined} />}
      
      <div className="mt-6">
        <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm" aria-label="Search jobs" />
      </div>

      {linkageWarnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {linkageWarnings.map((msg, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
              <span>{msg}</span>
              <span className="text-xs font-medium">Add invoice to resolve</span>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="mt-4 hidden lg:flex lg:flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-brand-gray-300">
                <thead className="bg-brand-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-gray-900 sm:pl-6">Job ID</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Customer</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Scheduled Date</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200 bg-white">
                  {filteredJobs.map((job) => {
                      const isInvoiceCreated = invoices.some(inv => inv.jobId === job.id);
                      const canCreateInvoice = !isInvoiceCreated && job.status === 'Completed';
                      const portalUrl = `#/portal/job/${job.id}`;
                      return (
                        <tr key={job.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">
                            <div className="flex items-center">
                                {job.id}
                                {job.messages && job.messages.length > 0 && (
                                    <button onClick={() => setViewingMessages(job)} className="ml-2 text-brand-gray-400 hover:text-brand-green-600">
                                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{job.customerName}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                            <JobStatusBadge status={job.status} size="sm" />
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{job.scheduledDate || 'N/A'}</td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                            <button onClick={() => handleViewDetails(job)} className="text-brand-cyan-600 hover:text-brand-cyan-900 font-medium">Details</button>
                            <div className="inline-flex rounded-md shadow-sm">
                              <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center rounded-l-md bg-white px-2 py-1 text-sm font-semibold text-brand-gray-900 ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 focus:z-10">
                                Link
                              </a>
                              <button onClick={() => handleCopyLink(job.id)} type="button" className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2 py-1 text-sm font-semibold text-brand-gray-900 ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50 focus:z-10" title="Copy public link">
                                <ClipboardSignatureIcon className="h-4 w-4 text-brand-gray-600" />
                                {linkCopied === job.id && <span className="absolute -top-7 -right-1 text-xs bg-brand-gray-800 text-white px-2 py-0.5 rounded">Copied!</span>}
                              </button>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => handleCreateInvoice(job)}
                                disabled={!canCreateInvoice}
                                title={isInvoiceCreated ? "Invoice already exists" : job.status !== 'Completed' ? "Job must be completed" : "Create Invoice"}
                                className="ml-2 rounded bg-brand-green-50 px-2 py-1 text-xs font-semibold text-brand-green-600 shadow-sm hover:bg-brand-green-100 disabled:bg-brand-gray-100 disabled:text-brand-gray-400 disabled:cursor-not-allowed">
                                Invoice
                            </button>
                            <button onClick={() => handleEditClick(job)} className="ml-2 text-brand-green-600 hover:text-brand-green-900">Edit</button>
                            <button onClick={() => handleArchiveJob(job.id)} className="ml-2 text-red-600 hover:text-red-900">Archive</button>
                          </td>
                        </tr>
                      )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="mt-4 lg:hidden space-y-4">
        {filteredJobs.map((job) => {
          const isInvoiceCreated = invoices.some(inv => inv.jobId === job.id);
          const canCreateInvoice = !isInvoiceCreated && job.status === 'Completed';
          const portalUrl = `#/portal/job/${job.id}`;
          return (
            <div key={job.id} className="bg-white rounded-lg shadow p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-brand-gray-900">Job {job.id}</h3>
                  {job.messages && job.messages.length > 0 && (
                    <button onClick={() => setViewingMessages(job)} className="text-brand-gray-400 hover:text-brand-green-600">
                      <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <JobStatusBadge status={job.status} size="sm" />
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-gray-600">Customer:</span>
                  <span className="font-medium text-brand-gray-900">{job.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray-600">Scheduled:</span>
                  <span className="font-medium text-brand-gray-900">{job.scheduledDate || 'N/A'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-gray-100">
                <button 
                  onClick={() => handleViewDetails(job)} 
                  className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-brand-cyan-600 hover:text-brand-cyan-700 border border-brand-cyan-600 rounded-md hover:bg-brand-cyan-50"
                >
                  Details
                </button>
                <div className="flex gap-1">
                  <a 
                    href={portalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-l-md hover:bg-brand-gray-50"
                  >
                    Link
                  </a>
                  <button 
                    onClick={() => handleCopyLink(job.id)} 
                    type="button" 
                    className="relative px-2 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-300 rounded-r-md hover:bg-brand-gray-50" 
                    title="Copy public link"
                  >
                    <ClipboardSignatureIcon className="h-4 w-4 text-brand-gray-600" />
                    {linkCopied === job.id && (
                      <span className="absolute -top-8 -right-1 text-xs bg-brand-gray-800 text-white px-2 py-0.5 rounded">Copied!</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => handleCreateInvoice(job)}
                  disabled={!canCreateInvoice}
                  title={isInvoiceCreated ? "Invoice already exists" : job.status !== 'Completed' ? "Job must be completed" : "Create Invoice"}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-brand-green-50 text-brand-green-600 hover:bg-brand-green-100 disabled:bg-brand-gray-100 disabled:text-brand-gray-400 disabled:cursor-not-allowed"
                >
                  Invoice
                </button>
                <button 
                  onClick={() => handleEditClick(job)} 
                  className="flex-1 px-3 py-2 text-sm font-medium text-brand-green-600 hover:text-brand-green-700 border border-brand-green-600 rounded-md hover:bg-brand-green-50"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleArchiveJob(job.id)} 
                  className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-600 rounded-md hover:bg-red-50"
                >
                  Archive
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {viewingMessages && (
          <div className="fixed inset-0 bg-brand-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setViewingMessages(null)}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <PortalMessaging
                      messages={viewingMessages.messages || []}
                      onSendMessage={handleSendMessage}
                      senderType="company"
                  />
              </div>
          </div>
      )}

      {viewingJobDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={handleOverlayClick}
        >
          <div
            className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-white">Job Details</h2>
                <p className="text-sm text-gray-400 mt-1">Job ID: {viewingJobDetail.id}</p>
              </div>
              <button
                onClick={() => setViewingJobDetail(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                type="button"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="border-b border-gray-700">
              <nav className="flex space-x-4 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'info'
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Information
                </button>
                <button
                  onClick={() => setActiveTab('forms')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'forms'
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Forms
                </button>
                <button
                  onClick={() => setActiveTab('transitions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'transitions'
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  State Transitions
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  History
                </button>
              </nav>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Customer</label>
                      <p className="text-white">{viewingJobDetail.customerName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                      <JobStatusBadge status={viewingJobDetail.status} size="md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled Date</label>
                      <p className="text-white">{viewingJobDetail.scheduledDate || 'Not scheduled'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Quote ID</label>
                      <p className="text-white">{viewingJobDetail.quoteId || 'N/A'}</p>
                    </div>
                  </div>

                  {(viewingJobDetail.quoteVersion || viewingJobDetail.quoteApprovalStatus || viewingJobDetail.quoteNumber) && (
                    <div className="grid grid-cols-2 gap-6">
                      {viewingJobDetail.quoteNumber && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Quote Number</label>
                          <p className="text-white">{viewingJobDetail.quoteNumber}</p>
                        </div>
                      )}
                      {viewingJobDetail.quoteVersion && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Quote Version</label>
                          <p className="text-white">v{viewingJobDetail.quoteVersion}</p>
                        </div>
                      )}
                      {viewingJobDetail.quoteApprovalStatus && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Approval Status</label>
                          <p className="text-white capitalize">{viewingJobDetail.quoteApprovalStatus}</p>
                        </div>
                      )}
                      {viewingJobDetail.quoteApprovedAt && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Approved At</label>
                          <p className="text-white">{new Date(viewingJobDetail.quoteApprovedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewingJobDetail.jobLocation && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                      <p className="text-white">{viewingJobDetail.jobLocation}</p>
                    </div>
                  )}

                  {viewingJobDetail.specialInstructions && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Special Instructions</label>
                      <p className="text-white whitespace-pre-wrap">{viewingJobDetail.specialInstructions}</p>
                    </div>
                  )}

                  {viewingJobDetail.assignedCrew && viewingJobDetail.assignedCrew.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Assigned Crew</label>
                      <div className="flex flex-wrap gap-2">
                        {viewingJobDetail.assignedCrew.map(crewId => {
                          const employee = employees.find(e => e.id === crewId);
                          return (
                            <span key={crewId} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                              {employee?.name || crewId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {viewingJobDetail.equipmentNeeded && viewingJobDetail.equipmentNeeded.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Equipment Needed</label>
                      <div className="flex flex-wrap gap-2">
                        {viewingJobDetail.equipmentNeeded.map((eq, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingJobDetail.estimatedHours && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Estimated Hours</label>
                      <p className="text-white">{viewingJobDetail.estimatedHours} hours</p>
                    </div>
                  )}

                  {viewingJobDetail.riskLevel && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Risk Level</label>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        viewingJobDetail.riskLevel === 'Critical' ? 'bg-red-600 text-red-100' :
                        viewingJobDetail.riskLevel === 'High' ? 'bg-orange-600 text-orange-100' :
                        viewingJobDetail.riskLevel === 'Medium' ? 'bg-yellow-600 text-yellow-100' :
                        'bg-green-600 text-green-100'
                      }`}>
                        {viewingJobDetail.riskLevel}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'forms' && (
                <JobForms jobId={viewingJobDetail.id} />
              )}

              {activeTab === 'transitions' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Change Job State</h3>
                    {!viewingJobDetail.clientId || !viewingJobDetail.propertyId ? (
                      <div className="rounded-md border border-yellow-500 bg-yellow-900/40 text-yellow-100 p-4">
                        <p className="text-sm mb-3">Link a client and property before changing job states.</p>
                        <button
                          onClick={() => {
                            setAssociationJob(viewingJobDetail);
                            setShowAssociationModal(true);
                          }}
                          className="px-3 py-2 bg-yellow-500 text-yellow-900 rounded-md font-medium text-sm hover:bg-yellow-400"
                        >
                          Add associations
                        </button>
                      </div>
                    ) : (
                      <StateTransitionControl
                        jobId={viewingJobDetail.id}
                        currentState={viewingJobDetail.status}
                        onStateChanged={(newState) => handleStateChanged(viewingJobDetail.id, newState)}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <StateHistoryTimeline jobId={viewingJobDetail.id} />
              )}
            </div>
          </div>
        </div>
      )}

      <RecurringJobsPanel onJobCreated={handleRecurringJobCreated} />

      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleUseTemplate}
      />

      <InvoiceEditor
        isOpen={isInvoiceEditorOpen}
        onClose={() => setIsInvoiceEditorOpen(false)}
        onSave={handleInvoiceSaved}
        prefilledData={invoicePrefilledData}
      />
      <AssociationModal
        isOpen={showAssociationModal}
        onClose={() => {
          setShowAssociationModal(false);
          setAssociationJob(null);
        }}
        defaultName={associationJob?.customerName}
        onCreated={handleAssociationsCreated}
      />
    </div>
  );
};

export default Jobs;
