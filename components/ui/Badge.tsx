import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-brand-gray-700 text-brand-gray-200 border-brand-gray-600',
  primary: 'bg-brand-cyan-600/20 text-brand-cyan-400 border-brand-cyan-500/30',
  success: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-600/20 text-red-400 border-red-500/30',
  info: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-brand-gray-400',
  primary: 'bg-brand-cyan-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  className = '',
  children,
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      
      {children}
      
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 -mr-0.5 p-0.5 hover:bg-white/10 rounded transition-colors"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ 
  status, 
  className = '' 
}) => {
  const statusConfig: Record<string, BadgeVariant> = {
    active: 'success',
    inactive: 'default',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    cancelled: 'danger',
    draft: 'default',
    sent: 'info',
    paid: 'success',
    overdue: 'danger',
    void: 'default',
    new: 'primary',
    contacted: 'info',
    qualified: 'warning',
    converted: 'success',
    lost: 'danger',
    scheduled: 'info',
    in_progress: 'warning',
    on_hold: 'warning',
  };

  const variant = statusConfig[status.toLowerCase()] || 'default';
  
  return (
    <Badge variant={variant} dot className={className}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
};

export default Badge;
