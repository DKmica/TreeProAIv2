import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC<{ sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void }> = ({ sidebarOpen, setSidebarOpen }) => {
  const [profileOpen, setProfileOpen] = useState(false);
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      {/* Hamburger menu for mobile */}
      <button
        className="text-brand-gray-500 focus:outline-none lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <span className="sr-only">Open sidebar</span>
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

      {/* Spacer to push content to the right on mobile */}
      <div className="flex-1 lg:hidden"></div>

      {/* Search Bar */}
      <div className="hidden lg:block">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-brand-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </span>
          <input className="block w-full max-w-xs rounded-md border-0 bg-brand-gray-100 py-1.5 pl-10 pr-3 text-brand-gray-900 ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" placeholder="Search..." type="search" />
        </div>
      </div>

      {/* Profile dropdown */}
      <div className="relative ml-4 flex items-center" ref={profileRef}>
        <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2">
            <span className="relative inline-block">
            <img
                className="h-8 w-8 rounded-full"
                src="https://picsum.photos/100/100"
                alt="User profile"
            />
            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-2 ring-white" />
            </span>
            <div className="ml-3 text-left hidden sm:block">
            <p className="text-sm font-medium text-brand-gray-700 group-hover:text-brand-gray-900">Admin User</p>
            <p className="text-xs font-medium text-brand-gray-500 group-hover:text-brand-gray-700">Office Manager</p>
            </div>
        </button>
        {profileOpen && (
            <div className="absolute top-12 right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabIndex={-1}>
              <a href="#/settings" className="block px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-100" role="menuitem" tabIndex={-1} id="user-menu-item-0">Your Profile</a>
              <button onClick={logout} className="w-full text-left block px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-100" role="menuitem" tabIndex={-1} id="user-menu-item-2">
                Sign out
              </button>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;