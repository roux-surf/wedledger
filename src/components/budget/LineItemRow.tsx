'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { LineItemWithPayments, Payment, BookingStatus, formatCurrency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/components/ui/Toast';
import DragHandle from '@/components/ui/DragHandle';
import PaymentSchedule from './PaymentSchedule';
import BookingStatusBadge from './BookingStatusBadge';

interface LineItemRowProps {
  item: LineItemWithPayments;
  onUpdate: () => void;
  onDelete: () => void;
  isClientView: boolean;
  renderMode?: 'table' | 'card';
  isDraggable?: boolean;
  showStatusColumn?: boolean;
}

export default function LineItemRow({ item, onUpdate, onDelete, isClientView, renderMode = 'table', isDraggable, showStatusColumn }: LineItemRowProps) {
  const baseColCount = 5 + (showStatusColumn ? 1 : 0);
  const colCount = baseColCount + (!isClientView ? 1 : 0);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContactFields, setShowContactFields] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: item.vendor_name,
    estimated_cost: sanitizeNumericString(item.estimated_cost),
    actual_cost: sanitizeNumericString(item.actual_cost),
    notes: item.notes || '',
    booking_status: item.booking_status || 'none' as BookingStatus,
    vendor_phone: item.vendor_phone || '',
    vendor_email: item.vendor_email || '',
  });
  const [, setLoading] = useState(false);
  const supabase = useSupabaseClient();
  const { showSaved, showToast } = useToast();

  const {
    attributes: sortableAttributes,
    listeners: sortableListeners,
    setNodeRef: setSortableRef,
    transform: sortableTransform,
    transition: sortableTransition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isDraggable || renderMode === 'card' });

  const sortableStyle = {
    transform: CSS.Transform.toString(sortableTransform),
    transition: sortableTransition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const formRef = useRef<HTMLTableRowElement>(null);
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const estimatedInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const payments: Payment[] = item.payments || [];
  const hasPayments = payments.length > 0;

  // Compute paid from payments if they exist, otherwise fall back to legacy
  const displayPaid = hasPayments ? item.total_paid : item.paid_to_date;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumericBlur = (fieldName: string, value: string) => {
    const numValue = parseNumericInput(value);
    const clampedValue = Math.max(0, numValue);
    setFormData((prev) => ({
      ...prev,
      [fieldName]: sanitizeNumericString(clampedValue),
    }));
  };

  const handleBookingStatusChange = async (newStatus: BookingStatus) => {
    try {
      const { error } = await supabase
        .from('line_items')
        .update({ booking_status: newStatus })
        .eq('id', item.id);
      if (error) throw error;
      setFormData(prev => ({ ...prev, booking_status: newStatus }));
      showSaved();
      onUpdate();
    } catch (err) {
      console.warn('Failed to update booking status:', err);
      showToast('Failed to update booking status', 'error');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        vendor_name: formData.vendor_name,
        estimated_cost: parseNumericInput(formData.estimated_cost),
        actual_cost: parseNumericInput(formData.actual_cost),
        notes: formData.notes || null,
        booking_status: formData.booking_status,
        vendor_phone: formData.vendor_phone || null,
        vendor_email: formData.vendor_email || null,
      };
      const { error } = await supabase
        .from('line_items')
        .update(updateData)
        .eq('id', item.id);

      if (error) throw error;
      setIsEditing(false);
      setShowContactFields(false);
      showSaved();
      onUpdate();
    } catch (err) {
      console.warn('Failed to update line item:', err);
      showToast('Failed to update line item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      vendor_name: item.vendor_name,
      estimated_cost: sanitizeNumericString(item.estimated_cost),
      actual_cost: sanitizeNumericString(item.actual_cost),
      notes: item.notes || '',
      booking_status: item.booking_status || 'none',
      vendor_phone: item.vendor_phone || '',
      vendor_email: item.vendor_email || '',
    });
    setIsEditing(false);
    setShowContactFields(false);
  };

  // Reset editing state when switching to client view
  useEffect(() => {
    if (isClientView && isEditing) {
      setIsEditing(false);
    }
  }, [isClientView]);

  // Click-outside handler to exit edit mode
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  const handleStartEdit = (field?: 'vendor' | 'estimated' | 'actual') => {
    if (isClientView) return;
    setFormData({
      vendor_name: item.vendor_name,
      estimated_cost: sanitizeNumericString(item.estimated_cost),
      actual_cost: sanitizeNumericString(item.actual_cost),
      notes: item.notes || '',
      booking_status: item.booking_status || 'none',
      vendor_phone: item.vendor_phone || '',
      vendor_email: item.vendor_email || '',
    });
    setIsEditing(true);
    if (item.vendor_phone || item.vendor_email) {
      setShowContactFields(true);
    }
    if (field) {
      const refMap = { vendor: vendorInputRef, estimated: estimatedInputRef, actual: actualInputRef };
      setTimeout(() => refMap[field].current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };


  const remaining = (isEditing ? parseNumericInput(formData.actual_cost) : item.actual_cost) - displayPaid;

  const getRemainingColor = () => {
    if (remaining < 0) return 'text-rose-dark';
    if (remaining === 0) return 'text-sage-dark';
    return '';
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const getPaymentSubtitle = (): string => {
    if (payments.length === 0) return 'No payments scheduled';
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const dueThisWeek = payments.filter((p) => {
      if (p.status === 'paid' || !p.due_date) return false;
      const due = new Date(p.due_date);
      return due >= now && due <= weekFromNow;
    }).length;
    if (dueThisWeek > 0) {
      return `${payments.length} payment${payments.length !== 1 ? 's' : ''} \u00b7 ${dueThisWeek} due this week`;
    }
    const paidCount = payments.filter((p) => p.status === 'paid').length;
    if (paidCount > 0) {
      return `${payments.length} payment${payments.length !== 1 ? 's' : ''} \u00b7 ${paidCount === 1 ? 'deposit paid' : `${paidCount} paid`}`;
    }
    return `${payments.length} payment${payments.length !== 1 ? 's' : ''}`;
  };

  const paymentBadge = payments.length > 0 ? (
    <button
      onClick={toggleExpand}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-rose-light text-rose-dark hover:bg-rose-light/80 transition-colors"
    >
      {payments.length}
      <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  ) : !isClientView ? (
    <button
      onClick={toggleExpand}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-warm-gray-light hover:text-warm-gray hover:bg-stone-lighter transition-colors"
    >
      <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      payments
    </button>
  ) : null;

  // Card mode (mobile)
  if (renderMode === 'card') {
    if (isEditing && !isClientView) {
      return (
        <div ref={formRef as React.RefObject<HTMLDivElement>} className="p-4 bg-stone-lighter">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-warm-gray uppercase mb-1">Vendor</label>
              <input
                ref={vendorInputRef}
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                className="w-full px-2 py-1.5 border border-stone rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray uppercase mb-1">Status</label>
              <select
                name="booking_status"
                value={formData.booking_status}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-stone rounded text-sm bg-white"
              >
                <option value="none">None</option>
                <option value="inquired">Inquired</option>
                <option value="booked">Booked</option>
                <option value="contracted">Contracted</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-warm-gray uppercase mb-1">Estimated</label>
                <input
                  ref={estimatedInputRef}
                  type="text"
                  inputMode="decimal"
                  name="estimated_cost"
                  value={formData.estimated_cost}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onBlur={(e) => handleNumericBlur('estimated_cost', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 border border-stone rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray uppercase mb-1">Actual</label>
                <input
                  ref={actualInputRef}
                  type="text"
                  inputMode="decimal"
                  name="actual_cost"
                  value={formData.actual_cost}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onBlur={(e) => handleNumericBlur('actual_cost', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 border border-stone rounded text-sm"
                />
              </div>
            </div>
            {!showContactFields ? (
              <button
                type="button"
                onClick={() => setShowContactFields(true)}
                className="text-xs text-warm-gray hover:text-charcoal underline"
              >
                + Contact info
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-warm-gray uppercase mb-1">Phone</label>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    name="vendor_phone"
                    value={formData.vendor_phone}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1.5 border border-stone rounded text-sm"
                    placeholder="555-123-4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-warm-gray uppercase mb-1">Email</label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    name="vendor_email"
                    value={formData.vendor_email}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1.5 border border-stone rounded text-sm"
                    placeholder="vendor@email.com"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1 rounded text-xs font-medium bg-sage text-white hover:bg-sage-dark transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1 rounded text-xs font-medium text-warm-gray hover:bg-stone transition-colors"
                >
                  Cancel
                </button>
              </div>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div
          className="p-4 hover:bg-stone-lighter transition-colors duration-100"
          onClick={isClientView ? undefined : () => handleStartEdit()}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium text-charcoal ${!isClientView ? 'cursor-pointer' : ''}`}>
                {item.vendor_name}
              </span>
              <BookingStatusBadge
                status={item.booking_status || 'none'}
                editable={false}
              />
              {paymentBadge}
            </div>
            <span className={`text-sm ${getRemainingColor() || 'text-warm-gray'}`}>{formatCurrency(remaining)} remaining</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mt-1">
            <div>
              <p className="text-[10px] text-warm-gray-light uppercase tracking-wider">Estimated</p>
              <p className="text-warm-gray tabular-nums">{formatCurrency(item.estimated_cost)}</p>
            </div>
            <div>
              <p className="text-[10px] text-warm-gray-light uppercase tracking-wider">Actual</p>
              <p className="text-warm-gray tabular-nums">{formatCurrency(item.actual_cost)}</p>
            </div>
            <div>
              <p className="text-[10px] text-warm-gray-light uppercase tracking-wider">Paid</p>
              <p className="text-warm-gray tabular-nums">{formatCurrency(displayPaid)}</p>
            </div>
          </div>
          {!isClientView && (item.vendor_phone || item.vendor_email) && (
            <div className="flex items-center gap-3 text-xs text-warm-gray-light mt-1">
              {item.vendor_phone && <span>{item.vendor_phone}</span>}
              {item.vendor_email && <span>{item.vendor_email}</span>}
            </div>
          )}
          {!isClientView && (
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-xs text-warm-gray-light flex-1">{getPaymentSubtitle()}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {isExpanded && (
          <PaymentSchedule
            payments={payments}
            lineItemId={item.id}
            actualCost={item.actual_cost}
            estimatedCost={item.estimated_cost}
            legacyPaidToDate={item.paid_to_date}
            onUpdate={onUpdate}
            isClientView={isClientView}
          />
        )}
      </div>
    );
  }

  // Table mode (desktop)
  if (isEditing && !isClientView) {
    return (
      <Fragment>
        <tr ref={formRef} className="bg-stone-lighter">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={vendorInputRef}
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                className="w-full px-2 py-1 border border-stone rounded text-sm"
              />
              {!showStatusColumn && (
                <select
                  name="booking_status"
                  value={formData.booking_status}
                  onChange={handleChange}
                  className="px-1 py-1 border border-stone rounded text-xs bg-white"
                >
                  <option value="none">None</option>
                  <option value="inquired">Inquired</option>
                  <option value="booked">Booked</option>
                  <option value="contracted">Contracted</option>
                  <option value="completed">Completed</option>
                </select>
              )}
            </div>
            {showContactFields ? (
              <div className="flex gap-2 mt-1">
                <input
                  ref={phoneInputRef}
                  type="tel"
                  name="vendor_phone"
                  value={formData.vendor_phone}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className="w-28 px-2 py-1 border border-stone rounded text-xs"
                  placeholder="Phone"
                />
                <input
                  ref={emailInputRef}
                  type="email"
                  name="vendor_email"
                  value={formData.vendor_email}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-2 py-1 border border-stone rounded text-xs"
                  placeholder="Email"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowContactFields(true)}
                className="text-xs text-warm-gray-light hover:text-warm-gray mt-1"
              >
                + Contact info
              </button>
            )}
          </td>
          {showStatusColumn && (
            <td className="px-4 py-3">
              <select
                name="booking_status"
                value={formData.booking_status}
                onChange={handleChange}
                className="px-1 py-1 border border-stone rounded text-xs bg-white"
              >
                <option value="none">None</option>
                <option value="inquired">Inquired</option>
                <option value="booked">Booked</option>
                <option value="contracted">Contracted</option>
                <option value="completed">Completed</option>
              </select>
            </td>
          )}
          <td className="px-4 py-3 text-right">
            <input
              ref={estimatedInputRef}
              type="text"
              inputMode="decimal"
              name="estimated_cost"
              value={formData.estimated_cost}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={(e) => handleNumericBlur('estimated_cost', e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-24 px-2 py-1 border border-stone rounded text-sm text-right"
            />
          </td>
          <td className="px-4 py-3 text-right">
            <input
              ref={actualInputRef}
              type="text"
              inputMode="decimal"
              name="actual_cost"
              value={formData.actual_cost}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={(e) => handleNumericBlur('actual_cost', e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-24 px-2 py-1 border border-stone rounded text-sm text-right"
            />
          </td>
          <td className="px-4 py-3 text-sm text-warm-gray text-right whitespace-nowrap">{formatCurrency(displayPaid)}{displayPaid > 0 && <span className="text-xs text-warm-gray-light ml-1">paid</span>}</td>
          <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
            <span className={getRemainingColor()}>{formatCurrency(remaining)}</span>
          </td>
          <td className="px-4 py-3 text-sm">
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-2 py-1 rounded text-xs font-medium bg-sage text-white hover:bg-sage-dark transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-2 py-1 rounded text-xs font-medium text-warm-gray hover:bg-stone transition-colors"
                >
                  Cancel
                </button>
              </div>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={colCount} className="p-0">
              <PaymentSchedule
                payments={payments}
                lineItemId={item.id}
                actualCost={item.actual_cost}
                estimatedCost={item.estimated_cost}
                legacyPaidToDate={item.paid_to_date}
                onUpdate={onUpdate}
                isClientView={isClientView}
              />
            </td>
          </tr>
        )}
      </Fragment>
    );
  }

  const clickableClass = !isClientView ? 'cursor-pointer hover:bg-stone-lighter px-1 -mx-1 rounded underline decoration-dashed decoration-transparent hover:decoration-warm-gray-light underline-offset-2 transition-colors' : '';

  return (
    <Fragment>
      <tr ref={setSortableRef} style={sortableStyle} className="hover:bg-stone-lighter transition-colors duration-100">
        <td className="px-4 py-3 text-sm text-charcoal">
          <div className="flex items-center gap-2">
            {isDraggable && (
              <DragHandle listeners={sortableListeners} attributes={sortableAttributes} />
            )}
            <div>
              <span
                onClick={isClientView ? undefined : () => handleStartEdit('vendor')}
                className={clickableClass}
              >
                {item.vendor_name}
              </span>
              {!isClientView && (
                <p className="text-xs text-warm-gray-light">{getPaymentSubtitle()}</p>
              )}
            </div>
            {!showStatusColumn && (
              <BookingStatusBadge
                status={item.booking_status || 'none'}
                editable={!isClientView}
                onChange={handleBookingStatusChange}
              />
            )}
            {paymentBadge}
          </div>
        </td>
        {showStatusColumn && (
          <td className="px-4 py-3 text-sm">
            <BookingStatusBadge
              status={item.booking_status || 'none'}
              editable={!isClientView}
              onChange={handleBookingStatusChange}
            />
          </td>
        )}
        <td className="px-4 py-3 text-sm text-charcoal text-right whitespace-nowrap">
          <span
            onClick={isClientView ? undefined : () => handleStartEdit('estimated')}
            className={clickableClass}
          >
            {formatCurrency(item.estimated_cost)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-charcoal text-right whitespace-nowrap">
          <span
            onClick={isClientView ? undefined : () => handleStartEdit('actual')}
            className={clickableClass}
          >
            {formatCurrency(item.actual_cost)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-warm-gray text-right whitespace-nowrap">
          {formatCurrency(displayPaid)}{displayPaid > 0 && <span className="text-xs text-warm-gray-light ml-1">paid</span>}
        </td>
        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
          <span className={getRemainingColor()}>{formatCurrency(remaining)}</span>
        </td>
        {!isClientView && (
          <td className="px-4 py-3 text-sm">
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-warm-gray-light hover:text-rose-dark hover:bg-rose-light"
              aria-label="Delete"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={colCount} className="p-0">
            <PaymentSchedule
              payments={payments}
              lineItemId={item.id}
              actualCost={item.actual_cost}
              estimatedCost={item.estimated_cost}
              legacyPaidToDate={item.paid_to_date}
              onUpdate={onUpdate}
              isClientView={isClientView}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
