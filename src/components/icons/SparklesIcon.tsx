import React from 'react';
import TextIcon from './TextIcon';

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="✨" className={className} />
);

export default SparklesIcon;
