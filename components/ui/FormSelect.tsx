import React, { forwardRef, useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string, event: React.ChangeEvent<HTMLSelectElement>) => void;
  containerClassName?: string;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(({
  label,
  error,
  hint,
  required,
  options,
  placeholder = 'Select an option',
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
  
  const inputId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value, e);
    }
  };

  const baseSelectClasses = `
    w-full px-3 py-2.5 text-sm text-white bg-brand-gray-800 
    border rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    appearance-none cursor-pointer
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
        <select
          ref={ref}
          id={inputId}
          name={name}
          disabled={disabled}
          value={value}
          className={`${baseSelectClasses} ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-brand-gray-500">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
              className="bg-brand-gray-800 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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

FormSelect.displayName = 'FormSelect';

export default FormSelect;
