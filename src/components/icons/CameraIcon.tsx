import React from 'react';
import TextIcon from './TextIcon';

const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📷" className={className} />
);

export default CameraIcon;
