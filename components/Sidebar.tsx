import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { useBadgeCounts } from '../hooks/useBadgeCounts';

type NavigationItem = { 
  name: string; 
  href: string; 
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
};

const pinnedNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
];

const groupedNavigation: {
  title: string;
  items: NavigationItem[];
  defaultExpanded?: boolean;
}[] = [
  {
    title: 'Sales',
    defaultExpanded: true,
    items: [
      { name: 'CRM', href: '/crm', icon: CustomerIcon },
      { name: 'AI Estimator', href: '/ai-tree-estimator', icon: SparklesIcon },
      { name: 'Estimate Analytics', href: '/estimate-feedback-analytics', icon: DocumentTextIcon },
      { name: 'Chat', href: '/chat', icon: ChatIcon },
    ],
  },
  {
    title: 'Work',
    defaultExpanded: true,
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
    defaultExpanded: true,
    items: [
      { name: 'Invoices', href: '/invoices', icon: InvoiceIcon },
      { name: 'Profitability', href: '/profitability', icon: DollarIcon },
      { name: 'Payroll', href: '/payroll', icon: DollarIcon },
    ],
  },
  {
    title: 'Marketing & AI',
    defaultExpanded: false,
    items: [
      { name: 'Marketing', href: '/marketing', icon: MarketingIcon },
      { name: 'AI Core', href: '/ai-core', icon: AICoreIcon },
    ],
  },
  {
    title: 'System',
    defaultExpanded: false,
    items: [
      { name: 'Settings', href: '/settings', icon: CogIcon },
      { name: 'Exceptions', href: '/exception-queue', icon: ExclamationTriangleIcon },
    ],
  },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { counts } = useBadgeCounts();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groupedNavigation.forEach(group => {
      initial[group.title] = group.defaultExpanded ?? true;
    });
    return initial;
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationWithBadges = useMemo(() => {
    const badgeMap: Record<string, number | string | undefined> = {
      '/crm': counts.pendingLeads > 0 ? counts.pendingLeads : undefined,
      '/jobs': counts.todayJobs > 0 ? counts.todayJobs : undefined,
      '/invoices': counts.unpaidInvoices > 0 ? counts.unpaidInvoices : undefined,
      '/exception-queue': counts.exceptions > 0 ? counts.exceptions : undefined,
      '/chat': counts.unreadMessages > 0 ? counts.unreadMessages : undefined,
    };

    const applyBadges = (items: NavigationItem[]): NavigationItem[] => 
      items.map(item => ({
        ...item,
        badge: badgeMap[item.href],
      }));

    return {
      pinned: applyBadges(pinnedNavigation),
      grouped: groupedNavigation.map(group => ({
        ...group,
        items: applyBadges(group.items),
      })),
    };
  }, [counts]);

  const toggleGroup = useCallback((title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  const sectionedNavigation = useMemo(
    () => [
      { title: 'Quick Access', items: navigationWithBadges.pinned, defaultExpanded: true },
      ...navigationWithBadges.grouped,
    ],
    [navigationWithBadges],
  );

  const isActiveRoute = useCallback((href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/crm') return location.pathname.startsWith('/crm');
    return location.pathname.startsWith(href);
  }, [location.pathname]);

  const renderNavItem = (item: NavigationItem, collapsed: boolean = false) => {
    const isActive = isActiveRoute(item.href);
    
    return (
      <NavLink
        key={item.name}
        to={item.href}
        onClick={() => setSidebarOpen(false)}
        title={collapsed ? item.name : undefined}
        className={`
          group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg
          transition-all duration-200 relative
          ${isActive
            ? 'bg-gradient-to-r from-brand-cyan-600 to-brand-cyan-500 text-white shadow-lg shadow-brand-cyan-500/20'
            : 'text-brand-gray-300 hover:bg-brand-gray-800/80 hover:text-white'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'group-hover:text-brand-cyan-400'}`} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </NavLink>
    );
  };

  const NavLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="space-y-6">
      {sectionedNavigation.map((section) => {
        const isExpanded = expandedGroups[section.title] ?? true;

        return (
          <div key={section.title}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(section.title)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-gray-400 hover:text-brand-gray-200 transition-colors"
              >
                <span>{section.title}</span>
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            
            <div className={`
              space-y-1 mt-2 overflow-hidden transition-all duration-200
              ${!collapsed && !isExpanded ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}
            `}>
              {section.items.map((item) => renderNavItem(item, collapsed))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const QuickActions = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className={`space-y-2 ${collapsed ? '' : 'px-2'}`}>
      {!collapsed && (
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-brand-gray-400 mb-3">
          Quick Actions
        </p>
      )}
      <NavLink
        to="/ai-tree-estimator"
        onClick={() => setSidebarOpen(false)}
        title={collapsed ? "AI Estimator" : undefined}
        className={`
          flex items-center gap-2 rounded-lg 
          bg-gradient-to-r from-brand-cyan-600 to-emerald-600 
          text-white font-semibold shadow-lg shadow-brand-cyan-500/20 
          hover:from-brand-cyan-500 hover:to-emerald-500 
          transition-all duration-200
          ${collapsed ? 'p-2.5 justify-center' : 'px-4 py-2.5'}
        `}
      >
        <SparklesIcon className="h-5 w-5" />
        {!collapsed && <span>AI Estimator</span>}
      </NavLink>
      <NavLink
        to="/chat"
        onClick={() => setSidebarOpen(false)}
        title={collapsed ? "Ask ProBot" : undefined}
        className={`
          flex items-center gap-2 rounded-lg 
          border border-brand-cyan-500/40 bg-brand-gray-800 
          text-brand-cyan-100 font-medium
          hover:bg-brand-gray-700 hover:border-brand-cyan-400 
          transition-all duration-200
          ${collapsed ? 'p-2.5 justify-center' : 'px-4 py-2.5'}
        `}
      >
        <ChatIcon className="h-5 w-5" />
        {!collapsed && <span>Ask ProBot</span>}
      </NavLink>
    </div>
  );

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className={`
        flex items-center border-b border-brand-gray-800 bg-brand-gray-900
        ${collapsed ? 'h-16 justify-center' : 'h-16 px-4 gap-3'}
      `}>
        <img 
          src="/logo.jpg" 
          alt="TreePro AI" 
          className={`rounded-full ring-2 ring-brand-cyan-500/50 ${collapsed ? 'h-9 w-9' : 'h-10 w-10'}`} 
        />
        {!collapsed && (
          <div>
            <span className="text-lg font-bold text-white">TreePro AI</span>
            <span className="block text-xs text-brand-gray-400">Field Service Management</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-gray-700 scrollbar-track-transparent">
        <nav className={`py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
          <NavLinks collapsed={collapsed} />
        </nav>
      </div>
      
      <div className={`border-t border-brand-gray-800 py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        <QuickActions collapsed={collapsed} />
      </div>
      
      {!collapsed && (
        <button
          onClick={() => setIsCollapsed(true)}
          className="hidden lg:flex items-center justify-center gap-2 px-4 py-2 mx-3 mb-3 text-xs text-brand-gray-400 hover:text-white rounded-lg hover:bg-brand-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          Collapse sidebar
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className={`
        hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col
        bg-brand-gray-900 border-r border-brand-gray-800
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        <SidebarContent collapsed={isCollapsed} />
        
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 text-brand-gray-400 hover:text-white rounded-lg hover:bg-brand-gray-800 transition-colors"
            title="Expand sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <div 
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      >
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        
        <div className={`
          absolute inset-y-0 left-0 w-72 bg-brand-gray-900 
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 text-brand-gray-400 hover:text-white rounded-lg hover:bg-brand-gray-800 transition-colors z-10"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <SidebarContent />
        </div>
      </div>
      
      <div className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`} />
    </>
  );
};

export default Sidebar;
