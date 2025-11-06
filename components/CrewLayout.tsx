
import React from 'react';
import { Outlet } from 'react-router-dom';
import TreeIcon from './icons/TreeIcon';
import { useAuth } from '../contexts/AuthContext';

const CrewLayout: React.FC = () => {
  const { userName, isAuthenticated } = useAuth();

  return (
    <div className="bg-brand-gray-100 min-h-screen font-sans">
      <header className="bg-brand-gray-900 text-white shadow-md sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TreeIcon className="h-8 w-8 text-brand-green-400" />
              <span className="ml-3 text-xl font-bold">TreePro Crew</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{isAuthenticated && userName ? userName : 'Crew Member'}</p>
              <p className="text-xs text-brand-gray-400">Crew Member</p>
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CrewLayout;
