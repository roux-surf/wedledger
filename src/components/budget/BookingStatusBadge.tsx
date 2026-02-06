'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookingStatus, BOOKING_STATUS_CONFIG } from '@/lib/types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  editable?: boolean;
  onChange?: (status: BookingStatus) => void;
}

export default function BookingStatusBadge({ status, editable = false, onChange }: BookingStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = BOOKING_STATUS_CONFIG[status];

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        badgeRef.current && !badgeRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close dropdown on scroll or resize to prevent stale positioning
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => setIsOpen(false);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  if (status === 'none' && !editable) return null;

  const badge = (
    <span
      ref={badgeRef}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color} ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={editable ? handleBadgeClick : undefined}
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

  const dropdown = isOpen && position && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]"
      style={{ top: position.top, left: position.left }}
    >
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
    </div>,
    document.body
  );

  return (
    <span className="inline-block">
      {badge}
      {dropdown}
    </span>
  );
}
