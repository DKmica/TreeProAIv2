import React, { forwardRef, useState, useEffect, useRef } from 'react';

interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  showCount?: boolean;
  autoResize?: boolean;
  onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  containerClassName?: string;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(({
  label,
  error,
  hint,
  required,
  maxLength,
  showCount = false,
  autoResize = false,
  onChange,
  className = '',
  containerClassName = '',
  id,
  name,
  disabled,
  value,
  rows = 4,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
  const inputId = id || name || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (typeof value === 'string') {
      setCharCount(value.length);
    }
  }, [value]);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCharCount(newValue.length);
    
    if (onChange) {
      onChange(newValue, e);
    }
  };

  const baseTextareaClasses = `
    w-full px-3 py-2.5 text-sm text-white bg-brand-gray-800 
    border rounded-lg transition-all duration-200
    placeholder-brand-gray-500
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    resize-none
    ${error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
      : isFocused 
        ? 'border-brand-cyan-500 ring-brand-cyan-500/30' 
        : 'border-brand-gray-600 hover:border-brand-gray-500'
    }
  `;

  const isOverLimit = maxLength && charCount > maxLength;

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
        <textarea
          ref={textareaRef}
          id={inputId}
          name={name}
          disabled={disabled}
          value={value}
          rows={rows}
          maxLength={maxLength}
          className={`${baseTextareaClasses} ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      
      <div className="flex justify-between items-start">
        <div>
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
        
        {(showCount || maxLength) && (
          <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-brand-gray-400'}`}>
            {charCount}{maxLength ? `/${maxLength}` : ''}
          </span>
        )}
      </div>
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
