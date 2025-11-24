import React from 'react';
import TextIcon from './TextIcon';

const ToolIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="🔨" className={className} />
);

export default ToolIcon;
