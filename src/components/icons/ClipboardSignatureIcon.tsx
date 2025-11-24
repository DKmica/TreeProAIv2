import React from 'react';
import TextIcon from './TextIcon';

const ClipboardSignatureIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📝" className={className} />
);

export default ClipboardSignatureIcon;
