import React from 'react';
import TextIcon from './TextIcon';

const GoogleCalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📅" className={className} />
);

export default GoogleCalendarIcon;
