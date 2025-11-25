import React from 'react';

const GustoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
    <path
      d="M7.5 12a4.5 4.5 0 118.9 1.2 3.3 3.3 0 01-3.2 2.3 3.1 3.1 0 01-3-2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 12c0 1.105.895 2 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default GustoIcon;
