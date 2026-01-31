'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_CATEGORIES, US_STATES } from '@/lib/constants';
import { parseNumericInput, sanitizeNumericString } from '@/lib/types';
import { WEDDING_LEVELS, getWeddingLevelById } from '@/lib/budgetTemplates';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';

export default function NewClientPage() {
  const [formData, setFormData] = useState({
    name: '',
    wedding_date: '',
    city: '',
    state: '',
    guest_count: '',
    total_budget: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumericBlur = (fieldName: string) => {
    const value = parseNumericInput(formData[fieldName as keyof typeof formData] as string);
    const clampedValue = Math.max(0, value);
    setFormData((prev) => ({
      ...prev,
      [fieldName]: clampedValue > 0 ? sanitizeNumericString(clampedValue) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: formData.name,
          wedding_date: formData.wedding_date,
          city: formData.city,
          state: formData.state,
          guest_count: Math.round(parseNumericInput(formData.guest_count)),
          total_budget: parseNumericInput(formData.total_budget),
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create budget
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          client_id: client.id,
          template_id: selectedTemplate,
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Create default categories, pre-populating target amounts from template if selected
      const totalBudget = parseNumericInput(formData.total_budget);
      const level = selectedTemplate ? getWeddingLevelById(selectedTemplate) : null;

      // Guardrail: fall back to Skip if template is invalid or budget is missing/zero
      if (selectedTemplate && !level) {
        console.error(`[Template] Unknown template id "${selectedTemplate}", falling back to Skip`);
      }
      if (level && totalBudget <= 0) {
        console.warn(`[Template] Total budget is ${totalBudget}, skipping template allocation`);
      }
      const applyTemplate = !!(level && totalBudget > 0);

      // Guardrail: validate template category names match available categories
      if (applyTemplate && level) {
        for (const cat of Object.keys(level.categoryAllocations)) {
          if (!DEFAULT_CATEGORIES.includes(cat)) {
            console.error(`[Template] "${level.displayName}" has unknown category "${cat}" — will be ignored`);
          }
        }
        for (const cat of DEFAULT_CATEGORIES) {
          if (!(cat in level.categoryAllocations)) {
            console.warn(`[Template] "${level.displayName}" missing allocation for "${cat}" — defaulting to 0%`);
          }
        }
      }

      const categories = DEFAULT_CATEGORIES.map((name, index) => {
        const pct = applyTemplate && level ? (level.categoryAllocations[name] ?? 0) : 0;
        return {
          budget_id: budget.id,
          name,
          target_amount: applyTemplate ? Math.round((pct / 100) * totalBudget) : 0,
          sort_order: index,
        };
      });

      // Guardrail: verify allocations sum approximately to total budget
      if (applyTemplate && level) {
        const allocatedSum = categories.reduce((sum, c) => sum + c.target_amount, 0);
        const diff = Math.abs(allocatedSum - totalBudget);
        const tolerance = DEFAULT_CATEGORIES.length; // $1 rounding per category
        if (diff > tolerance) {
          console.error(`[Template] Allocation sum $${allocatedSum} differs from budget $${totalBudget} by $${diff} (tolerance: $${tolerance})`);
        }
        console.log(`[Template] Applied "${level.displayName}" to $${totalBudget} budget → allocated $${allocatedSum} across ${categories.length} categories`);
      } else {
        console.log('[Template] No template applied — all category targets set to $0');
      }

      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(categories);

      if (categoriesError) throw categoriesError;

      router.push(`/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 text-sm">
            &larr; Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">New Client</h1>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6">
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              id="name"
              name="name"
              label="Client Name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Smith-Johnson Wedding"
            />

            <Input
              id="wedding_date"
              name="wedding_date"
              type="date"
              label="Wedding Date"
              value={formData.wedding_date}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="city"
                name="city"
                label="City"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="e.g., Austin"
              />

              <div className="w-full">
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  State
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="">Select state</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              id="guest_count"
              name="guest_count"
              type="text"
              inputMode="numeric"
              label="Guest Count"
              value={formData.guest_count}
              onChange={handleChange}
              onBlur={() => handleNumericBlur('guest_count')}
              required
              placeholder="e.g., 150"
            />

            <Input
              id="total_budget"
              name="total_budget"
              type="text"
              inputMode="decimal"
              label="Total Wedding Budget ($)"
              value={formData.total_budget}
              onChange={handleChange}
              onBlur={() => handleNumericBlur('total_budget')}
              required
              placeholder="e.g., 50000"
            />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-slate-700 mb-1">
              Start from a budget template{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WEDDING_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() =>
                    setSelectedTemplate(selectedTemplate === level.id ? null : level.id)
                  }
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selectedTemplate === level.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="font-medium">{level.displayName}</span>
                  <span className="block text-xs mt-0.5 opacity-75">
                    {level.budgetRangeLabel}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selectedTemplate === null
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <span className="font-medium">Skip</span>
                <span className="block text-xs mt-0.5 opacity-75">
                  Start from scratch
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Client'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
