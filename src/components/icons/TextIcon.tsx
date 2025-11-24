import React from 'react';

interface TextIconProps {
  symbol: string;
  className?: string;
}

const TextIcon: React.FC<TextIconProps> = ({ symbol, className = 'w-5 h-5' }) => (
  <span className={`inline-flex items-center justify-center font-bold ${className}`}>
    {symbol}
  </span>
);

export default TextIcon;
