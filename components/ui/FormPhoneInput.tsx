import React, { useState, useEffect, useRef, useCallback } from 'react';

type PhoneType = 'mobile' | 'home' | 'work' | 'fax' | 'other';

interface PhoneNumber {
  number: string;
  type: PhoneType;
  isPrimary?: boolean;
  formatted?: string;
}

interface FormPhoneInputProps {
  value?: string | PhoneNumber;
  onChange?: (phone: PhoneNumber) => void;
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  showTypeSelector?: boolean;
  defaultType?: PhoneType;
}

const PHONE_TYPES: { value: PhoneType; label: string; icon: React.ReactNode }[] = [
  { 
    value: 'mobile', 
    label: 'Mobile',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    value: 'home', 
    label: 'Home',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  { 
    value: 'work', 
    label: 'Work',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  { 
    value: 'fax', 
    label: 'Fax',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    )
  },
  { 
    value: 'other', 
    label: 'Other',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )
  },
];

const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

const parsePhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 10);
};

const isValidPhone = (value: string): boolean => {
  const numbers = value.replace(/\D/g, '');
  return numbers.length === 10;
};

const FormPhoneInput: React.FC<FormPhoneInputProps> = ({
  value,
  onChange,
  label,
  name,
  placeholder = '(555) 555-5555',
  required = false,
  disabled = false,
  error,
  hint,
  className = '',
  showTypeSelector = true,
  defaultType = 'mobile',
}) => {
  const parseValue = useCallback((): PhoneNumber => {
    if (!value) return { number: '', type: defaultType as PhoneType };
    if (typeof value === 'string') {
      return { number: parsePhoneNumber(value), type: defaultType as PhoneType, formatted: formatPhoneNumber(value) };
    }
    return { ...value, formatted: formatPhoneNumber(value.number) };
  }, [value, defaultType]);

  const [phone, setPhone] = useState<PhoneNumber>(parseValue);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const inputId = name || `phone-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    setPhone(parseValue());
  }, [value, parseValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setIsTypeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numbers = parsePhoneNumber(rawValue);
    const formatted = formatPhoneNumber(rawValue);
    
    const newPhone: PhoneNumber = {
      ...phone,
      number: numbers,
      formatted,
    };
    
    setPhone(newPhone);
    onChange?.(newPhone);
  };

  const handleTypeSelect = (type: PhoneType) => {
    const newPhone: PhoneNumber = { ...phone, type };
    setPhone(newPhone);
    onChange?.(newPhone);
    setIsTypeOpen(false);
  };

  const selectedType = PHONE_TYPES.find(t => t.value === phone.type) || PHONE_TYPES[0];
  const isValid = phone.number.length === 0 || isValidPhone(phone.number);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-brand-gray-300"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="flex">
        {showTypeSelector && (
          <div className="relative" ref={typeRef}>
            <button
              type="button"
              onClick={() => setIsTypeOpen(!isTypeOpen)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2.5 
                bg-brand-gray-800 text-brand-gray-300
                border border-r-0 border-brand-gray-700 rounded-l-lg
                hover:bg-brand-gray-700 transition-colors
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="text-brand-gray-400">{selectedType.icon}</span>
              <svg 
                className={`w-3 h-3 text-brand-gray-400 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isTypeOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 py-1 bg-brand-gray-800 border border-brand-gray-700 rounded-lg shadow-xl z-50">
                {PHONE_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeSelect(type.value)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                      ${phone.type === type.value 
                        ? 'bg-brand-cyan-500/20 text-brand-cyan-300' 
                        : 'text-brand-gray-300 hover:bg-brand-gray-700'
                      }
                    `}
                  >
                    <span className="text-brand-gray-400">{type.icon}</span>
                    <span>{type.label}</span>
                    {phone.type === type.value && (
                      <svg className="w-4 h-4 ml-auto text-brand-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative flex-1">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 pointer-events-none ${showTypeSelector ? 'hidden' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          
          <input
            ref={inputRef}
            type="tel"
            id={inputId}
            name={name}
            value={phone.formatted || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-invalid={!!error || !isValid}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={`
              w-full px-3 py-2.5 
              bg-brand-gray-800 text-white placeholder-brand-gray-500 
              border transition-colors duration-200
              ${showTypeSelector ? 'rounded-r-lg rounded-l-none' : 'rounded-lg pl-10'}
              ${error || !isValid
                ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20' 
                : 'border-brand-gray-700 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              focus:outline-none
            `}
          />

          {phone.number.length > 0 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}
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
        <p id={`${inputId}-hint`} className="text-sm text-brand-gray-500">{hint}</p>
      )}
    </div>
  );
};

export default FormPhoneInput;
export type { PhoneNumber, PhoneType, FormPhoneInputProps };
