import React from 'react';

const TwilioIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
    <circle cx="8.5" cy="8.5" r="2" fill="currentColor" />
    <circle cx="15.5" cy="8.5" r="2" fill="currentColor" />
    <circle cx="8.5" cy="15.5" r="2" fill="currentColor" />
    <circle cx="15.5" cy="15.5" r="2" fill="currentColor" />
  </svg>
);

export default TwilioIcon;
