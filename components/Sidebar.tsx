import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import DashboardIcon from './icons/DashboardIcon';
import JobIcon from './icons/JobIcon';
import CustomerIcon from './icons/CustomerIcon';
import InvoiceIcon from './icons/InvoiceIcon';
import EmployeeIcon from './icons/EmployeeIcon';
import EquipmentIcon from './icons/EquipmentIcon';
import CalendarIcon from './icons/CalendarIcon';
import MarketingIcon from './icons/MarketingIcon';
import AICoreIcon from './icons/AICoreIcon';
import SparklesIcon from './icons/SparklesIcon';
import ChatIcon from './icons/ChatIcon';
import DollarIcon from './icons/DollarIcon';
import CogIcon from './icons/CogIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import UsersIcon from './icons/UsersIcon';
import ClockIcon from './icons/ClockIcon';
import ClipboardDocumentListIcon from './icons/ClipboardDocumentListIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

type NavigationItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };

const pinnedNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
];

const groupedNavigation: {
  title: string;
  items: NavigationItem[];
  collapsible?: boolean;
}[] = [
  {
    title: 'Sales',
    items: [
      { name: 'CRM', href: '/crm', icon: CustomerIcon },
      { name: 'AI Estimator', href: '/ai-tree-estimator', icon: SparklesIcon },
      { name: 'Estimate Analytics', href: '/estimate-feedback-analytics', icon: DocumentTextIcon },
      { name: 'Chat', href: '/chat', icon: ChatIcon },
    ],
  },
  {
    title: 'Work',
    items: [
      { name: 'Jobs', href: '/jobs', icon: JobIcon },
      { name: 'Templates', href: '/job-templates', icon: DocumentTextIcon },
      { name: 'Forms', href: '/forms', icon: ClipboardDocumentListIcon },
      { name: 'Crews', href: '/crews', icon: UsersIcon },
      { name: 'Time Tracking', href: '/time-tracking', icon: ClockIcon },
      { name: 'Employees', href: '/employees', icon: EmployeeIcon },
      { name: 'Equipment', href: '/equipment', icon: EquipmentIcon },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Invoices', href: '/invoices', icon: InvoiceIcon },
      { name: 'Profitability', href: '/profitability', icon: DollarIcon },
      { name: 'Payroll', href: '/payroll', icon: DollarIcon },
    ],
  },
  {
    title: 'Marketing',
    collapsible: true,
    items: [{ name: 'Marketing', href: '/marketing', icon: MarketingIcon }],
  },
  {
    title: 'AI Core',
    collapsible: true,
    items: [{ name: 'AI Core', href: '/ai-core', icon: AICoreIcon }],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Settings', href: '/settings', icon: CogIcon },
      { name: 'Exception Queue', href: '/exception-queue', icon: ExclamationTriangleIcon },
    ],
  },
];

const Sidebar: React.FC<{ sidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }> = ({ sidebarOpen, setSidebarOpen }) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    Marketing: true,
    'AI Core': true,
  });

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const sectionedNavigation = useMemo(
    () => [
      { title: 'Pinned', items: pinnedNavigation },
      ...groupedNavigation,
    ],
    [],
  );

  const renderNavItem = (item: NavigationItem) => (
    <NavLink
      key={item.name}
      to={item.href}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
          isActive
            ? 'bg-brand-cyan-600 text-white shadow-lg shadow-brand-cyan-500/30'
            : 'text-brand-gray-300 hover:bg-brand-gray-800 hover:text-brand-cyan-400'
        }`
      }
    >
      <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
      {item.name}
    </NavLink>
  );

  const NavLinks = () => (
    <div className="space-y-4">
      {sectionedNavigation.map((section) => {
        const isCollapsed = section.collapsible ? collapsedGroups[section.title] : false;

        return (
          <div key={section.title} className="space-y-2">
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-400">
              <span>{section.title}</span>
              {section.collapsible && (
                <button
                  type="button"
                  onClick={() => toggleGroup(section.title)}
                  className="text-brand-gray-400 hover:text-brand-cyan-400"
                  aria-expanded={!isCollapsed}
                  aria-controls={`${section.title}-section`}
                >
                  <span className="sr-only">Toggle {section.title}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
            <div id={`${section.title}-section`} className="space-y-1">
              {(!section.collapsible || !isCollapsed) && section.items.map(renderNavItem)}
            </div>
          </div>
        );
      })}
    </div>
  );

  const AiQuickActions = () => (
    <div className="mt-6 space-y-2 px-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-gray-400">AI Quick Actions</p>
      <div className="space-y-2">
        <NavLink
          to="/ai-tree-estimator"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-500 hover:to-emerald-500"
        >
          <SparklesIcon className="h-5 w-5" />
          Run AI Estimator
        </NavLink>
        <NavLink
          to="/ai-core"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-center gap-2 rounded-lg border border-brand-cyan-500/40 bg-brand-gray-800 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-brand-gray-700 hover:border-brand-cyan-400"
        >
          <AICoreIcon className="h-5 w-5" />
          Open AI Core
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-brand-gray-900">
          <div className="flex h-16 flex-shrink-0 items-center bg-brand-gray-950 px-4 border-b border-brand-cyan-500/30">
            <img src="/logo.jpg" alt="TreePro AI" className="h-10 w-10 rounded-full ring-2 ring-brand-cyan-500/50" />
            <span className="ml-3 text-xl font-bold text-white">TreePro AI</span>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              <NavLinks />
              <AiQuickActions />
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
        {/* Off-canvas menu overlay, show/hide based on sidebar state */}
        <div className="fixed inset-0 bg-brand-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setSidebarOpen(false)}></div>
        
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-brand-gray-900">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button type="button" className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={() => setSidebarOpen(false)}>
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex h-16 flex-shrink-0 items-center bg-brand-gray-950 px-4 border-b border-brand-cyan-500/30">
            <img src="/logo.jpg" alt="TreePro AI" className="h-10 w-10 rounded-full ring-2 ring-brand-cyan-500/50" />
            <span className="ml-3 text-xl font-bold text-white">TreePro AI</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="space-y-1 px-2 py-4">
              <NavLinks />
              <AiQuickActions />
            </nav>
          </div>
        </div>

        <div className="w-14 flex-shrink-0"></div>
      </div>
    </>
  );
};

export default Sidebar;