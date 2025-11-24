import React from 'react';
import TextIcon from './TextIcon';

const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TextIcon symbol="💬" className={className} />
);

export default ChatBubbleLeftRightIcon;
