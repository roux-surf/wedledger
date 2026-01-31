'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MilestoneWithBudget, MilestoneTemplate, MilestoneTemplateItem } from '@/lib/types';
import { WEDDING_LEVELS } from '@/lib/budgetTemplates';
import { getDefaultMilestonesForLevel as getMilestoneDefaults } from '@/lib/milestoneTemplates';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMilestones: MilestoneWithBudget[];
  categoryIdToName: Map<string, string>;
  onLoadTemplate: (items: MilestoneTemplateItem[]) => void;
}

export default function TemplateManagerModal({
  isOpen,
  onClose,
  currentMilestones,
  categoryIdToName,
  onLoadTemplate,
}: TemplateManagerModalProps) {
  const [tab, setTab] = useState<'save' | 'load'>('load');
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<MilestoneTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && tab === 'load') {
      fetchCustomTemplates();
    }
    if (isOpen) {
      setSaveSuccess(false);
      setTemplateName('');
    }
  }, [isOpen, tab]);

  const fetchCustomTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('milestone_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setCustomTemplates((data || []) as MilestoneTemplate[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!templateName.trim()) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const items: MilestoneTemplateItem[] = currentMilestones.map((m, index) => ({
      title: m.title,
      description: m.description,
      months_before: m.months_before,
      category_name: m.category_id ? categoryIdToName.get(m.category_id) || null : null,
      sort_order: index,
    }));

    await supabase.from('milestone_templates').insert({
      user_id: user.id,
      name: templateName.trim(),
      base_level_id: null,
      milestones: items,
    });

    setSaving(false);
    setSaveSuccess(true);
    setTemplateName('');
  };

  const handleLoadBuiltIn = (levelId: string) => {
    const defaults = getMilestoneDefaults(levelId);
    const items: MilestoneTemplateItem[] = defaults.map((m, index) => ({
      title: m.title,
      description: m.description,
      months_before: m.monthsBefore,
      category_name: m.categoryName,
      sort_order: index,
    }));
    onLoadTemplate(items);
    onClose();
  };

  const handleLoadCustom = (template: MilestoneTemplate) => {
    onLoadTemplate(template.milestones);
    onClose();
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from('milestone_templates').delete().eq('id', id);
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Timeline Templates">
      {/* Tab toggle */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setTab('load')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === 'load' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Load Template
        </button>
        <button
          onClick={() => setTab('save')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === 'save' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Save Current
        </button>
      </div>

      {tab === 'load' ? (
        <div className="space-y-4">
          {/* Built-in templates */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Built-in Templates</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WEDDING_LEVELS.map((level) => {
                const count = getMilestoneDefaults(level.id).length;
                return (
                  <button
                    key={level.id}
                    onClick={() => handleLoadBuiltIn(level.id)}
                    className="border border-slate-200 rounded-md px-3 py-2 text-left text-sm hover:border-slate-400 transition-colors"
                  >
                    <span className="font-medium text-slate-900">{level.displayName}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{count} milestones</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom templates */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Templates</h4>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : customTemplates.length === 0 ? (
              <p className="text-sm text-slate-400">No saved templates yet. Save your current timeline to create one.</p>
            ) : (
              <div className="space-y-2">
                {customTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2"
                  >
                    <button
                      onClick={() => handleLoadCustom(t)}
                      className="text-left flex-1"
                    >
                      <span className="text-sm font-medium text-slate-900">{t.name}</span>
                      <span className="block text-xs text-slate-400">{t.milestones.length} milestones</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="text-slate-400 hover:text-red-600 p-1 ml-2"
                      title="Delete template"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Loading a template will replace all existing milestones for this client.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {saveSuccess ? (
            <div className="text-center py-4">
              <p className="text-sm text-green-600 font-medium">Template saved!</p>
              <p className="text-xs text-slate-400 mt-1">You can now load it from the Load Template tab.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Save the current {currentMilestones.length} milestones as a reusable template.
              </p>
              <Input
                id="template-name"
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Martha's Standard Timeline"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!templateName.trim() || saving}
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
