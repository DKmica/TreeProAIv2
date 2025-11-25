import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearch from './GlobalSearch';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onOpenCommandPalette: () => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen, onOpenCommandPalette }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-brand-gray-900 border-b border-brand-gray-800 px-4 sm:px-6 lg:px-8">
        <button
          className="p-2 -ml-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Open sidebar"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex-1 flex items-center justify-center lg:justify-start lg:ml-0 px-4">
          <div className="hidden lg:block w-full max-w-xl">
            <GlobalSearch />
          </div>

          <button
            onClick={() => setMobileSearchOpen(true)}
            className="lg:hidden p-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors"
            aria-label="Search"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-brand-gray-200 bg-brand-gray-800 hover:bg-brand-gray-700 border border-brand-gray-700 rounded-lg transition-colors"
            aria-label="Open command palette"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
            </svg>
            ⌘K
          </button>

          <button
            className="relative p-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <button 
            className="hidden sm:flex p-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors"
            aria-label="Help"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setProfileOpen(!profileOpen)} 
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-brand-gray-800 transition-colors"
            >
              <div className="relative">
                <img
                  className="h-9 w-9 rounded-full ring-2 ring-brand-gray-700"
                  src="https://picsum.photos/100/100"
                  alt="User profile"
                />
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-gray-900" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs text-brand-gray-400">Office Manager</p>
              </div>
              <svg className="w-4 h-4 text-brand-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {profileOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 origin-top-right rounded-xl bg-brand-gray-800 border border-brand-gray-700 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none py-1 z-50">
                <div className="px-4 py-3 border-b border-brand-gray-700">
                  <p className="text-sm font-medium text-white">Admin User</p>
                  <p className="text-xs text-brand-gray-400 truncate">admin@treeproai.com</p>
                </div>
                
                <div className="py-1">
                  <a 
                    href="#/settings" 
                    className="flex items-center gap-3 px-4 py-2 text-sm text-brand-gray-200 hover:bg-brand-gray-700 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Profile
                  </a>
                  <a 
                    href="#/settings" 
                    className="flex items-center gap-3 px-4 py-2 text-sm text-brand-gray-200 hover:bg-brand-gray-700 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </a>
                </div>
                
                <div className="border-t border-brand-gray-700 py-1">
                  <button 
                    onClick={logout} 
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
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 text-brand-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
