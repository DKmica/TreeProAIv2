import React from 'react';

const Header: React.FC<{ sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void }> = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-brand-navy-900 px-4 shadow-lg sm:px-6 lg:px-8">
      {/* Hamburger menu for mobile */}
      <button
        className="text-brand-navy-400 focus:outline-none lg:hidden"
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
            <svg className="h-5 w-5 text-brand-navy-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </span>
          <input className="block w-full max-w-xs rounded-md border-0 bg-brand-navy-800 py-1.5 pl-10 pr-3 text-white ring-1 ring-inset ring-brand-navy-600 placeholder:text-brand-navy-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" placeholder="Search..." type="search" />
        </div>
      </div>

      {/* Profile dropdown */}
      <div className="ml-4 flex items-center">
        <span className="relative inline-block">
          <img
            className="h-8 w-8 rounded-full"
            src="https://picsum.photos/100/100"
            alt="User profile"
          />
          <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-2 ring-white" />
        </span>
        <div className="ml-3">
          <p className="text-sm font-medium text-brand-navy-200 group-hover:text-white">Admin User</p>
          <p className="text-xs font-medium text-brand-navy-400 group-hover:text-brand-navy-200">Office Manager</p>
        </div>
      </div>
    </header>
  );
};

export default Header;