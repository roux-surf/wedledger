'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/UserProfileContext';
import { DEFAULT_CATEGORIES, US_STATES } from '@/lib/constants';
import { WEDDING_LEVELS, getWeddingLevelById } from '@/lib/budgetTemplates';
import { parseNumericInput, sanitizeNumericString } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function WeddingSetupPage() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { profile } = useUserProfile();
  const { showToast } = useToast();

  const [clientId, setClientId] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    wedding_date: '',
    city: '',
    state: '',
    guest_count: '',
    total_budget: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Load existing client data
  const loadClient = useCallback(async () => {
    if (!user) return;

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!client) {
      showToast('No wedding record found', 'error');
      return;
    }

    setClientId(client.id);

    // Check if already set up (non-placeholder values)
    const isPlaceholder = client.city === 'TBD' && client.state === 'TBD' && client.guest_count === 0;
    setIsEditing(!isPlaceholder);

    setFormData({
      name: client.name,
      wedding_date: client.wedding_date || '',
      city: client.city === 'TBD' ? '' : client.city,
      state: client.state === 'TBD' ? '' : client.state,
      guest_count: client.guest_count > 0 ? String(client.guest_count) : '',
      total_budget: Number(client.total_budget) > 0 ? sanitizeNumericString(Number(client.total_budget)) : '',
    });

    // Load budget
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('client_id', client.id)
      .single();

    if (budget) {
      setBudgetId(budget.id);
    }

    setLoading(false);
  }, [user, supabase, router, showToast]);

  useEffect(() => {
    if (profile?.role !== 'couple') return;
    loadClient();
  }, [profile, loadClient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    if (!clientId || !user) return;
    setSaving(true);

    try {
      const totalBudget = parseNumericInput(formData.total_budget);

      // Update the client record with real values
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          wedding_date: formData.wedding_date,
          city: formData.city,
          state: formData.state,
          guest_count: Math.round(parseNumericInput(formData.guest_count)),
          total_budget: totalBudget,
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Ensure budget exists
      let currentBudgetId = budgetId;
      if (!currentBudgetId) {
        const { data: newBudget, error: budgetError } = await supabase
          .from('budgets')
          .insert({ client_id: clientId, template_id: selectedTemplate })
          .select()
          .single();

        if (budgetError) throw budgetError;
        currentBudgetId = newBudget.id;
      } else if (selectedTemplate) {
        // Update budget with template id
        await supabase
          .from('budgets')
          .update({ template_id: selectedTemplate })
          .eq('id', currentBudgetId);
      }

      // Check if categories already exist
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('id')
        .eq('budget_id', currentBudgetId);

      if (!existingCategories || existingCategories.length === 0) {
        // Create categories from template or defaults
        const level = selectedTemplate ? getWeddingLevelById(selectedTemplate) : null;
        const applyTemplate = !!(level && totalBudget > 0);

        const categories = DEFAULT_CATEGORIES.map((name, index) => {
          const pct = applyTemplate && level ? (level.categoryAllocations[name] ?? 0) : 0;
          return {
            budget_id: currentBudgetId,
            name,
            target_amount: applyTemplate ? Math.round((pct / 100) * totalBudget) : 0,
            sort_order: index,
          };
        });

        const { error: categoriesError } = await supabase
          .from('categories')
          .insert(categories);

        if (categoriesError) throw categoriesError;
      }

      router.push('/my-wedding');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-warm-gray-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-charcoal">
            {isEditing ? 'Edit wedding details' : "Let\u2019s plan your wedding"}
          </h1>
          <p className="text-lg text-warm-gray mt-2">
            {isEditing
              ? 'Update your wedding information below.'
              : 'Tell us a bit about your big day so we can set everything up for you.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Wedding Basics */}
          <section className="bg-cream border border-stone rounded-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-charcoal mb-1">The basics</h2>
            <p className="text-sm text-warm-gray mb-6">
              Don&apos;t worry — you can change all of this later.
            </p>

            <div className="space-y-5">
              <Input
                id="name"
                name="name"
                label="What should we call your wedding?"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., The Smith-Jones Wedding"
              />

              <Input
                id="wedding_date"
                name="wedding_date"
                type="date"
                label="When's the big day?"
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
                    className="block text-sm font-medium text-charcoal mb-1"
                  >
                    State
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-stone rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
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
                label="How many guests are you expecting?"
                value={formData.guest_count}
                onChange={handleChange}
                onBlur={() => handleNumericBlur('guest_count')}
                required
                placeholder="e.g., 150"
              />
            </div>
          </section>

          {/* Budget Setup */}
          <section className="bg-cream border border-stone rounded-lg p-6 md:p-8">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Your budget</h2>
            <p className="text-sm text-warm-gray mb-6">
              Set your total budget and we&apos;ll help you allocate it across categories.
            </p>

            <div className="space-y-5">
              <Input
                id="total_budget"
                name="total_budget"
                type="text"
                inputMode="decimal"
                label="What's your total wedding budget?"
                value={formData.total_budget}
                onChange={handleChange}
                onBlur={() => handleNumericBlur('total_budget')}
                required
                placeholder="e.g., 50000"
              />

              {!isEditing && <div>
                <p className="text-sm font-medium text-charcoal mb-1">
                  Start from a budget template{' '}
                  <span className="text-warm-gray-light font-normal">(optional)</span>
                </p>
                <p className="text-xs text-warm-gray mb-3">
                  Templates pre-fill how your budget is split across categories like venue, catering, and photography. You can adjust everything later.
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
                          ? 'border-charcoal bg-charcoal text-white'
                          : 'border-stone bg-white text-charcoal hover:border-warm-gray-light'
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
                        ? 'border-charcoal bg-charcoal text-white'
                        : 'border-stone bg-white text-charcoal hover:border-warm-gray-light'
                    }`}
                  >
                    <span className="font-medium">Skip</span>
                    <span className="block text-xs mt-0.5 opacity-75">
                      Start from scratch
                    </span>
                  </button>
                </div>
              </div>}
            </div>
          </section>

          {/* Submit */}
          <div className="text-center">
            <Button type="submit" size="lg" disabled={saving} className="px-12">
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Start planning'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
