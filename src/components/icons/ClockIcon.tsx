import React from 'react';
import TextIcon from './TextIcon';

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="🕐" className={className} />
);

export default ClockIcon;
