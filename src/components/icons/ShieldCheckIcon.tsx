import React from 'react';
import TextIcon from './TextIcon';

const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="🛡️" className={className} />
);

export default ShieldCheckIcon;
