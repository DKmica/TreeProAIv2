import React from 'react';

const SpinnerIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <span className={`inline-block ${className}`}>⟳</span>
);

export default SpinnerIcon;
