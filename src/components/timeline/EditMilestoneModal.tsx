'use client';

import { useState } from 'react';
import { MilestoneWithBudget, MilestoneStatus, CategoryWithSpend } from '@/lib/types';
import { calculateTargetDate } from '@/lib/milestoneTemplates';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface EditMilestoneModalProps {
  milestone: MilestoneWithBudget;
  weddingDate: string;
  categories: CategoryWithSpend[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: {
    title: string;
    description: string | null;
    months_before: number;
    target_date: string;
    status: MilestoneStatus;
    category_id: string | null;
  }) => void;
  onDelete: (id: string) => void;
}

export default function EditMilestoneModal({
  milestone,
  weddingDate,
  categories,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EditMilestoneModalProps) {
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description || '');
  const [monthsBefore, setMonthsBefore] = useState(String(milestone.months_before));
  const [targetDate, setTargetDate] = useState(milestone.target_date);
  const [status, setStatus] = useState<MilestoneStatus>(milestone.status);
  const [categoryId, setCategoryId] = useState(milestone.category_id || '');
  const [dateMode, setDateMode] = useState<'relative' | 'specific'>('relative');

  const handleMonthsChange = (value: string) => {
    setMonthsBefore(value);
    const months = parseFloat(value) || 0;
    if (months >= 0) {
      setTargetDate(calculateTargetDate(weddingDate, months));
    }
  };

  const handleDateChange = (value: string) => {
    setTargetDate(value);
    // Recalculate months_before
    const wedding = new Date(weddingDate + 'T00:00:00');
    const target = new Date(value + 'T00:00:00');
    const diffMs = wedding.getTime() - target.getTime();
    const months = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24 * 30)) * 10) / 10);
    setMonthsBefore(String(months));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave(milestone.id, {
      title: title.trim(),
      description: description.trim() || null,
      months_before: Math.max(0, parseFloat(monthsBefore) || 0),
      target_date: targetDate,
      status,
      category_id: categoryId || null,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Milestone">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="edit-title"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Input
          id="edit-description"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setDateMode('relative')}
              className={`text-xs px-2 py-1 rounded ${
                dateMode === 'relative' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              Relative
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
                onChange={(e) => handleMonthsChange(e.target.value)}
                className="w-20 px-2 py-1.5 border border-slate-300 rounded-md text-sm"
              />
              <span className="text-sm text-slate-500">months before wedding</span>
              <span className="text-xs text-slate-400">= {targetDate}</span>
            </div>
          ) : (
            <input
              type="date"
              value={targetDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Budget Category <span className="text-slate-400 font-normal">(optional)</span>
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

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              onDelete(milestone.id);
              onClose();
            }}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete milestone
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
