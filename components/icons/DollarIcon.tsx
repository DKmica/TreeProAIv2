import React from 'react';

const DollarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.768 11 12 11c-.768 0-1.536.21-2.121.536m-.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182s-3.07-.879-4.242 0c-1.172.879-1.172 2.303 0 3.182z" />
  </svg>
);

export default DollarIcon;