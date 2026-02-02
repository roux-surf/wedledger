'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface PaymentTemplateSelectorProps {
  lineItemId: string;
  actualCost: number;
  weddingDate?: string;
  onPaymentsCreated: () => void;
}

interface PaymentTemplate {
  name: string;
  splits: { label: string; percent: number; monthsBefore?: number }[];
}

const TEMPLATES: PaymentTemplate[] = [
  {
    name: '50/50 Deposit + Final',
    splits: [
      { label: 'Deposit', percent: 50, monthsBefore: 6 },
      { label: 'Final Payment', percent: 50, monthsBefore: 1 },
    ],
  },
  {
    name: '30/30/40 Three-Payment',
    splits: [
      { label: 'First Payment', percent: 30, monthsBefore: 8 },
      { label: 'Second Payment', percent: 30, monthsBefore: 4 },
      { label: 'Final Payment', percent: 40, monthsBefore: 1 },
    ],
  },
  {
    name: '100% Upfront',
    splits: [
      { label: 'Full Payment', percent: 100 },
    ],
  },
];

function computeDueDate(weddingDate: string | undefined, monthsBefore?: number): string | null {
  if (!weddingDate || monthsBefore === undefined) return null;
  const wedding = new Date(weddingDate + 'T00:00:00');
  wedding.setMonth(wedding.getMonth() - monthsBefore);
  // If computed date is in the past, set to today + 7 days
  const now = new Date();
  if (wedding < now) {
    now.setDate(now.getDate() + 7);
    return now.toISOString().split('T')[0];
  }
  return wedding.toISOString().split('T')[0];
}

export default function PaymentTemplateSelector({ lineItemId, actualCost, weddingDate, onPaymentsCreated }: PaymentTemplateSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const supabase = createClient();
  const { showSaved } = useToast();

  const applyTemplate = async (template: PaymentTemplate) => {
    setLoading(true);
    try {
      const payments = template.splits.map(split => ({
        line_item_id: lineItemId,
        label: split.label,
        amount: Math.round((actualCost * split.percent / 100) * 100) / 100,
        due_date: computeDueDate(weddingDate, split.monthsBefore),
        status: 'pending' as const,
      }));

      // Adjust last payment to ensure amounts sum exactly to actualCost
      const totalSoFar = payments.slice(0, -1).reduce((sum, p) => sum + p.amount, 0);
      payments[payments.length - 1].amount = Math.round((actualCost - totalSoFar) * 100) / 100;

      const { error } = await supabase.from('payments').insert(payments);
      if (error) throw error;

      showSaved();
      onPaymentsCreated();
    } catch (err) {
      console.error('Failed to apply payment template:', err);
    } finally {
      setLoading(false);
      setSelectedTemplate(null);
    }
  };

  if (actualCost <= 0) return null;

  return (
    <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100">
      <p className="text-xs font-medium text-slate-600 mb-2">Quick payment setup for {formatCurrency(actualCost)}</p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map(template => (
          <button
            key={template.name}
            type="button"
            onClick={() => {
              if (selectedTemplate === template.name) {
                applyTemplate(template);
              } else {
                setSelectedTemplate(template.name);
              }
            }}
            disabled={loading}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedTemplate === template.name
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {selectedTemplate === template.name ? `Apply ${template.name}?` : template.name}
          </button>
        ))}
        {selectedTemplate && (
          <button
            type="button"
            onClick={() => setSelectedTemplate(null)}
            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
      {selectedTemplate && (
        <div className="mt-2 text-xs text-slate-500">
          {TEMPLATES.find(t => t.name === selectedTemplate)?.splits.map((s, i) => (
            <span key={i} className="mr-3">
              {s.label}: {formatCurrency(Math.round(actualCost * s.percent / 100 * 100) / 100)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
