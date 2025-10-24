import React from 'react';
import QuickBooksIcon from '../components/icons/QuickBooksIcon';
import StripeIcon from '../components/icons/StripeIcon';
import GoogleCalendarIcon from '../components/icons/GoogleCalendarIcon';

const Settings: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Settings</h1>
      <p className="mt-2 text-sm text-brand-gray-700">Manage your profile, company information, and application settings.</p>

      <div className="mt-8 space-y-12">
        {/* My Profile Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">My Profile</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Update your personal information and password.</p>
          </div>

          <form className="md:col-span-2">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="first-name" className="block text-sm font-medium leading-6 text-brand-gray-900">First name</label>
                <div className="mt-2">
                  <input type="text" name="first-name" id="first-name" autoComplete="given-name" defaultValue="Admin" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="last-name" className="block text-sm font-medium leading-6 text-brand-gray-900">Last name</label>
                <div className="mt-2">
                  <input type="text" name="last-name" id="last-name" autoComplete="family-name" defaultValue="User" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-gray-900">Email address</label>
                <div className="mt-2">
                  <input id="email" name="email" type="email" autoComplete="email" defaultValue="admin@tree-pro.ai" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-x-6">
                <button type="button" className="text-sm font-semibold leading-6 text-brand-gray-900">Change Password</button>
                <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">Save Profile</button>
            </div>
          </form>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Company Information Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Company Information</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">This information will be displayed on quotes and invoices.</p>
          </div>

          <form className="md:col-span-2">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-4">
                    <label htmlFor="company-name" className="block text-sm font-medium leading-6 text-brand-gray-900">Company Name</label>
                    <input type="text" name="company-name" id="company-name" defaultValue="TreePro AI Services" className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                </div>
                <div className="col-span-full">
                    <label htmlFor="company-address" className="block text-sm font-medium leading-6 text-brand-gray-900">Address</label>
                    <input type="text" name="company-address" id="company-address" defaultValue="123 Arborist Ave, Suite 100, Greendale, USA" className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-green-600 sm:text-sm sm:leading-6" />
                </div>
                 <div className="col-span-full">
                    <label htmlFor="photo" className="block text-sm font-medium leading-6 text-brand-gray-900">Company Logo</label>
                    <div className="mt-2 flex items-center gap-x-3">
                      <svg className="h-12 w-12 text-brand-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                      </svg>
                      <button type="button" className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Change</button>
                    </div>
                </div>
            </div>
             <div className="mt-6 flex items-center justify-end gap-x-6">
                <button type="submit" className="rounded-md bg-brand-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600">Save Company Info</button>
            </div>
          </form>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Integrations Section */}
         <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Integrations</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Connect TreePro AI with other services.</p>
          </div>
          <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <QuickBooksIcon className="w-8 h-8 mr-4" />
                    <div>
                        <h3 className="font-semibold text-brand-gray-800">QuickBooks</h3>
                        <p className="text-sm text-brand-gray-500">Sync invoices and payments automatically.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <StripeIcon className="w-8 h-8 mr-4" />
                     <div>
                        <h3 className="font-semibold text-brand-gray-800">Stripe</h3>
                        <p className="text-sm text-brand-gray-500">Process online payments for invoices.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <GoogleCalendarIcon className="w-8 h-8 mr-4" />
                     <div>
                        <h3 className="font-semibold text-brand-gray-800">Google Calendar</h3>
                        <p className="text-sm text-brand-gray-500">Sync job schedules with your calendar.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;