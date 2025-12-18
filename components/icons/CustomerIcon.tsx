
import React from 'react';

const CustomerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-1.458a9.337 9.337 0 004.121 1.458c1.61.296 3.023-.423 3.023-2.622v-3.023a9.337 9.337 0 00-1.458-4.121a9.337 9.337 0 001.458-4.121V6.523c0-2.199-1.414-2.918-3.023-2.622a9.337 9.337 0 00-4.121 1.458A9.337 9.337 0 0015 3.872a9.38 9.38 0 00-2.625-.372c-1.61.296-3.023.423-3.023 2.622v3.023a9.337 9.337 0 001.458 4.121 9.337 9.337 0 00-1.458 4.121v3.023c0 2.199 1.414 2.918 3.023 2.622zM8.25 8.25a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0z" />
  </svg>
);

export default CustomerIcon;
