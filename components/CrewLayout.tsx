import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import TreeIcon from './icons/TreeIcon';
import CrewSyncBanner from './CrewSyncBanner';
import { CrewSyncProvider } from '../contexts/CrewSyncContext';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import JobIcon from './icons/JobIcon';
import EmployeeIcon from './icons/EmployeeIcon';

const CrewLayout: React.FC = () => {
  const currentUser = { name: 'Mike Miller', role: 'Crew Leader' };
  const location = useLocation();

  const navItems = [
    { to: '/crew', label: 'Today', Icon: CalendarDaysIcon, exact: true },
    { to: '/crew/jobs', label: 'All Jobs', Icon: JobIcon },
    { to: '/crew/profile', label: 'Profile', Icon: EmployeeIcon },
  ];

  return (
    <CrewSyncProvider>
      <div className="bg-brand-gray-100 min-h-screen font-sans pb-20">
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
        <nav className="fixed bottom-0 left-0 right-0 bg-brand-gray-900 border-t border-brand-gray-700 z-20 safe-area-inset-bottom">
          <div className="mx-auto max-w-4xl flex items-center justify-around h-16">
            {navItems.map(({ to, label, Icon, exact }) => {
              const isActive = exact 
                ? location.pathname === to 
                : location.pathname.startsWith(to);
              
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors ${
                    isActive 
                      ? 'text-brand-green-400' 
                      : 'text-brand-gray-400 hover:text-brand-gray-200'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs mt-1 font-medium">{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </CrewSyncProvider>
  );
};

export default CrewLayout;
