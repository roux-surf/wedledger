'use client';

import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import {
  Client,
  Budget,
  CategoryWithSpend,
  LineItem,
  LineItemWithPayments,
  Payment,
  MilestoneWithBudget,
} from '@/lib/types';

interface UseClientBudgetReturn {
  client: Client | null;
  budget: Budget | null;
  categories: CategoryWithSpend[];
  milestones: MilestoneWithBudget[];
  loading: boolean;
  fetchData: () => Promise<void>;
}

export function useClientBudget(clientId: string | null): UseClientBudgetReturn {
  const [client, setClient] = useState<Client | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<CategoryWithSpend[]>([]);
  const [milestones, setMilestones] = useState<MilestoneWithBudget[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useSupabaseClient();
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (budgetError) throw budgetError;
      setBudget(budgetData);

      // Fetch categories with line items
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('budget_id', budgetData.id)
        .order('sort_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Batch-fetch ALL line items for all categories in one query
      const allCategoryIds = categoriesData.map((c) => c.id);
      const { data: allLineItems } = allCategoryIds.length > 0
        ? await supabase
            .from('line_items')
            .select('*')
            .in('category_id', allCategoryIds)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true })
        : { data: [] };

      const items = (allLineItems || []) as LineItem[];
      const allLineItemIds = items.map((li) => li.id);

      // Batch-fetch ALL payments for all line items in one query
      const { data: allPayments } = allLineItemIds.length > 0
        ? await supabase
            .from('payments')
            .select('*')
            .in('line_item_id', allLineItemIds)
            .order('created_at', { ascending: true })
        : { data: [] };

      // Group payments by line_item_id
      const paymentsByLineItem = new Map<string, Payment[]>();
      for (const payment of (allPayments || []) as Payment[]) {
        const arr = paymentsByLineItem.get(payment.line_item_id);
        if (arr) {
          arr.push(payment);
        } else {
          paymentsByLineItem.set(payment.line_item_id, [payment]);
        }
      }

      // Group line items by category_id
      const lineItemsByCategory = new Map<string, LineItem[]>();
      for (const li of items) {
        const arr = lineItemsByCategory.get(li.category_id);
        if (arr) {
          arr.push(li);
        } else {
          lineItemsByCategory.set(li.category_id, [li]);
        }
      }

      // Assemble categories with spend data
      const categoriesWithSpend: CategoryWithSpend[] = categoriesData.map((category) => {
        const categoryItems = lineItemsByCategory.get(category.id) || [];

        const lineItemsWithPayments: LineItemWithPayments[] = categoryItems.map((item: LineItem) => {
          const itemPayments = paymentsByLineItem.get(item.id) || [];
          const totalPaid = itemPayments
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.amount), 0);
          const totalScheduled = itemPayments.reduce((sum, p) => sum + Number(p.amount), 0);

          return {
            ...item,
            payments: itemPayments,
            total_paid: totalPaid,
            total_scheduled: totalScheduled,
          };
        });

        const actualSpend = lineItemsWithPayments.reduce(
          (sum: number, li: LineItemWithPayments) => sum + (Number(li.actual_cost) || 0),
          0
        );

        const estimatedTotal = lineItemsWithPayments.reduce(
          (sum: number, li: LineItemWithPayments) => sum + (Number(li.estimated_cost) || 0),
          0
        );

        const categoryTotalPaid = lineItemsWithPayments.reduce(
          (sum: number, li: LineItemWithPayments) => {
            const hasPayments = li.payments && li.payments.length > 0;
            return sum + (hasPayments ? li.total_paid : (Number(li.paid_to_date) || 0));
          },
          0
        );

        return {
          ...category,
          actual_spend: actualSpend,
          estimated_total: estimatedTotal,
          total_paid: categoryTotalPaid,
          line_items: lineItemsWithPayments,
        };
      });

      setCategories(categoriesWithSpend);

      // Fetch milestones and enrich with budget data
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('client_id', clientId)
        .order('target_date', { ascending: true });

      const enrichedMilestones: MilestoneWithBudget[] = (milestonesData || []).map((m) => {
        const linked = m.category_id
          ? categoriesWithSpend.find((c) => c.id === m.category_id)
          : null;
        return {
          ...m,
          category_name: linked?.name,
          category_target: linked ? Number(linked.target_amount) : undefined,
          category_spent: linked?.actual_spend,
        };
      });

      setMilestones(enrichedMilestones);
    } catch (err) {
      console.warn('Failed to fetch data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase, showToast]);

  return { client, budget, categories, milestones, loading, fetchData };
}
