import React from 'react';

interface JobStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status, size = 'md' as const }) => {
  const badgeSize: 'sm' | 'md' | 'lg' = size || 'md';
  
  const getStatusColor = (status: string): string => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    
    switch (normalizedStatus) {
      case 'draft':
        return 'bg-gray-600 text-gray-100';
      case 'needs_permit':
        return 'bg-yellow-600 text-yellow-100';
      case 'waiting_on_client':
        return 'bg-orange-600 text-orange-100';
      case 'scheduled':
        return 'bg-blue-600 text-blue-100';
      case 'weather_hold':
        return 'bg-purple-600 text-purple-100';
      case 'in_progress':
        return 'bg-cyan-600 text-cyan-100';
      case 'completed':
        return 'bg-green-600 text-green-100';
      case 'invoiced':
        return 'bg-indigo-600 text-indigo-100';
      case 'paid':
        return 'bg-emerald-600 text-emerald-100';
      case 'cancelled':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg'): string => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      case 'md':
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const formatStatusText = (status: string): string => {
    return status
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const sizeClass = getSizeClasses(badgeSize);
  const colorClass = getStatusColor(status);
  const displayText = formatStatusText(status);

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${colorClass} ${sizeClass}`}
      role="status"
      aria-label={`Job status: ${displayText}`}
    >
      {displayText}
    </span>
  );
};

export default JobStatusBadge;
