import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div
    className={`bg-brand-gray-800/50 border border-brand-gray-700 rounded-xl ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div className={`flex flex-row items-center justify-between px-5 pt-5 pb-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <h3 className={`text-sm font-medium text-brand-gray-400 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div className={`px-5 pb-5 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
