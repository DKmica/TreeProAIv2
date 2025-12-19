import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Job, Quote, Invoice, Employee, LineItem, JobCost, PortalMessage, CustomerDetailsInput } from '../types';
import ClipboardSignatureIcon from '../components/icons/ClipboardSignatureIcon';
import ChatBubbleLeftRightIcon from '../components/icons/ChatBubbleLeftRightIcon';
import { Download, Mail } from 'lucide-react';
import PortalMessaging from '../components/PortalMessaging';
import JobStatusBadge from '../components/JobStatusBadge';
import StateTransitionControl from '../components/StateTransitionControl';
import StateHistoryTimeline from '../components/StateHistoryTimeline';
import XIcon from '../components/icons/XIcon';
import TemplateSelector from '../components/TemplateSelector';
import InvoiceEditor from '../components/InvoiceEditor';
import { generateJobRiskAssessment } from '../services/geminiService';
import * as api from '../services/apiService';
import AssociationModal from '../components/AssociationModal';
import RecurringJobsPanel from '../components/RecurringJobsPanel';
import { formatPhone, formatZip, formatState, parseEquipment, lookupZipCode } from '../utils/formatters';
import StateSelect from '../components/ui/StateSelect';
import { useJobsQuery, useQuotesQuery, useInvoicesQuery, useEmployeesQuery } from '../hooks/useDataQueries';


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
        customerPhone: initialData?.customerPhone || '',
        customerEmail: initialData?.customerEmail || '',
        customerAddress: initialData?.customerAddress || '',
        scheduledDate: initialData?.scheduledDate || '',
        status: initialData?.status || ('draft' as Job['status']),
        assignedCrew: initialData?.assignedCrew || [],
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
    const [equipmentText, setEquipmentText] = useState<string>(
        initialData?.equipmentNeeded?.join(', ') || ''
    );

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id,
                quoteId: initialData.quoteId,
                customerName: initialData.customerName,
                customerPhone: initialData.customerPhone || '',
                customerEmail: initialData.customerEmail || '',
                customerAddress: initialData.customerAddress || '',
                scheduledDate: initialData.scheduledDate,
                status: initialData.status,
                assignedCrew: initialData.assignedCrew,
                jobLocation: initialData.jobLocation || '',
                specialInstructions: initialData.specialInstructions || '',
                equipmentNeeded: initialData.equipmentNeeded || [],
                estimatedHours: initialData.estimatedHours || 0,
            });
            setEquipmentText(initialData.equipmentNeeded?.join(', ') || '');
            setCustomerMode(initialData.quoteId ? 'existing' : 'new');
        } else {
            const defaultQuote = availableQuotes.length > 0 ? availableQuotes[0] : null;
            setFormData({
                id: '',
                quoteId: defaultQuote?.id || '',
                customerName: defaultQuote?.customerName || '',
                customerPhone: '',
                customerEmail: '',
                customerAddress: '',
                scheduledDate: '',
                status: 'draft',
                assignedCrew: [],
                jobLocation: '',
                specialInstructions: '',
                equipmentNeeded: [],
                estimatedHours: 0,
            });
            setEquipmentText('');
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

    const [lastFetchedQuoteId, setLastFetchedQuoteId] = React.useState<string>('');
    
    useEffect(() => {
        const fetchQuoteDetails = async () => {
            if (!formData.quoteId || formData.quoteId === lastFetchedQuoteId || quotes.length === 0) {
                return;
            }
            
            const selectedQuote = quotes.find(q => q.id === formData.quoteId);
            if (!selectedQuote?.clientId) {
                console.log('No clientId found for quote:', formData.quoteId, 'selectedQuote:', selectedQuote);
                return;
            }
            
            try {
                // Fetch client for customer contact info
                const client = await api.clientService.getById(selectedQuote.clientId);
                const phone = client.primaryPhone || '';
                const email = client.primaryEmail || '';
                const address = [
                    client.billingAddressLine1,
                    client.billingCity,
                    client.billingState,
                    (client as any).billingZipCode || client.billingZip
                ].filter(Boolean).join(', ') || '';
                
                setFormData(prev => ({
                    ...prev,
                    customerPhone: phone,
                    customerEmail: email,
                    customerAddress: address
                }));
                
                // Fetch property for job location
                if (selectedQuote.propertyId) {
                    const property = await api.propertyService.getById(selectedQuote.propertyId);
                    setJobLocationData({
                        addressLine1: property.addressLine1 || '',
                        addressLine2: property.addressLine2 || '',
                        city: property.city || '',
                        state: property.state || '',
                        zipCode: property.zipCode || '',
                    });
                }
                
                setLastFetchedQuoteId(formData.quoteId);
            } catch (e) {
                console.error('Failed to fetch quote details:', e);
            }
        };
        fetchQuoteDetails();
    }, [formData.quoteId, quotes, lastFetchedQuoteId]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'quoteId') {
            const selectedQuote = quotes.find(q => q.id === value);
            setFormData(prev => ({
                ...prev,
                quoteId: selectedQuote ? selectedQuote.id : '',
                customerName: selectedQuote ? selectedQuote.customerName : '',
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
                customerName: ''
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
                equipmentNeeded: parseEquipment(equipmentText),
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
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium leading-6 text-gray-300">Customer Phone</label>
                                <input type="text" value={formData.customerPhone} readOnly className="block w-full rounded-md border-0 py-1.5 bg-gray-700 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-600 sm:text-sm sm:leading-6" />
                            </div>
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium leading-6 text-gray-300">Customer Email</label>
                                <input type="text" value={formData.customerEmail} readOnly className="block w-full rounded-md border-0 py-1.5 bg-gray-700 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-600 sm:text-sm sm:leading-6" />
                            </div>
                            <div className="sm:col-span-6">
                                <label className="block text-sm font-medium leading-6 text-gray-300">Customer Address</label>
                                <input type="text" value={formData.customerAddress} readOnly className="block w-full rounded-md border-0 py-1.5 bg-gray-700 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-600 sm:text-sm sm:leading-6" />
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
                                    <StateSelect
                                        id="state"
                                        name="state"
                                        value={newCustomerData.state}
                                        onChange={(value) => {
                                            setNewCustomerData(prev => ({ ...prev, state: value }));
                                            if (errors.state) {
                                                setErrors(prev => ({ ...prev, state: '' }));
                                            }
                                        }}
                                        required
                                        className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
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
                            <option value="draft">Draft</option>
                            <option value="needs_permit">Needs Permit</option>
                            <option value="waiting_on_client">Waiting on Client</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="en_route">En Route</option>
                            <option value="on_site">On Site</option>
                            <option value="weather_hold">Weather Hold</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="invoiced">Invoiced</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
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
                                <StateSelect
                                    id="locationState"
                                    name="state"
                                    value={jobLocationData.state}
                                    onChange={(value) => setJobLocationData(prev => ({ ...prev, state: value }))}
                                    className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6"
                                />
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
                        <input type="text" name="equipmentNeeded" id="equipmentNeeded" value={equipmentText} onChange={e => setEquipmentText(e.target.value)} onBlur={e => setFormData(prev => ({...prev, equipmentNeeded: parseEquipment(e.target.value) }))} placeholder="e.g. Chainsaw, Chipper, Stump Grinder" className="block w-full rounded-md border-0 py-1.5 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6" />
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

const Jobs: React.FC = () => {
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useJobsQuery();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotesQuery();
  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useInvoicesQuery();
  const { data: employees = [], isLoading: employeesLoading } = useEmployeesQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [linkCopied, setLinkCopied] = useState('');
  const [viewingMessages, setViewingMessages] = useState<Job | null>(null);
  const [viewingJobDetail, setViewingJobDetail] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
  const [invoicePrefilledData, setInvoicePrefilledData] = useState<{ customerName?: string; customerEmail?: string; customerPhone?: string; customerAddress?: string; jobId?: string; lineItems?: LineItem[] } | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const [linkageWarnings, setLinkageWarnings] = useState<string[]>([]);
  const [associationJob, setAssociationJob] = useState<Job | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [showJobEmailModal, setShowJobEmailModal] = useState(false);
  const [emailModalJob, setEmailModalJob] = useState<Job | null>(null);
  const [jobEmailRecipient, setJobEmailRecipient] = useState('');
  const [jobEmailSubject, setJobEmailSubject] = useState('');
  const [jobEmailMessage, setJobEmailMessage] = useState('');
  const [isSendingJobEmail, setIsSendingJobEmail] = useState(false);

  useEffect(() => {
    if (location.state?.openCreateForm) {
        setEditingJob(null);
        setShowForm(true);
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const warnings = jobs
      .filter(job => job.status === 'completed' && !invoices.some(inv => inv.jobId === job.id))
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
          refetchJobs();
      } catch (error: any) {
          console.error('Failed to archive job', error);
          alert(`Failed to archive job: ${error.message || 'Unknown error'}`);
      }
  };

  const handleSave = async (jobData: Job | Omit<Job, 'id'>) => {
      try {
          if ('id' in jobData && jobData.id) { // Editing
              const { id, ...updatePayload } = jobData as Job;
              await api.jobService.update(id, updatePayload);
              refetchJobs();
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

              let createdJob: Job;

              if (jobData.quoteId) {
                  const convertedJob = await api.quoteService.convertToJob(jobData.quoteId);
                  const updatePayload = {
                      ...newJobPayload,
                      clientId: convertedJob.clientId,
                      propertyId: convertedJob.propertyId,
                      quoteId: convertedJob.quoteId,
                  } as Partial<Job>;

                  await api.jobService.update(convertedJob.id, updatePayload);
              } else {
                  await api.jobService.create(newJobPayload);
              }

              refetchJobs();
          }
          handleCancel();
      } catch (error: any) {
          console.error('Failed to save job', error);
          alert(`Failed to save job: ${api.getApiErrorMessage(error, 'Unknown error')}`);
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
      customerEmail: job.customerEmail || '',
      customerPhone: job.customerPhone || '',
      customerAddress: job.customerAddress || '',
      jobId: job.id,
      lineItems: lineItems
    });
    setIsInvoiceEditorOpen(true);
  };

  const handleInvoiceSaved = () => {
    refetchInvoices();
    alert('Invoice created successfully!');
  };

  const handleCopyLink = (jobId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/portal/job/${jobId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(jobId);
    setTimeout(() => setLinkCopied(''), 2000);
  };
  
  const handleSendMessage = async (text: string) => {
    if (!viewingMessages) return;
    const newMessage: PortalMessage = {
        sender: 'company',
        text,
        timestamp: new Date().toISOString(),
    };
    try {
      await api.jobService.update(viewingMessages.id, { 
        messages: [...(viewingMessages.messages || []), newMessage] 
      });
      refetchJobs();
      setViewingMessages(prev => prev ? { ...prev, messages: [...(prev.messages || []), newMessage] } : null);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: Job['status']) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;

      let updatePayload: Partial<Job> = { status: newStatus };

      if (newStatus === 'completed' && !job.costs) {
        let laborCost = 0;
        if (job.workStartedAt && job.workEndedAt && job.assignedCrew.length > 0) {
          const startTime = new Date(job.workStartedAt).getTime();
          const endTime = new Date(job.workEndedAt).getTime();
          const durationHours = (endTime - startTime) / (1000 * 60 * 60);

          const totalCrewHourlyRate = job.assignedCrew.reduce((sum, empId) => {
            const employee = employees.find(e => e.id === empId);
            return sum + (employee?.payRate || 0);
          }, 0);
          
          laborCost = durationHours * totalCrewHourlyRate;
        }

        const equipmentCost = 100;
        const materialsCost = 20;
        const disposalCost = 80;
        const totalCost = laborCost + equipmentCost + materialsCost + disposalCost;

        updatePayload.costs = {
          labor: parseFloat(laborCost.toFixed(2)),
          equipment: equipmentCost,
          materials: materialsCost,
          disposal: disposalCost,
          total: parseFloat(totalCost.toFixed(2)),
        };
      }

      await api.jobService.update(jobId, updatePayload);
      refetchJobs();
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  const handleStateChanged = async (jobId: string, newState: string) => {
    try {
      const updatedJob = await api.jobService.getById(jobId);
      refetchJobs();
      if (viewingJobDetail?.id === jobId) {
        setViewingJobDetail(updatedJob);
      }
    } catch (error: any) {
      console.error('Failed to refresh job after state change:', error);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      await api.jobTemplateService.useTemplate(templateId);
      refetchJobs();
      setShowTemplateSelector(false);
    } catch (error: any) {
      console.error('Failed to create job from template:', error);
      alert(`Failed to create job from template: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRecurringJobCreated = () => {
    refetchJobs();
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
      refetchJobs();
      setViewingJobDetail(prev => (prev && prev.id === updated.id ? updated : prev));
      setAssociationJob(null);
      setShowAssociationModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to attach associations');
    }
  };

  const handleDownloadJobPdf = async (job: Job) => {
    try {
      await api.jobService.downloadPdf(job.id);
    } catch (error: any) {
      console.error('Failed to download work order PDF:', error);
      alert(`Failed to download work order: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSendJobPdf = (job: Job) => {
    setEmailModalJob(job);
    setJobEmailRecipient('');
    setJobEmailSubject(`Work Order - ${job.customerName}`);
    setJobEmailMessage('');
    setShowJobEmailModal(true);
  };

  const handleSendJobEmail = async () => {
    if (!emailModalJob || !jobEmailRecipient.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }

    setIsSendingJobEmail(true);
    try {
      await api.jobService.sendPdf(
        emailModalJob.id,
        jobEmailRecipient.trim(),
        jobEmailSubject || undefined,
        jobEmailMessage || undefined
      );
      alert('Work order sent successfully!');
      setShowJobEmailModal(false);
      setEmailModalJob(null);
    } catch (error: any) {
      console.error('Failed to send work order:', error);
      alert(`Failed to send work order: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSendingJobEmail(false);
    }
  };

  const isLoading = jobsLoading || quotesLoading || invoicesLoading || employeesLoading;

  const filteredJobs = useMemo(() => jobs.filter(job =>
    Object.values(job).some(value => value.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  ), [jobs, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan-600"></div>
        <span className="ml-2 text-brand-gray-600">Loading jobs...</span>
      </div>
    );
  }

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
                      const canCreateInvoice = !isInvoiceCreated && job.status === 'completed';
                      const portalUrl = `#/portal/job/${job.id}`;
                      return (
                        <tr key={job.id} onClick={() => handleViewDetails(job)} className="cursor-pointer hover:bg-brand-gray-50 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">
                            <div className="flex items-center">
                                {job.jobNumber || job.id}
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
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2" onClick={(e) => e.stopPropagation()}>
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
                                title={isInvoiceCreated ? "Invoice already exists" : job.status !== 'completed' ? "Job must be completed" : "Create Invoice"}
                                className="ml-2 rounded bg-brand-green-50 px-2 py-1 text-xs font-semibold text-brand-green-600 shadow-sm hover:bg-brand-green-100 disabled:bg-brand-gray-100 disabled:text-brand-gray-400 disabled:cursor-not-allowed">
                                Invoice
                            </button>
                            <button 
                                type="button" 
                                onClick={() => handleDownloadJobPdf(job)}
                                title="Download Work Order"
                                className="ml-2 p-1 text-brand-gray-500 hover:text-brand-cyan-600 transition-colors">
                                <Download className="h-4 w-4" />
                            </button>
                            <button 
                                type="button" 
                                onClick={() => handleSendJobPdf(job)}
                                title="Send Work Order"
                                className="ml-1 p-1 text-brand-gray-500 hover:text-brand-cyan-600 transition-colors">
                                <Mail className="h-4 w-4" />
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
          const canCreateInvoice = !isInvoiceCreated && job.status === 'completed';
          const portalUrl = `#/portal/job/${job.id}`;
          return (
            <div key={job.id} onClick={() => handleViewDetails(job)} className="bg-white rounded-lg shadow p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-brand-gray-900">{job.jobNumber || job.id}</h3>
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

              <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-gray-100" onClick={(e) => e.stopPropagation()}>
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

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button 
                  type="button" 
                  onClick={() => handleCreateInvoice(job)}
                  disabled={!canCreateInvoice}
                  title={isInvoiceCreated ? "Invoice already exists" : job.status !== 'completed' ? "Job must be completed" : "Create Invoice"}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-brand-green-50 text-brand-green-600 hover:bg-brand-green-100 disabled:bg-brand-gray-100 disabled:text-brand-gray-400 disabled:cursor-not-allowed"
                >
                  Invoice
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDownloadJobPdf(job)}
                  title="Download Work Order"
                  className="px-3 py-2 text-sm font-medium text-brand-gray-600 hover:text-brand-cyan-600 border border-brand-gray-300 rounded-md hover:bg-brand-gray-50"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSendJobPdf(job)}
                  title="Send Work Order"
                  className="px-3 py-2 text-sm font-medium text-brand-gray-600 hover:text-brand-cyan-600 border border-brand-gray-300 rounded-md hover:bg-brand-gray-50"
                >
                  <Mail className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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

      {showJobEmailModal && emailModalJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowJobEmailModal(false)}
        >
          <div
            className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Send Work Order</h2>
              <button
                onClick={() => setShowJobEmailModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                type="button"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="emailRecipient" className="block text-sm font-medium text-gray-300 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  id="emailRecipient"
                  value={jobEmailRecipient}
                  onChange={(e) => setJobEmailRecipient(e.target.value)}
                  placeholder="customer@example.com"
                  className="block w-full rounded-md border-0 py-2 px-3 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="emailSubject" className="block text-sm font-medium text-gray-300 mb-1">
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  id="emailSubject"
                  value={jobEmailSubject}
                  onChange={(e) => setJobEmailSubject(e.target.value)}
                  placeholder="Work Order"
                  className="block w-full rounded-md border-0 py-2 px-3 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="emailMessage" className="block text-sm font-medium text-gray-300 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  id="emailMessage"
                  value={jobEmailMessage}
                  onChange={(e) => setJobEmailMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a personal message..."
                  className="block w-full rounded-md border-0 py-2 px-3 bg-gray-800 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div className="text-sm text-gray-400">
                Work order for: <span className="text-white font-medium">{emailModalJob.customerName}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setShowJobEmailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                disabled={isSendingJobEmail}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendJobEmail}
                disabled={isSendingJobEmail || !jobEmailRecipient.trim()}
                className="px-4 py-2 text-sm font-medium rounded-md bg-cyan-600 text-white shadow-sm hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {isSendingJobEmail ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
