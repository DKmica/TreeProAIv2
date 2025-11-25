import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

interface FormComboboxProps {
  label?: string;
  placeholder?: string;
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string, option: ComboboxOption | null) => void;
  onSearch?: (query: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  creatable?: boolean;
  onCreate?: (value: string) => void;
  groupBy?: boolean;
  emptyMessage?: string;
  className?: string;
  name?: string;
}

const FormCombobox: React.FC<FormComboboxProps> = ({
  label,
  placeholder = 'Select an option...',
  options,
  value,
  onChange,
  onSearch,
  error,
  hint,
  required,
  disabled,
  loading,
  clearable = true,
  searchable = true,
  creatable = false,
  onCreate,
  groupBy = false,
  emptyMessage = 'No options found',
  className = '',
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value) || null,
  [options, value]);

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    const lowerQuery = query.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerQuery) ||
      opt.description?.toLowerCase().includes(lowerQuery)
    );
  }, [options, query]);

  const groupedOptions = useMemo((): Record<string, ComboboxOption[]> => {
    if (!groupBy) return { '': filteredOptions };
    return filteredOptions.reduce<Record<string, ComboboxOption[]>>((acc, opt) => {
      const group = opt.group || '';
      if (!acc[group]) acc[group] = [];
      acc[group].push(opt);
      return acc;
    }, {});
  }, [filteredOptions, groupBy]);

  const flatOptions = useMemo(() => {
    if (!groupBy) return filteredOptions;
    return Object.values(groupedOptions).flat();
  }, [groupedOptions, groupBy, filteredOptions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = useCallback((option: ComboboxOption) => {
    if (option.disabled) return;
    onChange?.(option.value, option);
    setIsOpen(false);
    setQuery('');
    setHighlightedIndex(-1);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('', null);
    setQuery('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < flatOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : flatOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatOptions[highlightedIndex]) {
          handleSelect(flatOptions[highlightedIndex]);
        } else if (creatable && query && !flatOptions.length) {
          onCreate?.(query);
          setQuery('');
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, highlightedIndex, flatOptions, handleSelect, creatable, query, onCreate]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setHighlightedIndex(-1);
    onSearch?.(newQuery);
    if (!isOpen) setIsOpen(true);
  }, [onSearch, isOpen]);

  const inputId = name || `combobox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-brand-gray-200 mb-1.5"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div
        className={`
          relative flex items-center
          bg-brand-gray-800 border rounded-lg
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${error 
            ? 'border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/30' 
            : isOpen
              ? 'border-brand-cyan-500 ring-2 ring-brand-cyan-500/30'
              : 'border-brand-gray-600 hover:border-brand-gray-500'
          }
        `}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {searchable ? (
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={isOpen ? query : (selectedOption?.label || '')}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedOption ? '' : placeholder}
            disabled={disabled}
            className="flex-1 px-3 py-2.5 text-sm bg-transparent text-white placeholder-brand-gray-500 outline-none"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={`${inputId}-listbox`}
            aria-autocomplete="list"
          />
        ) : (
          <div className="flex-1 px-3 py-2.5 text-sm">
            {selectedOption ? (
              <span className="text-white">{selectedOption.label}</span>
            ) : (
              <span className="text-brand-gray-500">{placeholder}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 pr-2">
          {loading && (
            <svg className="w-4 h-4 animate-spin text-brand-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-brand-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <svg 
            className={`w-4 h-4 text-brand-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-50 w-full mt-1 py-1 bg-brand-gray-900 border border-brand-gray-700 rounded-lg shadow-xl max-h-60 overflow-auto"
        >
          {Object.entries(groupedOptions).map(([group, groupOptions]: [string, ComboboxOption[]]) => (
            <React.Fragment key={group || 'default'}>
              {group && groupBy && (
                <li className="px-3 py-1.5 text-xs font-semibold text-brand-gray-400 uppercase tracking-wider">
                  {group}
                </li>
              )}
              {groupOptions.map((option, idx) => {
                const globalIndex = flatOptions.indexOf(option);
                const isHighlighted = globalIndex === highlightedIndex;
                const isSelected = option.value === value;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    className={`
                      px-3 py-2 cursor-pointer transition-colors
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isHighlighted ? 'bg-brand-gray-800' : ''}
                      ${isSelected ? 'bg-brand-cyan-500/20 text-brand-cyan-300' : 'text-white hover:bg-brand-gray-800'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-brand-gray-400 truncate">{option.description}</div>
                        )}
                      </div>
                      {isSelected && (
                        <svg className="w-4 h-4 text-brand-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </li>
                );
              })}
            </React.Fragment>
          ))}

          {flatOptions.length === 0 && (
            <li className="px-3 py-6 text-center">
              {creatable && query ? (
                <button
                  type="button"
                  onClick={() => {
                    onCreate?.(query);
                    setQuery('');
                    setIsOpen(false);
                  }}
                  className="text-sm text-brand-cyan-400 hover:text-brand-cyan-300"
                >
                  Create "{query}"
                </button>
              ) : (
                <span className="text-sm text-brand-gray-500">{emptyMessage}</span>
              )}
            </li>
          )}
        </ul>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="mt-1.5 text-sm text-brand-gray-400">{hint}</p>
      )}
    </div>
  );
};

export default FormCombobox;
