import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearch from './GlobalSearch';
import OfflineIndicator from './ui/OfflineIndicator';
import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onOpenCommandPalette: () => void;
}

type PageMeta = { title: string; subtitle?: string };

function getPageMeta(pathname: string): PageMeta {
  if (pathname === '/dashboard') return { title: 'Dashboard', subtitle: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) };
  if (pathname.startsWith('/calendar')) return { title: 'Calendar', subtitle: 'Schedule and manage jobs' };
  if (pathname.startsWith('/work-orders')) return { title: 'Work Orders', subtitle: 'Track opportunities from lead to completion' };
  if (pathname.startsWith('/clients')) return { title: 'Clients', subtitle: 'Manage your client relationships' };
  if (pathname.startsWith('/leads')) return { title: 'Leads', subtitle: 'Incoming opportunities and inquiries' };
  if (pathname.startsWith('/quotes')) return { title: 'Quotes', subtitle: 'Proposals and pricing' };
  if (pathname.startsWith('/jobs')) return { title: 'Jobs', subtitle: 'Active and scheduled work' };
  if (pathname.startsWith('/crews')) return { title: 'Crews', subtitle: 'Team management and assignments' };
  if (pathname.startsWith('/employees')) return { title: 'Employees', subtitle: 'Staff management' };
  if (pathname.startsWith('/time-tracking')) return { title: 'Time Tracking', subtitle: 'Clock-in, clock-out, and approvals' };
  if (pathname.startsWith('/equipment')) return { title: 'Equipment', subtitle: 'Fleet and asset management' };
  if (pathname.startsWith('/phc-compliance')) return { title: 'PHC Compliance', subtitle: 'Plant health care tracking' };
  if (pathname.startsWith('/stump-grinding')) return { title: 'Stump Grinding', subtitle: 'Stump removal jobs' };
  if (pathname.startsWith('/document-scanner')) return { title: 'Document Scanner', subtitle: 'Scan and digitize documents' };
  if (pathname.startsWith('/invoicing')) return { title: 'Money', subtitle: 'Invoices, payments, and financials' };
  if (pathname.startsWith('/payroll')) return { title: 'Payroll', subtitle: 'Pay periods and wage calculations' };
  if (pathname.startsWith('/sales')) return { title: 'Sales', subtitle: 'Revenue and sales performance' };
  if (pathname.startsWith('/profitability')) return { title: 'Profitability', subtitle: 'Job and crew profitability analysis' };
  if (pathname.startsWith('/reports')) return { title: 'Reports', subtitle: 'Business intelligence and analytics' };
  if (pathname.startsWith('/ai-tree-estimator')) return { title: 'AI Estimator', subtitle: 'Estimate jobs with AI vision analysis' };
  if (pathname.startsWith('/visualizer')) return { title: 'Tree Visualizer', subtitle: 'Visualize tree service scenarios' };
  if (pathname.startsWith('/chat')) return { title: 'Ask ProBot', subtitle: 'Your AI business assistant' };
  if (pathname.startsWith('/marketing')) return { title: 'Marketing', subtitle: 'AI-powered content and campaigns' };
  if (pathname.startsWith('/ai-core')) return { title: 'AI Core', subtitle: 'AI management and configuration' };
  if (pathname.startsWith('/estimate-feedback-analytics')) return { title: 'Estimate Analytics', subtitle: 'Estimate accuracy and performance' };
  if (pathname.startsWith('/workflows')) return { title: 'Workflows', subtitle: 'Automated business rules' };
  if (pathname.startsWith('/automation-logs')) return { title: 'Automation Logs', subtitle: 'Workflow execution history' };
  if (pathname.startsWith('/job-templates')) return { title: 'Templates', subtitle: 'Reusable job configurations' };
  if (pathname.startsWith('/settings')) return { title: 'Settings', subtitle: 'Account and company settings' };
  if (pathname.startsWith('/user-management')) return { title: 'User Management', subtitle: 'Roles and access control' };
  return { title: 'TreePro AI' };
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen, onOpenCommandPalette }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { title, subtitle } = getPageMeta(location.pathname);

  const handleLogout = () => void logout();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="h-16 flex-shrink-0 flex items-center justify-between bg-brand-gray-900 border-b border-brand-gray-800 px-4 sm:px-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            className="p-2 -ml-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-brand-gray-400 truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden lg:block">
            <GlobalSearch />
          </div>

          <button
            onClick={() => setMobileSearchOpen(true)}
            className="lg:hidden p-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <OfflineIndicator />

          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-brand-gray-300 bg-brand-gray-800 hover:bg-brand-gray-700 border border-brand-gray-700 rounded-lg transition-colors"
            aria-label="Open command palette"
          >
            <span className="text-brand-gray-500">⌘K</span>
          </button>

          <button
            className="relative p-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-brand-gray-800 transition-colors"
            >
              <img
                className="h-8 w-8 rounded-full ring-2 ring-brand-gray-700"
                src="https://picsum.photos/100/100"
                alt="User profile"
              />
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-white leading-none">Admin User</p>
                <p className="text-xs text-brand-gray-400 mt-0.5">Office Manager</p>
              </div>
              <svg className="w-4 h-4 text-brand-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 origin-top-right rounded-xl bg-brand-gray-800 border border-brand-gray-700 shadow-xl py-1 z-50">
                <div className="px-4 py-3 border-b border-brand-gray-700">
                  <p className="text-sm font-medium text-white">Admin User</p>
                  <p className="text-xs text-brand-gray-400 truncate">admin@treeproai.com</p>
                </div>
                <div className="py-1">
                  <a href="#/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-brand-gray-200 hover:bg-brand-gray-700 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Profile
                  </a>
                  <a href="#/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-brand-gray-200 hover:bg-brand-gray-700 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </a>
                </div>
                <div className="border-t border-brand-gray-700 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-brand-gray-700 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSearchOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 bg-brand-gray-900 p-4 border-b border-brand-gray-800">
            <div className="flex items-center gap-3">
              <GlobalSearch className="flex-1" />
              <button onClick={() => setMobileSearchOpen(false)} className="p-2 text-brand-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
