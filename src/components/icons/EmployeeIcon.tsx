import React from 'react';
import TextIcon from './TextIcon';

const EmployeeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="👨‍💼" className={className} />
);

export default EmployeeIcon;
