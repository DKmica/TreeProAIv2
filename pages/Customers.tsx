import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

interface AddCustomerFormProps {
    onSave: (customer: Omit<Customer, 'id' | 'coordinates' | 'user_id' | 'created_at' | 'address' | 'lat' | 'lng'>) => void;
    onCancel: () => void;
}

const AddCustomerForm: React.FC<AddCustomerFormProps> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zip_code: ''
    });

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
            <h2 className="text-xl font-bold text-brand-navy-900 mb-4">Add New Customer</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3"><label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-navy-900">Full Name</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-navy-900">Email Address</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-3"><label htmlFor="phone" className="block text-sm font-medium leading-6 text-brand-navy-900">Phone Number</label><input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="col-span-full"><label htmlFor="street" className="block text-sm font-medium leading-6 text-brand-navy-900">Street Address</label><input type="text" name="street" id="street" value={formData.street} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-2"><label htmlFor="city" className="block text-sm font-medium leading-6 text-brand-navy-900">City</label><input type="text" name="city" id="city" value={formData.city} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-2"><label htmlFor="state" className="block text-sm font-medium leading-6 text-brand-navy-900">State / Province</label><input type="text" name="state" id="state" value={formData.state} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                    <div className="sm:col-span-2"><label htmlFor="zip_code" className="block text-sm font-medium leading-6 text-brand-navy-900">ZIP / Postal code</label><input type="text" name="zip_code" id="zip_code" value={formData.zip_code} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-brand-navy-900 shadow-sm ring-1 ring-inset ring-brand-navy-300 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-600 sm:text-sm sm:leading-6" /></div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6"><button type="button" onClick={onCancel} className="text-sm font-semibold leading-6 text-brand-navy-900">Cancel</button><button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-600">Save Customer</button></div>
            </form>
        </div>
    );
};

interface CustomersProps {
    customers: Customer[];
    setCustomers: (updateFn: (prev: Customer[]) => Customer[]) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers }) => {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'coordinates' | 'user_id' | 'created_at' | 'address' | 'lat' | 'lng'>) => {
    if (!session) return;
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...customerData, user_id: session.user.id })
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else if (data) {
      const fullAddress = [data.street, data.city, data.state, data.zip_code].filter(Boolean).join(', ');
      let coordinates = { lat: 0, lng: 0 };

      if (fullAddress) {
        try {
          const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode', {
            body: { address: fullAddress },
          });

          if (geoError) throw geoError;
          
          if (geoData.lat && geoData.lng) {
            coordinates = { lat: geoData.lat, lng: geoData.lng };
            await supabase
              .from('customers')
              .update({ lat: coordinates.lat, lng: coordinates.lng })
              .eq('id', data.id);
          }
        } catch (e: any) {
          console.error("Geocoding failed:", e);
          alert("Customer created, but their address could not be located on the map. Please verify the address details.");
        }
      }

      const newCustomer = {
        ...data,
        lat: coordinates.lat,
        lng: coordinates.lng,
        address: fullAddress,
        coordinates: coordinates
      };
      setCustomers(prev => [newCustomer, ...prev]);
      setShowAddForm(false);
    }
  };

  const filteredCustomers = useMemo(() => customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  ), [customers, searchTerm]);

  return (
    <div>
      <div className="sm:flex sm:items-center"><div className="sm:flex-auto"><h1 className="text-2xl font-bold text-brand-navy-900">Customers</h1><p className="mt-2 text-sm text-brand-navy-700">A list of all customers.</p></div><div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none"><button type="button" onClick={() => setShowAddForm(s => !s)} className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 sm:w-auto">{showAddForm ? 'Cancel' : 'Add Customer'}</button></div></div>
      {showAddForm && <AddCustomerForm onSave={handleSaveCustomer} onCancel={() => setShowAddForm(false)} />}
      <div className="mt-6"><input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full max-w-sm rounded-md border-brand-navy-300 shadow-sm focus:border-brand-cyan-500 focus:ring-brand-cyan-500 sm:text-sm" aria-label="Search customers" /></div>
      <div className="mt-4 flex flex-col"><div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8"><div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8"><div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"><table className="min-w-full divide-y divide-brand-navy-300"><thead className="bg-brand-navy-50"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brand-navy-900 sm:pl-6">Name</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Email</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Phone</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brand-navy-900">Address</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th></tr></thead><tbody className="divide-y divide-brand-navy-200 bg-white">{filteredCustomers.map((customer) => (<tr key={customer.id}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brand-navy-900 sm:pl-6">{customer.name}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{customer.email}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500">{customer.phone}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-brand-navy-500"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`} target="_blank" rel="noopener noreferrer" className="text-brand-cyan-600 hover:text-brand-cyan-900 hover:underline">{customer.address}</a></td><td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"><a href="#" className="text-brand-cyan-600 hover:text-brand-cyan-900">Edit</a></td></tr>))}</tbody></table></div></div></div></div>
    </div>
  );
};

export default Customers;