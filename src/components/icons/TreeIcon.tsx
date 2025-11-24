import React from 'react';
import TextIcon from './TextIcon';

const TreeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="🌳" className={className} />
);

export default TreeIcon;
