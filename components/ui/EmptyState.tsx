import React from 'react';

type EmptyStateVariant = 
  | 'default'
  | 'search'
  | 'no-data'
  | 'error'
  | 'no-results'
  | 'no-access'
  | 'success'
  | 'coming-soon';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

const variantIcons: Record<EmptyStateVariant, React.ReactNode> = {
  default: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  search: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  'no-data': (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  error: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  'no-results': (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'no-access': (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  success: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'coming-soon': (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const variantColors: Record<EmptyStateVariant, string> = {
  default: 'text-brand-gray-500',
  search: 'text-brand-cyan-500/50',
  'no-data': 'text-brand-gray-500',
  error: 'text-red-500/50',
  'no-results': 'text-amber-500/50',
  'no-access': 'text-brand-gray-500',
  success: 'text-emerald-500/50',
  'coming-soon': 'text-purple-500/50',
};

const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'default',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`
      flex flex-col items-center justify-center text-center
      ${compact ? 'py-8 px-4' : 'py-16 px-6'}
      ${className}
    `}>
      <div className={`mb-4 ${variantColors[variant]}`}>
        {icon || variantIcons[variant]}
      </div>

      <h3 className={`font-semibold text-white ${compact ? 'text-base' : 'text-lg'}`}>
        {title}
      </h3>

      {description && (
        <p className={`mt-2 text-brand-gray-400 max-w-md ${compact ? 'text-sm' : 'text-base'}`}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={`flex flex-col sm:flex-row items-center gap-3 ${compact ? 'mt-4' : 'mt-6'}`}>
          {action && (
            <button
              onClick={action.onClick}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                transition-all duration-200
                ${action.variant === 'secondary'
                  ? 'bg-brand-gray-700 text-white hover:bg-brand-gray-600'
                  : 'bg-gradient-to-r from-brand-cyan-600 to-brand-cyan-500 text-white shadow-lg shadow-brand-cyan-500/20 hover:from-brand-cyan-500 hover:to-brand-cyan-400'
                }
              `}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm text-brand-gray-400 hover:text-white transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const NoClientsState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <EmptyState
    variant="no-data"
    title="No clients yet"
    description="Add your first client to get started with managing your tree service business."
    action={{ label: 'Add Client', onClick: onAdd }}
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    }
  />
);

export const NoJobsState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <EmptyState
    variant="no-data"
    title="No jobs scheduled"
    description="Create a job to start tracking your tree service work."
    action={{ label: 'Create Job', onClick: onAdd }}
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    }
  />
);

export const NoInvoicesState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <EmptyState
    variant="no-data"
    title="No invoices yet"
    description="Create an invoice when a job is completed to bill your clients."
    action={{ label: 'Create Invoice', onClick: onAdd }}
    icon={
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    }
  />
);

export const SearchEmptyState: React.FC<{ query: string; onClear: () => void }> = ({ query, onClear }) => (
  <EmptyState
    variant="search"
    title={`No results for "${query}"`}
    description="Try adjusting your search or filter to find what you're looking for."
    action={{ label: 'Clear Search', onClick: onClear, variant: 'secondary' }}
  />
);

export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    variant="error"
    title="Something went wrong"
    description="We encountered an error while loading. Please try again."
    action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
  />
);

export default EmptyState;
