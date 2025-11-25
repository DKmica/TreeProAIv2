import React from 'react';

const ZapierIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
    <path d="M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 7l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default ZapierIcon;
