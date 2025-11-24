import React from 'react';
import TextIcon from './TextIcon';

const MarketingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📢" className={className} />
);

export default MarketingIcon;
