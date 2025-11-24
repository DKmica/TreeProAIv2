import React from 'react';
import TextIcon from './TextIcon';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="←" className={className} />
);

export default ArrowLeftIcon;
