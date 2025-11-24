import React from 'react';
import TextIcon from './TextIcon';

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="💬" className={className} />
);

export default QuoteIcon;
