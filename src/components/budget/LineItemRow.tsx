'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { LineItemWithPayments, Payment, BookingStatus, formatCurrency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '@/components/ui/Button';
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
}

export default function LineItemRow({ item, onUpdate, onDelete, isClientView, renderMode = 'table', isDraggable }: LineItemRowProps) {
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
  const supabase = createClient();
  const { showSaved } = useToast();

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
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
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
      console.error('Failed to update booking status:', err);
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
      // Sync paid_to_date for backward compat
      if (hasPayments) {
        updateData.paid_to_date = item.total_paid;
      }

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
      console.error('Failed to update line item:', err);
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

  const handleStartEdit = () => {
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

  const handleBlur = (e: React.FocusEvent) => {
    const focusedElement = e.relatedTarget as HTMLElement;
    const editableInputs = [
      vendorInputRef.current,
      estimatedInputRef.current,
      actualInputRef.current,
      notesInputRef.current,
      phoneInputRef.current,
      emailInputRef.current,
    ];
    if (editableInputs.includes(focusedElement as HTMLInputElement | HTMLTextAreaElement)) {
      return;
    }
    // Don't auto-save if focus moved to a select or button inside the form
    if (formRef.current?.contains(focusedElement)) {
      return;
    }
    handleSave();
  };

  const remaining = parseNumericInput(formData.actual_cost) - displayPaid;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const paymentBadge = payments.length > 0 ? (
    <button
      onClick={toggleExpand}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
    >
      <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      {payments.length} payment{payments.length !== 1 ? 's' : ''}
    </button>
  ) : !isClientView ? (
    <button
      onClick={toggleExpand}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
        <div className="p-4 bg-slate-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Vendor</label>
              <input
                ref={vendorInputRef}
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={(e) => e.target.select()}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Status</label>
              <select
                name="booking_status"
                value={formData.booking_status}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
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
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Estimated</label>
                <input
                  ref={estimatedInputRef}
                  type="text"
                  inputMode="decimal"
                  name="estimated_cost"
                  value={formData.estimated_cost}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onBlur={(e) => {
                    handleNumericBlur('estimated_cost', e.target.value);
                    handleBlur(e);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Actual</label>
                <input
                  ref={actualInputRef}
                  type="text"
                  inputMode="decimal"
                  name="actual_cost"
                  value={formData.actual_cost}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onBlur={(e) => {
                    handleNumericBlur('actual_cost', e.target.value);
                    handleBlur(e);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Notes</label>
              <textarea
                ref={notesInputRef}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                rows={2}
              />
            </div>
            {!showContactFields ? (
              <button
                type="button"
                onClick={() => setShowContactFields(true)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                + Contact info
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Phone</label>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    name="vendor_phone"
                    value={formData.vendor_phone}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    placeholder="555-123-4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Email</label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    name="vendor_email"
                    value={formData.vendor_email}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    placeholder="vendor@email.com"
                  />
                </div>
              </div>
            )}
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div
          className="p-4"
          onClick={isClientView ? undefined : () => handleStartEdit()}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium text-slate-900 ${!isClientView ? 'cursor-pointer' : ''}`}>
                {item.vendor_name}
              </span>
              <BookingStatusBadge
                status={item.booking_status || 'none'}
                editable={false}
              />
              {paymentBadge}
            </div>
            <span className="text-sm text-slate-600">{formatCurrency(remaining)} remaining</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Est: {formatCurrency(item.estimated_cost)}</span>
            <span>Actual: {formatCurrency(item.actual_cost)}</span>
            <span>Paid: {formatCurrency(displayPaid)}</span>
          </div>
          {!isClientView && item.notes && (
            <p className="text-xs text-slate-400 mt-1 truncate">{item.notes}</p>
          )}
          {!isClientView && (item.vendor_phone || item.vendor_email) && (
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              {item.vendor_phone && <span>{item.vendor_phone}</span>}
              {item.vendor_email && <span>{item.vendor_email}</span>}
            </div>
          )}
          {!isClientView && (
            <div className="mt-2">
              <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                Delete
              </Button>
            </div>
          )}
        </div>
        {isExpanded && (
          <PaymentSchedule
            payments={payments}
            lineItemId={item.id}
            actualCost={item.actual_cost}
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
        <tr ref={formRef} className="bg-slate-50">
          <td className="px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                ref={vendorInputRef}
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={(e) => e.target.select()}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              />
              <select
                name="booking_status"
                value={formData.booking_status}
                onChange={handleChange}
                className="px-1 py-1 border border-slate-300 rounded text-xs bg-white"
              >
                <option value="none">None</option>
                <option value="inquired">Inquired</option>
                <option value="booked">Booked</option>
                <option value="contracted">Contracted</option>
                <option value="completed">Completed</option>
              </select>
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
                  onBlur={handleBlur}
                  className="w-28 px-2 py-1 border border-slate-200 rounded text-xs"
                  placeholder="Phone"
                />
                <input
                  ref={emailInputRef}
                  type="email"
                  name="vendor_email"
                  value={formData.vendor_email}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs"
                  placeholder="Email"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowContactFields(true)}
                className="text-xs text-slate-400 hover:text-slate-600 mt-1"
              >
                + Contact info
              </button>
            )}
          </td>
          <td className="px-3 py-2">
            <input
              ref={estimatedInputRef}
              type="text"
              inputMode="decimal"
              name="estimated_cost"
              value={formData.estimated_cost}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={(e) => {
                handleNumericBlur('estimated_cost', e.target.value);
                handleBlur(e);
              }}
              onFocus={(e) => e.target.select()}
              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
            />
          </td>
          <td className="px-3 py-2">
            <input
              ref={actualInputRef}
              type="text"
              inputMode="decimal"
              name="actual_cost"
              value={formData.actual_cost}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={(e) => {
                handleNumericBlur('actual_cost', e.target.value);
                handleBlur(e);
              }}
              onFocus={(e) => e.target.select()}
              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
            />
          </td>
          <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(displayPaid)}</td>
          <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(remaining)}</td>
          <td className="px-3 py-2">
            <textarea
              ref={notesInputRef}
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              rows={1}
            />
          </td>
          <td className="px-3 py-2">
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={7} className="p-0">
              <PaymentSchedule
                payments={payments}
                lineItemId={item.id}
                actualCost={item.actual_cost}
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

  const clickableClass = !isClientView ? 'cursor-pointer hover:bg-slate-100 px-1 -mx-1 rounded' : '';

  return (
    <Fragment>
      <tr ref={setSortableRef} style={sortableStyle}>
        <td className="px-3 py-2 text-sm text-slate-900">
          <div className="flex items-center gap-2">
            {isDraggable && (
              <DragHandle listeners={sortableListeners} attributes={sortableAttributes} />
            )}
            <span
              onClick={isClientView ? undefined : () => handleStartEdit()}
              className={clickableClass}
            >
              {item.vendor_name}
            </span>
            <BookingStatusBadge
              status={item.booking_status || 'none'}
              editable={!isClientView}
              onChange={handleBookingStatusChange}
            />
            {paymentBadge}
          </div>
          {!isClientView && (item.vendor_phone || item.vendor_email) && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              {item.vendor_phone && <span>{item.vendor_phone}</span>}
              {item.vendor_email && <span>{item.vendor_email}</span>}
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-sm text-slate-900">
          <span
            onClick={isClientView ? undefined : () => handleStartEdit()}
            className={clickableClass}
          >
            {formatCurrency(item.estimated_cost)}
          </span>
        </td>
        <td className="px-3 py-2 text-sm text-slate-900">
          <span
            onClick={isClientView ? undefined : () => handleStartEdit()}
            className={clickableClass}
          >
            {formatCurrency(item.actual_cost)}
          </span>
        </td>
        <td className="px-3 py-2 text-sm text-slate-900">
          {formatCurrency(displayPaid)}
        </td>
        <td className="px-3 py-2 text-sm text-slate-900">{formatCurrency(remaining)}</td>
        {!isClientView && (
          <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate">
            <span
              onClick={isClientView ? undefined : () => handleStartEdit()}
              className={clickableClass}
            >
              {item.notes || '-'}
            </span>
          </td>
        )}
        {!isClientView && (
          <td className="px-3 py-2">
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={!isClientView ? 7 : 5} className="p-0">
            <PaymentSchedule
              payments={payments}
              lineItemId={item.id}
              actualCost={item.actual_cost}
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
