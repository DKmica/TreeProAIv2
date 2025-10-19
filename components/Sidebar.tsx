import React from 'react';
import { NavLink } from 'react-router-dom';
import DashboardIcon from './icons/DashboardIcon';
import LeadIcon from './icons/LeadIcon';
import QuoteIcon from './icons/QuoteIcon';
import JobIcon from './icons/JobIcon';
import CustomerIcon from './icons/CustomerIcon';
import InvoiceIcon from './icons/InvoiceIcon';
import EquipmentIcon from './icons/EquipmentIcon';
import CalendarIcon from './icons/CalendarIcon';
import MarketingIcon from './icons/MarketingIcon';
import AICoreIcon from './icons/AICoreIcon';
import HRIcon from './icons/HRIcon';
import FinancialsIcon from './icons/FinancialsIcon';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'AI Core', href: '/ai-core', icon: AICoreIcon },
  { name: 'Leads', href: '/leads', icon: LeadIcon },
  { name: 'Quotes', href: '/quotes', icon: QuoteIcon },
  { name: 'Jobs', href: '/jobs', icon: JobIcon },
  { name: 'Customers', href: '/customers', icon: CustomerIcon },
  { name: 'Invoices', href: '/invoices', icon: InvoiceIcon },
  { name: 'Financials', href: '/financials', icon: FinancialsIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Human Resources', href: '/hr', icon: HRIcon },
  { name: 'Equipment', href: '/equipment', icon: EquipmentIcon },
  { name: 'Marketing', href: '/marketing', icon: MarketingIcon },
];

const Sidebar: React.FC<{ sidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }> = ({ sidebarOpen, setSidebarOpen }) => {
  const NavLinks = () => (
    <>
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActive
                ? 'bg-brand-cyan-700 text-white'
                : 'text-brand-navy-200 hover:bg-brand-cyan-800 hover:text-white'
            }`
          }
        >
          <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
          {item.name}
        </NavLink>
      ))}
    </>
  );

  return (
    <>
      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-brand-navy-900">
          <div className="flex h-16 flex-shrink-0 items-center bg-brand-navy-950 px-4">
            <img src="/logo.jpg" alt="TreePro AI Logo" className="h-10 w-10 rounded-full" />
            <span className="ml-3 text-xl font-bold text-white">TreePro AI</span>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              <NavLinks />
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
        {/* Off-canvas menu overlay, show/hide based on sidebar state */}
        <div className="fixed inset-0 bg-brand-navy-900 bg-opacity-75" aria-hidden="true" onClick={() => setSidebarOpen(false)}></div>
        
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-brand-navy-900">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button type="button" className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={() => setSidebarOpen(false)}>
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex h-16 flex-shrink-0 items-center bg-brand-navy-950 px-4">
            <img src="/logo.jpg" alt="TreePro AI Logo" className="h-10 w-10 rounded-full" />
            <span className="ml-3 text-xl font-bold text-white">TreePro AI</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="space-y-1 px-2 py-4">
              <NavLinks />
            </nav>
          </div>
        </div>

        <div className="w-14 flex-shrink-0"></div>
      </div>
    </>
  );
};

export default Sidebar;