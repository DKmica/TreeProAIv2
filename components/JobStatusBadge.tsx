import React from 'react';
import StatusBadge from './StatusBadge';

interface JobStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalizedSize = size || 'md';

  return (
    <StatusBadge
      status={status}
      size={normalizedSize}
      className="shadow-sm shadow-black/10"
    />
  );
};

export default JobStatusBadge;
