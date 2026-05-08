import React, { useMemo, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBadgeCounts } from '../hooks/useBadgeCounts';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Calendar, ClipboardList, Users, FileText,
  Briefcase, UserCheck, Clock, Wrench, Receipt, DollarSign,
  BarChart2, Sparkles, TreePine, MessageSquare, Megaphone,
  Zap, ScrollText, BookTemplate, Settings, ShieldCheck,
  ScanLine, FlaskConical, Shovel, ChevronDown, ChevronRight,
  HardHat, TrendingUp,
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: number | string;
  allowedRoles?: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Calendar', href: '/calendar', icon: Calendar },
      { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
    ],
  },
  {
    label: 'Customers',
    items: [
      { name: 'Clients', href: '/clients', icon: Users, allowedRoles: ['owner', 'admin', 'manager', 'sales', 'scheduler'] },
      { name: 'Leads', href: '/leads', icon: FileText },
      { name: 'Quotes', href: '/quotes', icon: Receipt },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Jobs', href: '/jobs', icon: Briefcase },
      { name: 'Crews', href: '/crews', icon: HardHat, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'Employees', href: '/employees', icon: UserCheck, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'Time Tracking', href: '/time-tracking', icon: Clock },
      { name: 'Equipment', href: '/equipment', icon: Wrench },
      { name: 'PHC Compliance', href: '/phc-compliance', icon: FlaskConical, allowedRoles: ['owner', 'admin', 'manager', 'foreman'] },
      { name: 'Stump Grinding', href: '/stump-grinding', icon: Shovel },
      { name: 'Document Scanner', href: '/document-scanner', icon: ScanLine, allowedRoles: ['owner', 'admin', 'manager', 'sales'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Invoicing', href: '/invoicing', icon: DollarSign, allowedRoles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'Payroll', href: '/payroll', icon: Receipt, allowedRoles: ['owner', 'admin'] },
      { name: 'Sales', href: '/sales', icon: TrendingUp, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'Profitability', href: '/profitability', icon: BarChart2, allowedRoles: ['owner', 'admin'] },
      { name: 'Reports', href: '/reports', icon: BarChart2, allowedRoles: ['owner', 'admin', 'manager'] },
    ],
  },
  {
    label: 'AI Suite',
    items: [
      { name: 'AI Estimator', href: '/ai-tree-estimator', icon: Sparkles, allowedRoles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'Tree Visualizer', href: '/visualizer', icon: TreePine, allowedRoles: ['owner', 'admin', 'manager', 'sales'] },
      { name: 'Ask ProBot', href: '/chat', icon: MessageSquare },
      { name: 'Marketing', href: '/marketing', icon: Megaphone, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'AI Core', href: '/ai-core', icon: Sparkles, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'Estimate Analytics', href: '/estimate-feedback-analytics', icon: BarChart2, allowedRoles: ['owner', 'admin', 'manager'] },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Workflows', href: '/workflows', icon: Zap, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'Automation Logs', href: '/automation-logs', icon: ScrollText, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'Templates', href: '/job-templates', icon: BookTemplate, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'Settings', href: '/settings', icon: Settings, allowedRoles: ['owner', 'admin', 'manager'] },
      { name: 'User Management', href: '/user-management', icon: ShieldCheck, allowedRoles: ['owner'] },
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
  const { hasAnyRole, userRoles } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const badgeMap: Record<string, number | undefined> = useMemo(() => ({
    '/leads': counts.pendingLeads > 0 ? counts.pendingLeads : undefined,
    '/jobs': counts.todayJobs > 0 ? counts.todayJobs : undefined,
    '/invoicing': counts.unpaidInvoices > 0 ? counts.unpaidInvoices : undefined,
    '/chat': counts.unreadMessages > 0 ? counts.unreadMessages : undefined,
  }), [counts]);

  const filteredGroups = useMemo(() => {
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.allowedRoles) return true;
        if (userRoles.length === 0) return false;
        return hasAnyRole(item.allowedRoles);
      }).map(item => ({
        ...item,
        badge: badgeMap[item.href],
      })),
    })).filter(group => group.items.length > 0);
  }, [hasAnyRole, userRoles, badgeMap]);

  const isActiveRoute = useCallback((href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-3 px-4 border-b border-brand-gray-800 flex-shrink-0">
        <img
          src="/logo.jpg"
          alt="TreePro AI"
          className="h-9 w-9 rounded-full ring-2 ring-brand-cyan-500/50 flex-shrink-0"
        />
        <div className="min-w-0">
          <span className="block text-sm font-bold text-white truncate">TreePro AI</span>
          <span className="block text-xs text-brand-gray-400 truncate">Tree Service Management</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {filteredGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.label);
          return (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-gray-500 hover:text-brand-gray-300 transition-colors rounded-md hover:bg-brand-gray-800/50"
              >
                <span>{group.label}</span>
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3" />
                  : <ChevronDown className="h-3 w-3" />
                }
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isActiveRoute(item.href);
                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg
                          transition-all duration-150 relative
                          ${isActive
                            ? 'bg-brand-cyan-600/15 text-brand-cyan-400 border border-brand-cyan-500/20'
                            : 'text-brand-gray-400 hover:bg-brand-gray-800/80 hover:text-white border border-transparent'
                          }
                        `}
                      >
                        <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-brand-cyan-400' : ''}`} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge !== undefined && (
                          <span className="ml-auto px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white leading-none">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-brand-gray-800 p-2 space-y-1">
        <NavLink
          to="/ai-tree-estimator"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-brand-cyan-600 to-emerald-600 text-white text-sm font-semibold hover:from-brand-cyan-500 hover:to-emerald-500 transition-all duration-200 shadow-lg shadow-brand-cyan-500/20"
        >
          <Sparkles className="h-4 w-4" />
          <span>AI Estimator</span>
        </NavLink>
        <NavLink
          to="/chat"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-cyan-500/30 bg-brand-gray-800 text-brand-cyan-300 text-sm font-medium hover:bg-brand-gray-700 hover:border-brand-cyan-400 transition-all duration-200"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Ask ProBot</span>
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 bg-brand-gray-900 border-r border-brand-gray-800">
        <SidebarContent />
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <aside className={`
          absolute inset-y-0 left-0 w-72 bg-brand-gray-900
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 text-brand-gray-400 hover:text-white rounded-lg hover:bg-brand-gray-800 transition-colors z-10"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <SidebarContent />
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
