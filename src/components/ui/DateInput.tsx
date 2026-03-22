'use client';

import { useState, useRef, useEffect } from 'react';

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

function displayToIso(display: string): string {
  const parts = display.split('/');
  if (parts.length !== 3) return '';
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy || yyyy.length !== 4) return '';
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return '';
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return '';
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

interface DateInputProps {
  value: string;
  onChange: (iso: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  className?: string;
  placeholder?: string;
}

export default function DateInput({ value, onChange, onKeyDown, onBlur, className, placeholder }: DateInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current || document.activeElement !== inputRef.current) {
      setDisplay(isoToDisplay(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = autoFormat(e.target.value);
    setDisplay(formatted);
  };

  const commit = () => {
    if (!display) {
      onChange('');
      return;
    }
    const iso = displayToIso(display);
    if (iso) {
      onChange(iso);
      setDisplay(isoToDisplay(iso));
    } else {
      setDisplay(isoToDisplay(value));
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    commit();
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
    }
    onKeyDown?.(e);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      onChange(iso);
      setDisplay(isoToDisplay(iso));
    }
  };

  return (
    <div className="relative inline-flex items-center w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={10}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.target.select()}
        className={`${className} pr-7`}
        placeholder={placeholder || 'MM/DD/YYYY'}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => pickerRef.current?.showPicker()}
        className="absolute right-1.5 p-0.5 text-warm-gray-light hover:text-warm-gray transition-colors"
        aria-label="Open calendar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={handlePickerChange}
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
