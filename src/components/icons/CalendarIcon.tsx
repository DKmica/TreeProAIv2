import React from 'react';
import TextIcon from './TextIcon';

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📅" className={className} />
);

export default CalendarIcon;
