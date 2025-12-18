
import React from 'react';
import { Outlet } from 'react-router-dom';
import TreeIcon from './icons/TreeIcon';

const CustomerPortalLayout: React.FC = () => {
  return (
    <div className="bg-brand-gray-50 min-h-screen flex flex-col font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TreeIcon className="h-8 w-8 text-brand-green-600" />
              <span className="ml-3 text-xl font-bold text-brand-gray-800">TreePro AI</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
       <footer className="bg-white mt-8 border-t">
         <div className="mx-auto max-w-4xl py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-brand-gray-500">
           <p>&copy; {new Date().getFullYear()} TreePro AI. All rights reserved.</p>
           <p className="mt-1">Your trusted partner in professional tree care.</p>
         </div>
      </footer>
    </div>
  );
};

export default CustomerPortalLayout;
