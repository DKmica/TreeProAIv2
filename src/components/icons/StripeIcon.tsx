import React from 'react';
import TextIcon from './TextIcon';

const StripeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="💳" className={className} />
);

export default StripeIcon;
