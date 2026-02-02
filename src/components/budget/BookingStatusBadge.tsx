'use client';

import { useState, useRef, useEffect } from 'react';
import { BookingStatus, BOOKING_STATUS_CONFIG } from '@/lib/types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  editable?: boolean;
  onChange?: (status: BookingStatus) => void;
}

export default function BookingStatusBadge({ status, editable = false, onChange }: BookingStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = BOOKING_STATUS_CONFIG[status];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (status === 'none' && !editable) return null;

  const badge = (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color} ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={editable ? (e) => { e.stopPropagation(); setIsOpen(!isOpen); } : undefined}
    >
      {config.label}
      {editable && (
        <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </span>
  );

  if (!editable) return badge;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {badge}
      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
          {(Object.entries(BOOKING_STATUS_CONFIG) as [BookingStatus, typeof config][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(key);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2 ${status === key ? 'font-medium' : ''}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('100', '400')}`}
                style={{ backgroundColor: key === 'none' ? '#94a3b8' : key === 'inquired' ? '#3b82f6' : key === 'booked' ? '#f59e0b' : key === 'contracted' ? '#a855f7' : '#22c55e' }}
              />
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
