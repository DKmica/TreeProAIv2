import React, { useState, useEffect, useRef, useCallback } from 'react';

interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  formatted?: string;
  lat?: number;
  lng?: number;
}

interface FormAddressInputProps {
  value?: AddressComponents | string;
  onChange?: (address: AddressComponents) => void;
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  showMap?: boolean;
  expandedMode?: boolean;
}

const defaultAddress: AddressComponents = {
  street: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
};

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
];

const FormAddressInput: React.FC<FormAddressInputProps> = ({
  value,
  onChange,
  label,
  name,
  placeholder = 'Start typing an address...',
  required = false,
  disabled = false,
  error,
  hint,
  className = '',
  showMap = false,
  expandedMode = false,
}) => {
  const parseValue = useCallback((): AddressComponents => {
    if (!value) return defaultAddress;
    if (typeof value === 'string') {
      return { ...defaultAddress, formatted: value, street: value };
    }
    return { ...defaultAddress, ...value };
  }, [value]);

  const [address, setAddress] = useState<AddressComponents>(parseValue);
  const [isExpanded, setIsExpanded] = useState(expandedMode);
  const inputId = name || `address-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    setAddress(parseValue());
  }, [value, parseValue]);

  const updateField = (field: keyof AddressComponents, fieldValue: string) => {
    const newAddress = { ...address, [field]: fieldValue };
    newAddress.formatted = formatAddress(newAddress);
    setAddress(newAddress);
    onChange?.(newAddress);
  };

  const formatAddress = (addr: AddressComponents): string => {
    const parts: string[] = [];
    if (addr.street) parts.push(addr.street);
    if (addr.city) parts.push(addr.city);
    if (addr.state) {
      parts.push(addr.zip ? `${addr.state} ${addr.zip}` : addr.state);
    } else if (addr.zip) {
      parts.push(addr.zip);
    }
    return parts.join(', ');
  };

  const inputClasses = `
    w-full px-3 py-2.5 
    bg-brand-gray-800 text-white placeholder-brand-gray-500 
    rounded-lg border transition-colors duration-200
    ${error 
      ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20' 
      : 'border-brand-gray-700 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    focus:outline-none
  `;

  const selectClasses = `
    w-full px-3 py-2.5 
    bg-brand-gray-800 text-white 
    rounded-lg border transition-colors duration-200
    ${error 
      ? 'border-red-500 focus:border-red-400' 
      : 'border-brand-gray-700 focus:border-brand-cyan-500'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    focus:outline-none focus:ring-2 focus:ring-brand-cyan-500/20
    appearance-none cursor-pointer
  `;

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

      {!isExpanded ? (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 pointer-events-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="text"
            id={inputId}
            value={address.formatted || address.street || ''}
            onChange={(e) => updateField('street', e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`${inputClasses} pl-10 pr-10`}
          />
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-white transition-colors"
            title="Expand address fields"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-4 bg-brand-gray-800/50 rounded-lg border border-brand-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-brand-gray-400 uppercase tracking-wider">Address Details</span>
            {!expandedMode && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-brand-gray-400 hover:text-white text-xs transition-colors"
              >
                Collapse
              </button>
            )}
          </div>

          <div>
            <label htmlFor={`${inputId}-street`} className="block text-xs font-medium text-brand-gray-400 mb-1">
              Street Address
            </label>
            <input
              type="text"
              id={`${inputId}-street`}
              value={address.street}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="123 Main Street"
              disabled={disabled}
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${inputId}-city`} className="block text-xs font-medium text-brand-gray-400 mb-1">
                City
              </label>
              <input
                type="text"
                id={`${inputId}-city`}
                value={address.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City"
                disabled={disabled}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor={`${inputId}-state`} className="block text-xs font-medium text-brand-gray-400 mb-1">
                State
              </label>
              <div className="relative">
                <select
                  id={`${inputId}-state`}
                  value={address.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  disabled={disabled}
                  className={selectClasses}
                >
                  <option value="">Select</option>
                  {US_STATES.map(state => (
                    <option key={state.value} value={state.value}>{state.value}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${inputId}-zip`} className="block text-xs font-medium text-brand-gray-400 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                id={`${inputId}-zip`}
                value={address.zip}
                onChange={(e) => updateField('zip', e.target.value)}
                placeholder="12345"
                disabled={disabled}
                maxLength={10}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor={`${inputId}-country`} className="block text-xs font-medium text-brand-gray-400 mb-1">
                Country
              </label>
              <input
                type="text"
                id={`${inputId}-country`}
                value={address.country}
                onChange={(e) => updateField('country', e.target.value)}
                placeholder="US"
                disabled={disabled}
                className={inputClasses}
              />
            </div>
          </div>

          {address.formatted && (
            <div className="pt-2 border-t border-brand-gray-700">
              <p className="text-sm text-brand-gray-300">
                <span className="text-brand-gray-500">Formatted: </span>
                {address.formatted}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-sm text-brand-gray-500">{hint}</p>
      )}
    </div>
  );
};

export default FormAddressInput;
export type { AddressComponents, FormAddressInputProps };
