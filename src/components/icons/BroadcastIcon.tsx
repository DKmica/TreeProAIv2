import React from 'react';
import TextIcon from './TextIcon';

const BroadcastIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📡" className={className} />
);

export default BroadcastIcon;
