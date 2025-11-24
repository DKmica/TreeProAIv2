import React from 'react';
import TextIcon from './TextIcon';

const DocumentTextIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📄" className={className} />
);

export default DocumentTextIcon;
