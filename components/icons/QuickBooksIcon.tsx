import React from 'react';

const QuickBooksIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="10" fill="#2CA01C"/>
    <path d="M8 8h3v8H8zm5 0h3v8h-3z" fill="white"/>
  </svg>
);

export default QuickBooksIcon;