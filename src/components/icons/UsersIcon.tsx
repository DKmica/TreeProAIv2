import React from 'react';
import TextIcon from './TextIcon';

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="👥" className={className} />
);

export default UsersIcon;
