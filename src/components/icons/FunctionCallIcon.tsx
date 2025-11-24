import React from 'react';
import TextIcon from './TextIcon';

const FunctionCallIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="⚡" className={className} />
);

export default FunctionCallIcon;
