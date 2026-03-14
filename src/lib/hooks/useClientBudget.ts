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

      // Fetch line items for each category with payments
      const categoriesWithSpend: CategoryWithSpend[] = await Promise.all(
        categoriesData.map(async (category) => {
          const { data: lineItems } = await supabase
            .from('line_items')
            .select('*')
            .eq('category_id', category.id)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

          const items = lineItems || [];
          const lineItemIds = items.map((li: LineItem) => li.id);

          // Batch-fetch payments for all line items in this category
          let paymentsData: Payment[] = [];
          if (lineItemIds.length > 0) {
            const { data } = await supabase
              .from('payments')
              .select('*')
              .in('line_item_id', lineItemIds)
              .order('created_at', { ascending: true });
            paymentsData = (data || []) as Payment[];
          }

          // Group payments by line_item_id
          const paymentsByLineItem: Record<string, Payment[]> = {};
          for (const payment of paymentsData) {
            if (!paymentsByLineItem[payment.line_item_id]) {
              paymentsByLineItem[payment.line_item_id] = [];
            }
            paymentsByLineItem[payment.line_item_id].push(payment);
          }

          // Attach payments to each line item
          const lineItemsWithPayments: LineItemWithPayments[] = items.map((item: LineItem) => {
            const itemPayments = paymentsByLineItem[item.id] || [];
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
            (sum: number, item: LineItemWithPayments) => sum + (Number(item.actual_cost) || 0),
            0
          );

          const estimatedTotal = lineItemsWithPayments.reduce(
            (sum: number, item: LineItemWithPayments) => sum + (Number(item.estimated_cost) || 0),
            0
          );

          const categoryTotalPaid = lineItemsWithPayments.reduce(
            (sum: number, item: LineItemWithPayments) => {
              const hasPayments = item.payments && item.payments.length > 0;
              return sum + (hasPayments ? item.total_paid : (Number(item.paid_to_date) || 0));
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
        })
      );

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
