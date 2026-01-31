'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MilestoneWithBudget, MilestoneStatus, MilestoneTemplateItem, CategoryWithSpend } from '@/lib/types';
import { calculateTargetDate } from '@/lib/milestoneTemplates';
import { useToast } from '@/components/ui/Toast';
import GanttTimeline from './GanttTimeline';
import MilestoneList from './MilestoneList';
import AddMilestoneForm from './AddMilestoneForm';
import EditMilestoneModal from './EditMilestoneModal';
import TemplateManagerModal from './TemplateManagerModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface TimelineSectionProps {
  milestones: MilestoneWithBudget[];
  categories: CategoryWithSpend[];
  clientId: string;
  weddingDate: string;
  isClientView: boolean;
  onUpdate: () => void;
}

export default function TimelineSection({
  milestones,
  categories,
  clientId,
  weddingDate,
  isClientView,
  onUpdate,
}: TimelineSectionProps) {
  const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithBudget | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const { showSaved } = useToast();

  // Default to list view on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('list');
    }
  }, []);

  const completed = milestones.filter((m) => m.status === 'completed').length;
  const total = milestones.length;

  const categoryIdToName = new Map(categories.map((c) => [c.id, c.name]));
  const categoryNameToId = new Map(categories.map((c) => [c.name, c.id]));

  const handleStatusChange = async (id: string, status: MilestoneStatus) => {
    await supabase
      .from('milestones')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', id);
    showSaved();
    onUpdate();
  };

  const handleAdd = async (data: {
    title: string;
    description: string;
    months_before: number;
    target_date: string;
    category_id: string | null;
  }) => {
    await supabase.from('milestones').insert({
      client_id: clientId,
      title: data.title,
      description: data.description || null,
      months_before: data.months_before,
      target_date: data.target_date,
      status: 'not_started',
      category_id: data.category_id,
      sort_order: milestones.length,
      is_custom: true,
    });
    setShowAddForm(false);
    showSaved();
    onUpdate();
  };

  const handleEdit = async (id: string, updates: {
    title: string;
    description: string | null;
    months_before: number;
    target_date: string;
    status: MilestoneStatus;
    category_id: string | null;
  }) => {
    await supabase
      .from('milestones')
      .update({
        ...updates,
        completed_at: updates.status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', id);
    showSaved();
    onUpdate();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from('milestones').delete().eq('id', deleteId);
    setDeleteId(null);
    setDeleting(false);
    showSaved();
    onUpdate();
  };

  const handleLoadTemplate = async (items: MilestoneTemplateItem[]) => {
    // Delete all existing milestones for this client
    await supabase.from('milestones').delete().eq('client_id', clientId);

    // Insert new milestones from template
    const rows = items.map((item, index) => ({
      client_id: clientId,
      title: item.title,
      description: item.description,
      months_before: item.months_before,
      target_date: calculateTargetDate(weddingDate, item.months_before),
      status: 'not_started' as const,
      category_id: item.category_name ? categoryNameToId.get(item.category_name) || null : null,
      sort_order: index,
      is_custom: false,
    }));

    if (rows.length > 0) {
      await supabase.from('milestones').insert(rows);
    }

    showSaved();
    onUpdate();
  };

  return (
    <div className={isClientView ? 'mb-8' : 'mb-6'}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className={`font-semibold text-slate-900 ${isClientView ? 'text-xl' : 'text-lg'}`}>
            Planning Timeline
          </h3>
          {total > 0 && (
            <span className="text-sm text-slate-500">
              {completed} of {total} complete
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'gantt' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              List
            </button>
          </div>

          {/* Coordinator actions */}
          {!isClientView && (
            <>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
              >
                Templates
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
              >
                + Add Milestone
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddForm && !isClientView && (
        <div className="mb-4">
          <AddMilestoneForm
            weddingDate={weddingDate}
            categories={categories}
            onAdd={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Main view */}
      {viewMode === 'gantt' ? (
        <GanttTimeline
          milestones={milestones}
          weddingDate={weddingDate}
          isClientView={isClientView}
          onStatusChange={handleStatusChange}
          onEdit={setEditingMilestone}
        />
      ) : (
        <MilestoneList
          milestones={milestones}
          isClientView={isClientView}
          onStatusChange={handleStatusChange}
          onEdit={setEditingMilestone}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* Edit modal */}
      {editingMilestone && (
        <EditMilestoneModal
          milestone={editingMilestone}
          weddingDate={weddingDate}
          categories={categories}
          isOpen={true}
          onClose={() => setEditingMilestone(null)}
          onSave={handleEdit}
          onDelete={(id) => {
            setEditingMilestone(null);
            setDeleteId(id);
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Milestone"
        message="Are you sure you want to delete this milestone? This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* Template manager */}
      {showTemplateModal && (
        <TemplateManagerModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          currentMilestones={milestones}
          categoryIdToName={categoryIdToName}
          onLoadTemplate={handleLoadTemplate}
        />
      )}
    </div>
  );
}
