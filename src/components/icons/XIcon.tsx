import React from 'react';
import TextIcon from './TextIcon';

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="✕" className={className} />
);

export default XIcon;
