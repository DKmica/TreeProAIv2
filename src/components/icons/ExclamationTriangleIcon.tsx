import React from 'react';
import TextIcon from './TextIcon';

const ExclamationTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="⚠️" className={className} />
);

export default ExclamationTriangleIcon;
