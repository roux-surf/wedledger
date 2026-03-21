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

  return (
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
      className={className}
      placeholder={placeholder || 'MM/DD/YYYY'}
    />
  );
}
