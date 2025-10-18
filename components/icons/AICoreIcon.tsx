import React from 'react';

const AICoreIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 21v-1.5M15.75 3v1.5M12 6.75v10.5M15.75 21v-1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75a8.25 8.25 0 018.25 8.25c0 1.954-.705 3.759-1.879 5.253-1.173 1.493-2.83 2.497-4.621 2.879a8.537 8.537 0 01-3.5 0c-1.79-.382-3.448-1.386-4.621-2.879C3.705 15.759 3 13.954 3 12A8.25 8.25 0 0112 3.75z" />
  </svg>
);

export default AICoreIcon;