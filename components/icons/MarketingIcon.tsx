import React from 'react';

const MarketingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15h8.05a1.5 1.5 0 001.446-1.06L21 13.5V10.5a1.5 1.5 0 00-1.5-1.5h-2.25a.75.75 0 00-.75.75v3a.75.75 0 00.75.75h.75a.75.75 0 01.75.75v.75a.75.75 0 01-.75.75h-2.25a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h.75a.75.75 0 00.75-.75V9a2.25 2.25 0 00-2.25-2.25H10.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25a.75.75 0 01.75-.75h6a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-6a.75.75 0 01-.75-.75V8.25z" />
  </svg>
);

export default MarketingIcon;
