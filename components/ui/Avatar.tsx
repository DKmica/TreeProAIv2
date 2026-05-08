import React from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-brand-cyan-600/20 text-brand-cyan-400 font-semibold flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
