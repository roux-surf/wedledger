'use client';

import { useState, useRef, useEffect } from 'react';

interface DateInputProps {
  value: string; // ISO format YYYY-MM-DD or empty
  onChange: (isoDate: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Converts ISO date (YYYY-MM-DD) to display format (MM/DD/YYYY)
 */
function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

/**
 * Converts display format (MM/DD/YYYY) to ISO (YYYY-MM-DD), validating the date.
 * Returns empty string if invalid.
 */
function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, '');
  if (digits.length !== 8) return '';

  const month = parseInt(digits.slice(0, 2), 10);
  const day = parseInt(digits.slice(2, 4), 10);
  const year = parseInt(digits.slice(4, 8), 10);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return '';

  // Validate day is valid for the given month/year
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return '';
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Auto-formats digit input as MM/DD/YYYY, inserting slashes after MM and DD.
 */
function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export default function DateInput({
  value,
  onChange,
  onKeyDown,
  onBlur,
  className = '',
  placeholder = 'MM/DD/YYYY',
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display value when external value changes
  useEffect(() => {
    setDisplayValue(isoToDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = autoFormat(e.target.value);
    setDisplayValue(formatted);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const iso = displayToIso(displayValue);
    if (iso) {
      onChange(iso);
      setDisplayValue(isoToDisplay(iso));
    } else if (displayValue === '') {
      onChange('');
    } else {
      // Invalid date — revert to previous valid value
      setDisplayValue(isoToDisplay(value));
    }
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const iso = displayToIso(displayValue);
      if (iso) {
        onChange(iso);
        setDisplayValue(isoToDisplay(iso));
      } else if (displayValue === '') {
        onChange('');
      }
    }
    onKeyDown?.(e);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
      className={className}
      maxLength={10}
    />
  );
}
