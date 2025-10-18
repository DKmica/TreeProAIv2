
import React from 'react';

const TreeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M16.5 6a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM17.25 6a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M12 1.5a5.25 5.25 0 00-5.25 5.25.75.75 0 001.5 0A3.75 3.75 0 0112 3a3.75 3.75 0 013.75 3.75.75.75 0 001.5 0A5.25 5.25 0 0012 1.5zM12 12.75a.75.75 0 00-.75.75v6a.75.75 0 001.5 0v-6a.75.75 0 00-.75-.75z"
      clipRule="evenodd"
    />
    <path d="M11.25 21.75a.75.75 0 001.5 0v-6.5a.75.75 0 00-1.5 0v6.5z" />
    <path
      fillRule="evenodd"
      d="M5.25 8.625a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3zM8.625 5.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3zM14.625 5.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3zM20.25 8.625a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z"
      clipRule="evenodd"
    />
  </svg>
);

export default TreeIcon;
