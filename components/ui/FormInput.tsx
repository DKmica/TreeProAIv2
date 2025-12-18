import React, { forwardRef, useState, useCallback } from 'react';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  mask?: 'phone' | 'currency' | 'zip' | 'ssn' | 'ein' | 'credit-card' | 'date';
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  containerClassName?: string;
}

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const formatCurrency = (value: string): string => {
  const digits = value.replace(/[^\d.]/g, '');
  const parts = digits.split('.');
  const wholePart = parts[0] || '';
  const decimalPart = parts[1] !== undefined ? `.${parts[1].slice(0, 2)}` : '';
  const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return formattedWhole ? `$${formattedWhole}${decimalPart}` : '';
};

const formatZip = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatSSN = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const formatEIN = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

const formatCreditCard = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ');
};

const formatDate = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const maskFormatters: Record<string, (value: string) => string> = {
  phone: formatPhone,
  currency: formatCurrency,
  zip: formatZip,
  ssn: formatSSN,
  ein: formatEIN,
  'credit-card': formatCreditCard,
  date: formatDate,
};

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  hint,
  required,
  leftIcon,
  rightIcon,
  mask,
  onChange,
  className = '',
  containerClassName = '',
  id,
  name,
  disabled,
  value,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    if (mask && maskFormatters[mask]) {
      newValue = maskFormatters[mask](newValue);
    }
    
    if (onChange) {
      onChange(newValue, e);
    }
  }, [mask, onChange]);

  const baseInputClasses = `
    w-full px-3 py-2.5 text-sm text-white bg-brand-gray-800 
    border rounded-lg transition-all duration-200
    placeholder-brand-gray-500
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
      : isFocused 
        ? 'border-brand-cyan-500 ring-brand-cyan-500/30' 
        : 'border-brand-gray-600 hover:border-brand-gray-500'
    }
  `;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-brand-gray-200"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          name={name}
          disabled={disabled}
          value={value}
          className={`${baseInputClasses} ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-sm text-brand-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
