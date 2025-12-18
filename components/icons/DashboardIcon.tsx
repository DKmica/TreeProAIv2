
import React from 'react';

const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-12a2.25 2.25 0 01-2.25-2.25V3M3.75 21h16.5M12 6.75v.008v.008v.008v.008v.008" />
  </svg>
);

export default DashboardIcon;
