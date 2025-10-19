import React from 'react';

const ThumbDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.867 14.25c-.806 0-1.533.446-2.031 1.08a9.041 9.041 0 00-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 01-.322 1.672V21a.75.75 0 00.75.75A2.25 2.25 0 009.5 19.5c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H3.374c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.25 12c0-.435.023-.868.068-1.285.109-1.022 1.028-1.715 2.054-1.715h3.126c.618 0 .991-.724.725-1.282A7.471 7.471 0 009.5 4.5a2.25 2.25 0 00-2.25-2.25.75.75 0 00-.75.75v3.375c0 .621-.203 1.205-.562 1.672-.323.466-.734.886-1.205 1.238a4.5 4.5 0 00-1.423.23L4.5 14.25z" />
  </svg>
);

export default ThumbDownIcon;