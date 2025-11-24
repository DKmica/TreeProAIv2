import React from 'react';
import TextIcon from './TextIcon';

const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="💳" className={className} />
);

export default CreditCardIcon;
