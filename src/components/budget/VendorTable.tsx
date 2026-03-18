'use client';

import { useMemo, useState, useRef } from 'react';
import { CategoryWithSpend, BookingStatus, formatCurrency, parseNumericInput, sanitizeNumericString, getPaymentUrgency } from '@/lib/types';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LineItemRow from './LineItemRow';

interface VendorTableProps {
  categories: CategoryWithSpend[];
  onUpdate: () => void;
  isClientView: boolean;
}

function PaymentSummaryBanner({ categories }: { categories: CategoryWithSpend[] }) {
  const stats = useMemo(() => {
    let overdueCount = 0;
    let dueThisWeekCount = 0;
    let totalRemaining = 0;
    let hasPayments = false;

    for (const cat of categories) {
      for (const item of cat.line_items || []) {
        for (const payment of item.payments || []) {
          hasPayments = true;
          if (payment.status === 'paid') continue;
          totalRemaining += Number(payment.amount) || 0;
          if (payment.due_date) {
            const urgency = getPaymentUrgency(payment.due_date);
            if (urgency === 'overdue') overdueCount++;
            else if (urgency === 'this_week') dueThisWeekCount++;
          }
        }
      }
    }

    return { overdueCount, dueThisWeekCount, totalRemaining, hasPayments };
  }, [categories]);

  if (!stats.hasPayments) return null;

  const allClear = stats.overdueCount === 0 && stats.dueThisWeekCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 bg-stone-lighter border-b border-stone text-sm">
      {stats.overdueCount > 0 && (
        <span className="flex items-center gap-1.5 text-rose-dark">
          <span className="w-2 h-2 rounded-full bg-rose shrink-0" />
          {stats.overdueCount} overdue
        </span>
      )}
      {stats.dueThisWeekCount > 0 && (
        <span className="flex items-center gap-1.5 text-champagne-dark">
          <span className="w-2 h-2 rounded-full bg-champagne shrink-0" />
          {stats.dueThisWeekCount} due this week
        </span>
      )}
      {stats.totalRemaining > 0 && (
        <span className="text-warm-gray">
          {formatCurrency(stats.totalRemaining)} remaining to pay
        </span>
      )}
      {allClear && (
        <span className="flex items-center gap-1.5 text-sage-dark">
          <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
          All payments on track
        </span>
      )}
    </div>
  );
}

