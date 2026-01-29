'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_CATEGORIES, US_STATES } from '@/lib/constants';
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['guest_count', 'total_budget'];

    if (numericFields.includes(name)) {
      const numValue = parseFloat(value) || 0;
      setFormData((prev) => ({
        ...prev,
        [name]: Math.max(0, numValue).toString(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
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
          guest_count: parseInt(formData.guest_count, 10),
          total_budget: parseFloat(formData.total_budget),
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create budget
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          client_id: client.id,
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Create default categories
      const categories = DEFAULT_CATEGORIES.map((name, index) => ({
        budget_id: budget.id,
        name,
        target_amount: 0,
        sort_order: index,
      }));

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
              type="number"
              label="Guest Count"
              value={formData.guest_count}
              onChange={handleChange}
              required
              min="1"
              placeholder="e.g., 150"
            />

            <Input
              id="total_budget"
              name="total_budget"
              type="number"
              label="Total Wedding Budget ($)"
              value={formData.total_budget}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="e.g., 50000"
            />
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
