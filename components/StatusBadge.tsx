import React from 'react';

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

type StatusPaletteKey =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'converted'
  | 'unscheduled'
  | 'scheduled'
  | 'en_route'
  | 'on_site'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'overdue'
  | 'void'
  | 'needs_permit'
  | 'waiting_on_client'
  | 'weather_hold'
  | 'invoiced';

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  className?: string;
}

const STATUS_COLORS: Record<StatusPaletteKey, string> = {
  draft: 'bg-gray-600 text-gray-100',
  sent: 'bg-blue-600 text-blue-100',
  accepted: 'bg-green-600 text-green-100',
  declined: 'bg-red-600 text-red-100',
  converted: 'bg-purple-600 text-purple-100',
  unscheduled: 'bg-slate-600 text-slate-100',
  scheduled: 'bg-blue-600 text-blue-100',
  en_route: 'bg-sky-600 text-sky-100',
  on_site: 'bg-orange-600 text-orange-100',
  in_progress: 'bg-cyan-600 text-cyan-100',
  completed: 'bg-green-700 text-green-100',
  cancelled: 'bg-red-700 text-red-100',
  paid: 'bg-emerald-600 text-emerald-100',
  overdue: 'bg-amber-600 text-amber-100',
  void: 'bg-gray-700 text-gray-100',
  needs_permit: 'bg-yellow-600 text-yellow-100',
  waiting_on_client: 'bg-orange-500 text-orange-100',
  weather_hold: 'bg-indigo-600 text-indigo-100',
  invoiced: 'bg-indigo-600 text-indigo-100',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

const normalizeStatus = (status: string): StatusPaletteKey | null => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  if (normalized in STATUS_COLORS) {
    return normalized as StatusPaletteKey;
  }
  return null;
};

const formatLabel = (status: string) =>
  status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const normalized = normalizeStatus(status) || 'draft';
  const colorClass = STATUS_COLORS[normalized];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${colorClass} ${sizeClass} ${className}`.trim()}
      role="status"
      aria-label={`${formatLabel(status)} status`}
    >
      {formatLabel(status)}
    </span>
  );
};

export default StatusBadge;
