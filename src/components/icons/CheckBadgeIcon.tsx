import React from 'react';
import TextIcon from './TextIcon';

const CheckBadgeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="✓" className={className} />
);

export default CheckBadgeIcon;
