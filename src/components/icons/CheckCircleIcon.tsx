import React from 'react';
import TextIcon from './TextIcon';

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="✓" className={className} />
);

export default CheckCircleIcon;
