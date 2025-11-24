import React from 'react';
import TextIcon from './TextIcon';

const CogIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="⚙️" className={className} />
);

export default CogIcon;
