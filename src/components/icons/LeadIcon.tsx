import React from 'react';
import TextIcon from './TextIcon';

const LeadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="👁️" className={className} />
);

export default LeadIcon;
