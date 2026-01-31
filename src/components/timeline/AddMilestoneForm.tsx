'use client';

import { useState } from 'react';
import { CategoryWithSpend } from '@/lib/types';
import { calculateTargetDate } from '@/lib/milestoneTemplates';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AddMilestoneFormProps {
  weddingDate: string;
  categories: CategoryWithSpend[];
  onAdd: (milestone: {
    title: string;
    description: string;
    months_before: number;
    target_date: string;
    category_id: string | null;
  }) => void;
  onCancel: () => void;
}

export default function AddMilestoneForm({
  weddingDate,
  categories,
  onAdd,
  onCancel,
}: AddMilestoneFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateMode, setDateMode] = useState<'relative' | 'specific'>('relative');
  const [monthsBefore, setMonthsBefore] = useState('6');
  const [specificDate, setSpecificDate] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let targetDate: string;
    let months: number;

    if (dateMode === 'relative') {
      months = Math.max(0, parseFloat(monthsBefore) || 0);
      targetDate = calculateTargetDate(weddingDate, months);
    } else {
      targetDate = specificDate;
      // Calculate months_before from the specific date
      const wedding = new Date(weddingDate + 'T00:00:00');
      const target = new Date(specificDate + 'T00:00:00');
      const diffMs = wedding.getTime() - target.getTime();
      months = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24 * 30)) * 10) / 10);
    }

    onAdd({
      title: title.trim(),
      description: description.trim(),
      months_before: months,
      target_date: targetDate,
      category_id: categoryId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
      <Input
        id="milestone-title"
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Book florist"
        required
      />

      <Input
        id="milestone-description"
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g., Research and select a florist"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">When</label>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setDateMode('relative')}
            className={`text-xs px-2 py-1 rounded ${
              dateMode === 'relative' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            Months before wedding
          </button>
          <button
            type="button"
            onClick={() => setDateMode('specific')}
            className={`text-xs px-2 py-1 rounded ${
              dateMode === 'specific' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            Specific date
          </button>
        </div>
        {dateMode === 'relative' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={monthsBefore}
              onChange={(e) => setMonthsBefore(e.target.value)}
              className="w-20 px-2 py-1.5 border border-slate-300 rounded-md text-sm"
            />
            <span className="text-sm text-slate-500">months before wedding</span>
          </div>
        ) : (
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            required={dateMode === 'specific'}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Link to budget category <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
        >
          <option value="">None</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm">Add Milestone</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
