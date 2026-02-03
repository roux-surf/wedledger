'use client';

import { useMemo, useState, useRef } from 'react';
import { CategoryWithSpend, LineItemWithPayments, BookingStatus, formatCurrency, parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LineItemRow from './LineItemRow';

interface VendorTableProps {
  categories: CategoryWithSpend[];
  onUpdate: () => void;
  isClientView: boolean;
}

interface FlatVendor extends LineItemWithPayments {
  categoryName: string;
  categoryId: string;
}

export default function VendorTable({ categories, onUpdate, isClientView }: VendorTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addVendorName, setAddVendorName] = useState('');
  const [addEstimated, setAddEstimated] = useState('');
  const [addActual, setAddActual] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { showSaved, showToast } = useToast();

  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({ id: cat.id, name: cat.name }));
  }, [categories]);

  // Default add category to first category
  const effectiveCategoryId = addCategoryId || (categoryOptions.length > 0 ? categoryOptions[0].id : '');

  const vendors = useMemo<FlatVendor[]>(() => {
    return categories.flatMap((cat) =>
      (cat.line_items || []).map((item) => ({
        ...item,
        categoryName: cat.name,
        categoryId: cat.id,
      }))
    );
  }, [categories]);

  const totals = useMemo(() => {
    return vendors.reduce(
      (acc, v) => {
        acc.estimated += Number(v.estimated_cost) || 0;
        acc.actual += Number(v.actual_cost) || 0;
        const hasPayments = v.payments && v.payments.length > 0;
        acc.paid += hasPayments ? v.total_paid : (Number(v.paid_to_date) || 0);
        return acc;
      },
      { estimated: 0, actual: 0, paid: 0 }
    );
  }, [vendors]);

  const handleDeleteLineItem = (itemId: string) => {
    const item = vendors.find((v) => v.id === itemId);
    setDeleteTarget({ id: itemId, name: item?.vendor_name || 'this vendor' });
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

  const handleCategoryChange = async (itemId: string, newCategoryId: string) => {
    try {
      const { error } = await supabase
        .from('line_items')
        .update({ category_id: newCategoryId })
        .eq('id', itemId);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.warn('Failed to update category:', err);
      showToast('Failed to update category', 'error');
    }
  };

  const handleAddVendor = async () => {
    if (!addVendorName.trim() || addLoading || !effectiveCategoryId) return;

    setAddLoading(true);
    try {
      const { error } = await supabase.from('line_items').insert({
        category_id: effectiveCategoryId,
        vendor_name: addVendorName.trim(),
        estimated_cost: parseNumericInput(addEstimated),
        actual_cost: parseNumericInput(addActual),
        paid_to_date: 0,
        booking_status: 'none' as BookingStatus,
      });

      if (error) throw error;

      setAddVendorName('');
      setAddEstimated('');
      setAddActual('');
      showSaved();
      onUpdate();
      setTimeout(() => vendorInputRef.current?.focus(), 0);
    } catch (err) {
      console.warn('Failed to add vendor:', err);
      showToast('Failed to add vendor', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddVendor();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAddVendorName('');
      setAddEstimated('');
      setAddActual('');
    }
  };

  const handleNumericBlur = (value: string, setter: (val: string) => void) => {
    const numValue = parseNumericInput(value);
    const clamped = Math.max(0, numValue);
    setter(clamped > 0 ? sanitizeNumericString(clamped) : '');
  };

  if (vendors.length === 0 && isClientView) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-8 text-center text-slate-500">No vendors yet.</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden print:rounded-none print:border-slate-300">
        {/* Desktop table */}
        <table className="hidden md:table print:table w-full print:text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Estimated
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actual
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Paid
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Remaining
              </th>
              {!isClientView && (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-16">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y ${isClientView ? 'divide-slate-200' : 'divide-slate-100'}`}>
            {vendors.map((vendor) => (
              <LineItemRow
                key={vendor.id}
                item={vendor}
                onUpdate={onUpdate}
                onDelete={() => handleDeleteLineItem(vendor.id)}
                isClientView={isClientView}
                renderMode="table"
                categoryName={vendor.categoryName}
                onCategoryChange={(newCatId) => handleCategoryChange(vendor.id, newCatId)}
                categoryId={vendor.categoryId}
                categoryOptions={categoryOptions}
                showStatusColumn
              />
            ))}
            {!isClientView && (
              <tr className="bg-slate-50/30">
                <td className="px-4 py-2">
                  <input
                    ref={vendorInputRef}
                    type="text"
                    autoComplete="off"
                    value={addVendorName}
                    onChange={(e) => setAddVendorName(e.target.value)}
                    onKeyDown={handleAddKeyDown}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                    placeholder="+ Add vendor..."
                  />
                </td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2">
                  <select
                    value={effectiveCategoryId}
                    onChange={(e) => setAddCategoryId(e.target.value)}
                    className="px-1 py-1 border border-slate-200 rounded text-sm bg-white"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={addEstimated}
                    onChange={(e) => setAddEstimated(e.target.value)}
                    onBlur={(e) => handleNumericBlur(e.target.value, setAddEstimated)}
                    onKeyDown={handleAddKeyDown}
                    className="w-24 px-2 py-1 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400 text-right"
                    placeholder="0"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={addActual}
                    onChange={(e) => setAddActual(e.target.value)}
                    onBlur={(e) => handleNumericBlur(e.target.value, setAddActual)}
                    onKeyDown={handleAddKeyDown}
                    className="w-24 px-2 py-1 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400 text-right"
                    placeholder="0"
                  />
                </td>
                <td className="px-4 py-2 text-sm text-slate-400 text-right">-</td>
                <td className="px-4 py-2 text-sm text-slate-400 text-right">
                  <span className="text-xs text-slate-400">Enter to add</span>
                </td>
                <td className="px-4 py-2"></td>
              </tr>
            )}
          </tbody>
          {vendors.length > 0 && (
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">Total</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(totals.estimated)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(totals.actual)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(totals.paid)}</td>
                <td className="px-4 py-3"></td>
                {!isClientView && <td className="px-4 py-3"></td>}
              </tr>
            </tfoot>
          )}
        </table>

        {/* Mobile card list */}
        <div className="md:hidden print:hidden divide-y divide-slate-200">
          {vendors.map((vendor) => (
            <LineItemRow
              key={vendor.id}
              item={vendor}
              onUpdate={onUpdate}
              onDelete={() => handleDeleteLineItem(vendor.id)}
              isClientView={isClientView}
              renderMode="card"
              categoryName={vendor.categoryName}
            />
          ))}
          {!isClientView && categoryOptions.length > 0 && (
            <div className="p-3 bg-slate-50/50 border-t border-dashed border-slate-200">
              <div className="space-y-2">
                <input
                  type="text"
                  autoComplete="off"
                  value={addVendorName}
                  onChange={(e) => setAddVendorName(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                  placeholder="+ Add vendor..."
                />
                {addVendorName.trim() && (
                  <>
                    <select
                      value={effectiveCategoryId}
                      onChange={(e) => setAddCategoryId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-600"
                    >
                      {categoryOptions.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={addEstimated}
                        onChange={(e) => setAddEstimated(e.target.value)}
                        onBlur={(e) => handleNumericBlur(e.target.value, setAddEstimated)}
                        onKeyDown={handleAddKeyDown}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                        placeholder="Estimated $"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={addActual}
                        onChange={(e) => setAddActual(e.target.value)}
                        onBlur={(e) => handleNumericBlur(e.target.value, setAddActual)}
                        onKeyDown={handleAddKeyDown}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white placeholder:text-slate-400"
                        placeholder="Actual $"
                      />
                    </div>
                    <p className="text-xs text-slate-400">Press Enter to add, Escape to clear</p>
                  </>
                )}
              </div>
            </div>
          )}
          {vendors.length > 0 && (
            <div className="p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-900">Total</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Est: {formatCurrency(totals.estimated)}</span>
                <span>Actual: {formatCurrency(totals.actual)}</span>
                <span>Paid: {formatCurrency(totals.paid)}</span>
              </div>
            </div>
          )}
        </div>

        {vendors.length === 0 && isClientView && (
          <div className="p-8 text-center text-slate-500">No vendors yet.</div>
        )}
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
