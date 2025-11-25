import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface FormDatePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  clearable?: boolean;
  showTime?: boolean;
  className?: string;
  name?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const FormDatePicker: React.FC<FormDatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date...',
  error,
  hint,
  required,
  disabled,
  minDate,
  maxDate,
  clearable = true,
  showTime = false,
  className = '',
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  const [time, setTime] = useState(() => {
    if (value && showTime) {
      const date = new Date(value);
      return {
        hours: date.getHours().toString().padStart(2, '0'),
        minutes: date.getMinutes().toString().padStart(2, '0'),
      };
    }
    return { hours: '09', minutes: '00' };
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = name || `datepicker-${Math.random().toString(36).substr(2, 9)}`;

  const selectedDate = useMemo(() => {
    if (!value) return null;
    return new Date(value);
  }, [value]);

  const minDateObj = useMemo(() => minDate ? new Date(minDate) : null, [minDate]);
  const maxDateObj = useMemo(() => maxDate ? new Date(maxDate) : null, [maxDate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean; isDisabled: boolean }[] = [];
    
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date, isCurrentMonth: false, isDisabled: isDateDisabled(date) });
    }
    
    for (let i = 1; i <= daysCount; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true, isDisabled: isDateDisabled(date) });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, isDisabled: isDateDisabled(date) });
    }
    
    return days;
  }, [viewDate, minDateObj, maxDateObj]);

  const isDateDisabled = useCallback((date: Date) => {
    if (minDateObj && date < minDateObj) return true;
    if (maxDateObj && date > maxDateObj) return true;
    return false;
  }, [minDateObj, maxDateObj]);

  const isSameDay = useCallback((date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }, []);

  const isToday = useCallback((date: Date) => {
    return isSameDay(new Date(), date);
  }, [isSameDay]);

  const handleDateSelect = useCallback((date: Date) => {
    if (showTime) {
      date.setHours(parseInt(time.hours), parseInt(time.minutes));
    }
    onChange?.(date.toISOString());
    if (!showTime) {
      setIsOpen(false);
    }
  }, [onChange, showTime, time]);

  const handleTimeChange = useCallback((type: 'hours' | 'minutes', val: string) => {
    const newTime = { ...time, [type]: val };
    setTime(newTime);
    
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(newTime.hours), parseInt(newTime.minutes));
      onChange?.(newDate.toISOString());
    }
  }, [time, selectedDate, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  }, [onChange]);

  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }, []);

  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate(prev => new Date(prev.getFullYear() + direction, prev.getMonth(), 1));
  }, []);

  const formatDisplayDate = useCallback((date: Date | null) => {
    if (!date) return '';
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(showTime && { hour: '2-digit', minute: '2-digit' }),
    };
    return date.toLocaleDateString('en-US', options);
  }, [showTime]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setViewDate(today);
    if (!isDateDisabled(today)) {
      handleDateSelect(today);
    }
  }, [handleDateSelect, isDateDisabled]);

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
        <div className="absolute left-3 text-brand-gray-400 pointer-events-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <input
          id={inputId}
          type="text"
          readOnly
          value={formatDisplayDate(selectedDate)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 pl-10 pr-8 py-2.5 text-sm bg-transparent text-white placeholder-brand-gray-500 outline-none cursor-pointer"
        />

        <div className="flex items-center gap-1 pr-2">
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
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 p-3 bg-brand-gray-900 border border-brand-gray-700 rounded-lg shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateYear(-1)}
                className="p-1 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <span className="text-sm font-medium text-white">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => navigateYear(1)}
                className="p-1 text-brand-gray-400 hover:text-white hover:bg-brand-gray-800 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(day => (
              <div key={day} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-brand-gray-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map(({ date, isCurrentMonth, isDisabled }, idx) => {
              const selected = isSameDay(selectedDate, date);
              const today = isToday(date);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDateSelect(date)}
                  className={`
                    w-8 h-8 flex items-center justify-center text-sm rounded-md
                    transition-colors
                    ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    ${!isCurrentMonth ? 'text-brand-gray-600' : 'text-white'}
                    ${selected ? 'bg-brand-cyan-500 text-white font-medium' : ''}
                    ${today && !selected ? 'ring-1 ring-brand-cyan-500' : ''}
                    ${!selected && !isDisabled && isCurrentMonth ? 'hover:bg-brand-gray-800' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {showTime && (
            <div className="mt-3 pt-3 border-t border-brand-gray-700 flex items-center gap-2">
              <span className="text-xs text-brand-gray-400">Time:</span>
              <select
                value={time.hours}
                onChange={(e) => handleTimeChange('hours', e.target.value)}
                className="bg-brand-gray-800 text-white text-sm rounded px-2 py-1 border border-brand-gray-600 focus:border-brand-cyan-500 outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className="text-white">:</span>
              <select
                value={time.minutes}
                onChange={(e) => handleTimeChange('minutes', e.target.value)}
                className="bg-brand-gray-800 text-white text-sm rounded px-2 py-1 border border-brand-gray-600 focus:border-brand-cyan-500 outline-none"
              >
                {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-brand-gray-700 flex justify-between">
            <button
              type="button"
              onClick={goToToday}
              className="text-xs text-brand-cyan-400 hover:text-brand-cyan-300 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-brand-gray-400 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
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

export default FormDatePicker;
