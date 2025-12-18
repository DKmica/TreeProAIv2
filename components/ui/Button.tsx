import React, { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-brand-cyan-600 to-brand-cyan-500 
    text-white font-semibold
    hover:from-brand-cyan-500 hover:to-brand-cyan-400
    focus:ring-brand-cyan-500/50
    shadow-lg shadow-brand-cyan-500/20
    disabled:from-brand-gray-600 disabled:to-brand-gray-600
  `,
  secondary: `
    bg-brand-gray-700 text-white font-medium
    border border-brand-gray-600
    hover:bg-brand-gray-600 hover:border-brand-gray-500
    focus:ring-brand-gray-500/50
  `,
  ghost: `
    bg-transparent text-brand-gray-300
    hover:bg-brand-gray-800 hover:text-white
    focus:ring-brand-gray-500/50
  `,
  danger: `
    bg-gradient-to-r from-red-600 to-red-500 
    text-white font-semibold
    hover:from-red-500 hover:to-red-400
    focus:ring-red-500/50
    shadow-lg shadow-red-500/20
  `,
  success: `
    bg-gradient-to-r from-emerald-600 to-emerald-500 
    text-white font-semibold
    hover:from-emerald-500 hover:to-emerald-400
    focus:ring-emerald-500/50
    shadow-lg shadow-emerald-500/20
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};

const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => (
  <svg 
    className={`animate-spin ${iconSizeClasses[size]}`} 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseClasses = `
    inline-flex items-center justify-center
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-gray-900
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
  `;

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner size={size} />
      ) : leftIcon ? (
        <span className={iconSizeClasses[size]}>{leftIcon}</span>
      ) : null}
      
      {children}
      
      {!isLoading && rightIcon && (
        <span className={iconSizeClasses[size]}>{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
