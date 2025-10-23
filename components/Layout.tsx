
import React, { useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import HelpBot from './HelpBot';
import { Customer, Lead, Quote, Job, Invoice, Employee, Equipment } from '../types';


interface AppData {
  customers: Customer[];
  leads: Lead[];
  quotes: Quote[];
  jobs: Job[];
  invoices: Invoice[];
  employees: Employee[];
  equipment: Equipment[];
}

interface LayoutProps {
  appData: AppData;
}

const Layout: React.FC<LayoutProps> = ({ appData }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <HelpBot currentLocation={location.pathname} appData={appData} />
    </div>
  );
};

export default Layout;
