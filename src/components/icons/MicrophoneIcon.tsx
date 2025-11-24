import React from 'react';
import TextIcon from './TextIcon';

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="🎤" className={className} />
);

export default MicrophoneIcon;
