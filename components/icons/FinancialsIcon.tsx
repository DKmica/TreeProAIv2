import React from 'react';

const FinancialsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15h8.05a1.5 1.5 0 001.446-1.06L21 13.5V10.5a1.5 1.5 0 00-1.5-1.5h-2.25a.75.75 0 00-.75.75v3a.75.75 0 00.75.75h.75a.75.75 0 01.75.75v.75a.75.75 0 01-.75.75h-2.25a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h.75a.75.75 0 00.75-.75V9A2.25 2.25 0 0013.5 6.75H10.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 18.75a3 3 0 003 3h3.75a3 3 0 003-3V8.25a3 3 0 00-3-3H6.75a3 3 0 00-3 3v10.5zM12 11.25h-1.5m1.5 3h-1.5m0 0h.008v.008H10.5v-.008zm0 0h.008v.008H10.5v-.008zm-2.25-3h.008v.008H8.25v-.008zm0 0h.008v.008H8.25v-.008z" />
  </svg>
);

export default FinancialsIcon;