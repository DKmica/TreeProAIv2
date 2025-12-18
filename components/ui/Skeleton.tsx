import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
}) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        bg-brand-gray-700/50 
        ${roundedClasses[rounded]}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-brand-gray-800 rounded-lg border border-brand-gray-700 p-6 ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton width={48} height={48} rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton height={20} width="60%" />
        <Skeleton height={16} width="40%" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton height={16} />
      <Skeleton height={16} width="90%" />
      <Skeleton height={16} width="75%" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number; className?: string }> = ({ 
  columns = 5,
  className = '' 
}) => (
  <tr className={`border-b border-brand-gray-700 ${className}`}>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton 
          height={16} 
          width={i === 0 ? '80%' : i === columns - 1 ? '50%' : '60%'} 
        />
      </td>
    ))}
  </tr>
);

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 4,
  className = '' 
}) => (
  <div className={`space-y-6 ${className}`}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton height={16} width={120} />
        <Skeleton height={42} />
      </div>
    ))}
    <div className="flex gap-3 pt-4">
      <Skeleton height={40} width={100} rounded="lg" />
      <Skeleton height={40} width={80} rounded="lg" />
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5,
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-brand-gray-800 rounded-lg">
        <Skeleton width={40} height={40} rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="70%" />
          <Skeleton height={14} width="40%" />
        </div>
        <Skeleton height={24} width={60} rounded="full" />
      </div>
    ))}
  </div>
);

export const DashboardCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-brand-gray-800 rounded-lg border border-brand-gray-700 p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton height={18} width={100} />
      <Skeleton width={32} height={32} rounded="lg" />
    </div>
    <Skeleton height={32} width="50%" className="mb-2" />
    <div className="flex items-center gap-2">
      <Skeleton height={16} width={60} />
      <Skeleton height={16} width={80} />
    </div>
  </div>
);

export default Skeleton;
