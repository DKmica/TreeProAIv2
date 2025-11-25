
import React from 'react';
import { Outlet } from 'react-router-dom';
import TreeIcon from './icons/TreeIcon';
import CrewSyncBanner from './CrewSyncBanner';
import { CrewSyncProvider } from '../contexts/CrewSyncContext';

const CrewLayout: React.FC = () => {
  // Simulate a logged-in user for demonstration
  const currentUser = { name: 'Mike Miller', role: 'Crew Leader' };

  return (
    <CrewSyncProvider>
      <div className="bg-brand-gray-100 min-h-screen font-sans">
        <header className="bg-brand-gray-900 text-white shadow-md sticky top-0 z-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <TreeIcon className="h-8 w-8 text-brand-green-400" />
                <span className="ml-3 text-xl font-bold">TreePro Crew</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-brand-gray-400">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-4">
            <CrewSyncBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </CrewSyncProvider>
  );
};

export default CrewLayout;