export default function VendorTable({ categories, onUpdate, isClientView }: VendorTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [addState, setAddState] = useState<{ categoryId: string; vendorName: string; estimated: string; actual: string }>({
    categoryId: '', vendorName: '', estimated: '', actual: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const vendorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const supabase = useSupabaseClient();
  const { showSaved, showToast } = useToast();

  const allVendors = useMemo(() => {
    return categories.flatMap((cat) => cat.line_items || []);
  }, [categories]);

  const totals = useMemo(() => {
    return categories.reduce(
      (acc, cat) => {
        for (const v of cat.line_items || []) {
          acc.estimated += Number(v.estimated_cost) || 0;
          acc.actual += Number(v.actual_cost) || 0;
          const hasPayments = v.payments && v.payments.length > 0;
          acc.paid += hasPayments ? v.total_paid : (Number(v.paid_to_date) || 0);
        }
        return acc;
      },
      { estimated: 0, actual: 0, paid: 0 }
    );
  }, [categories]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const handleDeleteLineItem = (itemId: string, vendorName: string) => {
    setDeleteTarget({ id: itemId, name: vendorName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('line_items').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      onUpdate();
    } catch (err) {
      console.warn('Failed to delete line item:', err);
      showToast('Failed to delete vendor', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddVendor = async (categoryId: string) => {
    if (!addState.vendorName.trim() || addLoading || !categoryId) return;

    setAddLoading(true);
    try {
      const { error } = await supabase.from('line_items').insert({
        category_id: categoryId,
        vendor_name: addState.vendorName.trim(),
        estimated_cost: parseNumericInput(addState.estimated),
        actual_cost: parseNumericInput(addState.actual),
        paid_to_date: 0,
        booking_status: 'none' as BookingStatus,
      });

      if (error) throw error;

      setAddState({ categoryId: '', vendorName: '', estimated: '', actual: '' });
      showSaved();
      onUpdate();
      setTimeout(() => vendorInputRefs.current[categoryId]?.focus(), 0);
    } catch (err) {
      console.warn('Failed to add vendor:', err);
      showToast('Failed to add vendor', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddVendor(categoryId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAddState({ categoryId: '', vendorName: '', estimated: '', actual: '' });
    }
  };

  const handleNumericBlur = (value: string, field: 'estimated' | 'actual') => {
    const numValue = parseNumericInput(value);
    const clamped = Math.max(0, numValue);
    setAddState((prev) => ({ ...prev, [field]: clamped > 0 ? sanitizeNumericString(clamped) : '' }));
  };

  const startAdding = (categoryId: string) => {
    setAddState({ categoryId, vendorName: '', estimated: '', actual: '' });
    setTimeout(() => vendorInputRefs.current[categoryId]?.focus(), 0);
  };

  const hasAnyVendors = allVendors.length > 0;

  if (!hasAnyVendors && isClientView) {
    return (
      <div className="bg-white border border-stone rounded-lg overflow-hidden">
        <div className="p-8 text-center text-warm-gray">No vendors yet.</div>
      </div>
    );
  }

  const colCount = 5 + (isClientView ? 0 : 1);

  return (
    <>
      <div className="bg-white border border-stone rounded-lg overflow-hidden print:rounded-none print:border-stone">
        {/* Payment Summary Banner */}
        <PaymentSummaryBanner categories={categories} />

        {/* Desktop table */}
        <table className="hidden md:table print:table w-full print:text-sm">
          <thead className="bg-stone-lighter">
            <tr className="border-b border-stone">
              <th className="px-4 py-3 text-left text-xs font-medium text-warm-gray uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-warm-gray uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-warm-gray uppercase tracking-wider">
                Estimated
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-warm-gray uppercase tracking-wider">
                Actual
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-warm-gray uppercase tracking-wider">
                Paid
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-warm-gray uppercase tracking-wider">
                Remaining
              </th>
              {!isClientView && (
                <th className="px-4 py-3 text-left text-xs font-medium text-warm-gray uppercase tracking-wider w-16">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          {categories.map((cat) => {
            const items = cat.line_items || [];
            const isAddingHere = addState.categoryId === cat.id;
            const isCollapsed = collapsedCategories.has(cat.id);
            const catSpent = items.reduce((sum, v) => sum + (Number(v.actual_cost) || 0), 0);
            return (
              <tbody key={cat.id} className="divide-y divide-stone-lighter">
                {/* Category group header */}
                <tr className="bg-stone-lighter border-b border-stone">
                  <td colSpan={colCount} className="px-0 py-0">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-stone-lighter transition-colors"
                    >
                      <div className="flex items-center gap-2 border-l-2 border-l-stone pl-2">
                        <svg className={`w-3.5 h-3.5 text-warm-gray-light transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs font-semibold text-warm-gray uppercase tracking-wider">{cat.name}</span>
                        <span className="text-xs text-warm-gray-light">({items.length} vendor{items.length !== 1 ? 's' : ''})</span>
                      </div>
                      <span className="text-xs text-warm-gray tabular-nums">{formatCurrency(catSpent)} spent / {formatCurrency(cat.target_amount)} budget</span>
                    </button>
                  </td>
                </tr>
                {/* Vendor rows (collapsible) */}
                {!isCollapsed && (
                  <>
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={colCount} className="px-4 py-3 text-center text-xs text-warm-gray-light">
                          No vendors yet
                        </td>
                      </tr>
                    )}
                    {items.map((item) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        onUpdate={onUpdate}
                        onDelete={() => handleDeleteLineItem(item.id, item.vendor_name)}
                        isClientView={isClientView}
                        renderMode="table"
                        showStatusColumn
                      />
                    ))}
                    {/* Per-category add vendor row */}
                    {!isClientView && (
                      isAddingHere || items.length === 0 ? (
                        <tr className="bg-stone-lighter/30">
                          <td className="px-4 py-2">
                            <input
                              ref={(el) => { vendorInputRefs.current[cat.id] = el; }}
                              type="text"
                              autoComplete="off"
                              value={isAddingHere ? addState.vendorName : ''}
                              onChange={(e) => {
                                if (!isAddingHere) startAdding(cat.id);
                                setAddState((prev) => ({ ...prev, categoryId: cat.id, vendorName: e.target.value }));
                              }}
                              onFocus={() => { if (!isAddingHere) startAdding(cat.id); }}
                              onKeyDown={(e) => handleAddKeyDown(e, cat.id)}
                              className="w-full px-2 py-1 border border-stone rounded text-sm bg-white placeholder:text-warm-gray-light"
                              placeholder="+ Add vendor..."
                            />
                          </td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              value={isAddingHere ? addState.estimated : ''}
                              onChange={(e) => setAddState((prev) => ({ ...prev, categoryId: cat.id, estimated: e.target.value }))}
                              onFocus={() => { if (!isAddingHere) startAdding(cat.id); }}
                              onBlur={(e) => { if (isAddingHere) handleNumericBlur(e.target.value, 'estimated'); }}
                              onKeyDown={(e) => handleAddKeyDown(e, cat.id)}
                              className="w-24 px-2 py-1 border border-stone rounded text-sm bg-white placeholder:text-warm-gray-light text-right"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              value={isAddingHere ? addState.actual : ''}
                              onChange={(e) => setAddState((prev) => ({ ...prev, categoryId: cat.id, actual: e.target.value }))}
                              onFocus={() => { if (!isAddingHere) startAdding(cat.id); }}
                              onBlur={(e) => { if (isAddingHere) handleNumericBlur(e.target.value, 'actual'); }}
                              onKeyDown={(e) => handleAddKeyDown(e, cat.id)}
                              className="w-24 px-2 py-1 border border-stone rounded text-sm bg-white placeholder:text-warm-gray-light text-right"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-warm-gray-light text-right">-</td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-xs text-warm-gray-light">Enter to add</span>
                          </td>
                          <td className="px-4 py-2"></td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={colCount} className="px-4 py-1.5">
                            <button
                              type="button"
                              onClick={() => startAdding(cat.id)}
                              className="text-sm text-warm-gray-light hover:text-warm-gray"
                            >
                              + Add vendor...
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </>
                )}
              </tbody>
            );
          })}
          {hasAnyVendors && (
            <tfoot className="bg-stone-lighter border-t border-stone">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-charcoal">Total</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm font-medium text-charcoal text-right">{formatCurrency(totals.estimated)}</td>
                <td className="px-4 py-3 text-sm font-medium text-charcoal text-right">{formatCurrency(totals.actual)}</td>
                <td className="px-4 py-3 text-sm font-medium text-charcoal text-right">{formatCurrency(totals.paid)}</td>
                <td className="px-4 py-3"></td>
                {!isClientView && <td className="px-4 py-3"></td>}
              </tr>
            </tfoot>
          )}
        </table>

        {/* Mobile card list */}
        <div className="md:hidden print:hidden">
          {categories.map((cat) => {
            const items = cat.line_items || [];
            const isAddingHere = addState.categoryId === cat.id;
            const isCollapsed = collapsedCategories.has(cat.id);
            const catSpent = items.reduce((sum, v) => sum + (Number(v.actual_cost) || 0), 0);
            return (
              <div key={cat.id}>
                {/* Category group header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center justify-between w-full bg-stone-lighter px-4 py-2 border-b border-stone text-left hover:bg-stone-lighter transition-colors"
                >
                  <div className="flex items-center gap-2 border-l-2 border-l-stone pl-2">
                    <svg className={`w-3.5 h-3.5 text-warm-gray-light transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs font-semibold text-warm-gray uppercase tracking-wider">{cat.name}</span>
                    <span className="text-xs text-warm-gray-light">({items.length})</span>
                  </div>
                  <span className="text-xs text-warm-gray tabular-nums">{formatCurrency(catSpent)} / {formatCurrency(cat.target_amount)}</span>
                </button>
                {/* Vendor cards (collapsible) */}
                {!isCollapsed && (
                  <div className="divide-y divide-stone-lighter">
                    {items.length === 0 && (
                      <div className="px-4 py-3 text-center text-xs text-warm-gray-light">No vendors yet</div>
                    )}
                    {items.map((item) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        onUpdate={onUpdate}
                        onDelete={() => handleDeleteLineItem(item.id, item.vendor_name)}
                        isClientView={isClientView}
                        renderMode="card"
                      />
                    ))}
                    {/* Per-category add vendor card */}
                    {!isClientView && (
                      isAddingHere || items.length === 0 ? (
                        <div className="p-3 bg-stone-lighter/50">
                          <div className="space-y-2">
                            <input
                              ref={(el) => { vendorInputRefs.current[cat.id] = el; }}
                              type="text"
                              autoComplete="off"
                              value={isAddingHere ? addState.vendorName : ''}
                              onChange={(e) => {
                                if (!isAddingHere) startAdding(cat.id);
                                setAddState((prev) => ({ ...prev, categoryId: cat.id, vendorName: e.target.value }));
                              }}
                              onFocus={() => { if (!isAddingHere) startAdding(cat.id); }}
                              onKeyDown={(e) => handleAddKeyDown(e, cat.id)}
                              className="w-full px-2 py-1.5 border border-stone rounded text-sm bg-white placeholder:text-warm-gray-light"
                              placeholder="+ Add vendor..."
                            />
                            {isAddingHere && addState.vendorName.trim() && (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    value={addState.estimated}
                                    onChange={(e) => setAddState((prev) => ({ ...prev, estimated: e.target.value }))}
                                    onBlur={(e) => handleNumericBlur(e.target.value, 'estimated')}
                                    onKeyDown={(e) => handleAddKeyDown(e, cat.id)}
                                    className="w-full px-2 py-1.5 border border-stone rounded text-sm bg-white placeholder:text-warm-gray-light"
                                    placeholder="Estimated $"
                                  />
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    value={addState.actual}
                                    onChange={(e) => setAddState((prev) => ({ ...prev, actual: e.target.value }))}
                                    onBlur={(e) => handleNumericBlur(e.target.value, 'actual')}
                                    onKeyDown={(e) => handleAddKeyDown(e, cat.id)}
                                    className="w-full px-2 py-1.5 border border-stone rounded text-sm bg-white placeholder:text-warm-gray-light"
                                    placeholder="Actual $"
                                  />
                                </div>
                                <p className="text-xs text-warm-gray-light">Press Enter to add, Escape to clear</p>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => startAdding(cat.id)}
                            className="text-sm text-warm-gray-light hover:text-warm-gray"
                          >
                            + Add vendor...
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {hasAnyVendors && (
            <div className="p-4 bg-stone-lighter border-t border-stone">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-charcoal">Total</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-warm-gray">
                <div>
                  <p className="text-[10px] text-warm-gray-light uppercase">Estimated</p>
                  <p className="tabular-nums">{formatCurrency(totals.estimated)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-warm-gray-light uppercase">Actual</p>
                  <p className="tabular-nums">{formatCurrency(totals.actual)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-warm-gray-light uppercase">Paid</p>
                  <p className="tabular-nums">{formatCurrency(totals.paid)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </>
  );
}
