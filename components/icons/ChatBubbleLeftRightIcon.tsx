import React from 'react';

const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72.372a3.75 3.75 0 01-3.693-3.693l.372-3.72c.093-1.133.957-1.98 2.193-1.98h4.286c.969 0 1.813.616 2.097 1.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12a.75.75 0 01.75-.75h.008v.008h-.008a.75.75 0 01-.75-.75zM4.5 15.75a.75.75 0 01.75-.75h.008v.008h-.008a.75.75 0 01-.75-.75zM8.25 12a.75.75 0 01.75-.75h.008v.008h-.008a.75.75 0 01-.75-.75zM9 15.75a.75.75 0 01.75-.75h.008v.008h-.008a.75.75 0 01-.75-.75z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25c0-.828.672-1.5 1.5-1.5h6a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-6a1.5 1.5 0 01-1.5-1.5v-6z" />
  </svg>
);

export default ChatBubbleLeftRightIcon;
