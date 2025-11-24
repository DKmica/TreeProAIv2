import React from 'react';
import TextIcon from './TextIcon';

const InvoiceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📄" className={className} />
);

export default InvoiceIcon;
