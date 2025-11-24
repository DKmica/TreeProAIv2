import React from 'react';
import TextIcon from './TextIcon';

const CalendarDaysIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="📅" className={className} />
);

export default CalendarDaysIcon;
