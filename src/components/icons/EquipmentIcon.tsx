import React from 'react';
import TextIcon from './TextIcon';

const EquipmentIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="🔧" className={className} />
);

export default EquipmentIcon;
