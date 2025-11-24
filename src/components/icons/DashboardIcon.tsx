import React from 'react';
import TextIcon from './TextIcon';

const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📊" className={className} />
);

export default DashboardIcon;
