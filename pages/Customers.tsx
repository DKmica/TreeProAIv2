import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Customer } from '../types';

interface CustomerFormProps {
    onSave: (customer: Partial<Customer>) => void;
    onCancel: () => void;
    initialData?: Customer | null;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSave, onCancel, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                email: initialData.email,
                phone: initialData.phone,
                address: initialData.address,
            });
        } else {
             setFormData({
                name: '',
                email: '',
                phone: '',
                address: ''
            });
        }
    }, [initialData]);

    const isEditing = !!initialData;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow my-6">
            <h2 className="text-xl font-bold text-brand-gray-900 mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-gray-900">Full Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-gray-900">Email Address</label>
                        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="phone" className="block text-sm font-medium leading-6 text-brand-gray-900">Phone Number</label>
                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="address" className="block text-sm font-medium leading-6 text-brand-gray-900">Address</label>
                        <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-gray-900">Cancel</button>
                    <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">{isEditing ? 'Save Changes' : 'Save Customer'}</button>
                </div>
            </form>
        </div>
    );
};

interface CustomersProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openCreateForm) {
        setEditingCustomer(null);
        setShowForm(true);
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);


  const handleCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };
  
  const handleMainButtonClick = () => {
      if (showForm) {
          handleCancel();
      } else {
          setEditingCustomer(null);
          setShowForm(true);
      }
  };
  
  const handleEditClick = (customer: Customer) => {
      setEditingCustomer(customer);
      setShowForm(true);
  };

  const handleArchiveCustomer = (customerId: string) => {
      if (window.confirm('Are you sure you want to archive this customer?')) {
          setCustomers(prev => prev.filter(c => c.id !== customerId));
      }
  };

  const handleSaveCustomer = (customerData: Partial<Customer>) => {
    if (editingCustomer) {
        // Update
        setCustomers(prev => prev.map(c => 
            c.id === editingCustomer.id ? { ...c, ...customerData } as Customer : c
        ));
    } else {
        // Create
        const newCustomer: Customer = {
          id: `cust-${Date.now()}`,
          name: customerData.name || 'N/A',
          email: customerData.email || 'N/A',
          phone: customerData.phone || 'N/A',
          address: customerData.address || 'N/A',
          coordinates: { lat: 0, lng: 0 } // Default coordinates
        };
        setCustomers(prev => [newCustomer, ...prev]);
    }
    handleCancel();
  };

  const filteredCustomers = useMemo(() => customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  ), [customers, searchTerm]);

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-brand-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-brand-gray-700">A list of all customers.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button 
            type="button" 
            onClick={handleMainButtonClick}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 sm:w-auto">
            {showForm ? 'Cancel' : 'Add Customer'}
          </button>
        </div>
      </div>

      {showForm && <CustomerForm onSave={handleSaveCustomer} onCancel={handleCancel} initialData={editingCustomer} />}

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full max-w-sm rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm"
          aria-label="Search customers"
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
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Email</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Phone</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-gray-900">Address</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-200 bg-white">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-gray-900 sm:pl-6">{customer.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{customer.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">{customer.phone}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brand-gray-500">
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`} target="_blank" rel="noopener noreferrer" className="text-brand-green-600 hover:text-brand-green-900 hover:underline">
                          {customer.address}
                        </a>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => handleEditClick(customer)} className="text-brand-green-600 hover:text-brand-green-900">Edit</button>
                        <button onClick={() => handleArchiveCustomer(customer.id)} className="ml-4 text-red-600 hover:text-red-900">Archive</button>
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

export default Customers;
