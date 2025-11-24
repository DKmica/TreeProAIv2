import React from 'react';
import TextIcon from './TextIcon';

const PlusCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="➕" className={className} />
);

export default PlusCircleIcon;
