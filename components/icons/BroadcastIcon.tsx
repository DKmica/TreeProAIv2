import React from 'react';

const BroadcastIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.136 11.886c3.87-3.87 10.154-3.87 14.024 0M19.5 3.75a18.75 18.75 0 00-2.072-.882 1.5 1.5 0 00-1.63.124l-2.012 1.509a1.5 1.5 0 00-.312 1.928 12.718 12.718 0 01-2.924 5.332 12.72 12.72 0 01-5.332 2.924 1.5 1.5 0 00-1.928.312l-1.509 2.012a1.5 1.5 0 00.124 1.63A18.75 18.75 0 003.75 19.5" />
    </svg>
);

export default BroadcastIcon;
