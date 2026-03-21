import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ClientList from '@/components/dashboard/ClientList';
import UpcomingPayments from '@/components/dashboard/UpcomingPayments';
import UpcomingMilestones from '@/components/dashboard/UpcomingMilestones';
import { Client, ClientWithBudgetStatus, PaymentAlert, MilestoneAlert, getBudgetStatus, getPaymentUrgency, getMilestoneUrgency } from '@/lib/types';
import Button from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

async function getClientsWithBudgetStatus(userId: string): Promise<ClientWithBudgetStatus[]> {
  const supabase = await createClient();

  // Fetch clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('wedding_date', { ascending: true });

  if (clientsError || !clients) {
    return [];
  }

  const clientIds = clients.map((c: Client) => c.id);

  // Batch-fetch all budgets for all clients
  const { data: allBudgets } = clientIds.length > 0
    ? await supabase.from('budgets').select('id, client_id').in('client_id', clientIds)
    : { data: [] };
  const budgetsList = allBudgets || [];
  const budgetByClient = new Map(budgetsList.map((b) => [b.client_id, b.id]));
  const budgetIds = budgetsList.map((b) => b.id);

  // Batch-fetch all categories for all budgets
  const { data: allCategories } = budgetIds.length > 0
    ? await supabase.from('categories').select('id, budget_id').in('budget_id', budgetIds)
    : { data: [] };
  const categoriesList = allCategories || [];
  const categoryIds = categoriesList.map((c) => c.id);

  // Map category -> budget -> client for spending rollup
  const categoryToBudget = new Map(categoriesList.map((c) => [c.id, c.budget_id]));
  const budgetToClient = new Map(budgetsList.map((b) => [b.id, b.client_id]));

  // Batch-fetch all line items for all categories
  const { data: allLineItems } = categoryIds.length > 0
    ? await supabase.from('line_items').select('actual_cost, category_id').in('category_id', categoryIds)
    : { data: [] };

  // Calculate total spent per client
  const spentByClient = new Map<string, number>();
  for (const li of allLineItems || []) {
    const budgetId = categoryToBudget.get(li.category_id);
    const cId = budgetId ? budgetToClient.get(budgetId) : undefined;
    if (cId) {
      spentByClient.set(cId, (spentByClient.get(cId) || 0) + (Number(li.actual_cost) || 0));
    }
  }

  // Batch-fetch all milestones for all clients
  const { data: allMilestones } = clientIds.length > 0
    ? await supabase.from('milestones').select('client_id, status').in('client_id', clientIds)
    : { data: [] };

  // Group milestones by client
  const milestonesByClient = new Map<string, { total: number; completed: number }>();
  for (const m of allMilestones || []) {
    const entry = milestonesByClient.get(m.client_id) || { total: 0, completed: 0 };
    entry.total++;
    if (m.status === 'completed') entry.completed++;
    milestonesByClient.set(m.client_id, entry);
  }

  const clientsWithStatus: ClientWithBudgetStatus[] = clients.map((client: Client) => {
    const totalSpent = spentByClient.get(client.id) || 0;
    const ms = milestonesByClient.get(client.id) || { total: 0, completed: 0 };

    return {
      ...client,
      total_spent: totalSpent,
      budget_status: getBudgetStatus(Number(client.total_budget), totalSpent),
      milestones_total: ms.total,
      milestones_completed: ms.completed,
    };
  });

  return clientsWithStatus;
}

async function getUpcomingPayments(userId: string): Promise<PaymentAlert[]> {
  const supabase = await createClient();

  // Get all clients for this user
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', userId);

  if (!clients || clients.length === 0) return [];

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const clientIds = clients.map((c) => c.id);

  // Get budgets for these clients
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, client_id')
    .in('client_id', clientIds);

  if (!budgets || budgets.length === 0) return [];

  const budgetToClient = new Map(budgets.map((b) => [b.id, b.client_id]));
  const budgetIds = budgets.map((b) => b.id);

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, budget_id, name')
    .in('budget_id', budgetIds);

  if (!categories || categories.length === 0) return [];

  const categoryMap = new Map(categories.map((c) => [c.id, { budget_id: c.budget_id, name: c.name }]));
  const categoryIds = categories.map((c) => c.id);

  // Get line items
  const { data: lineItems } = await supabase
    .from('line_items')
    .select('id, category_id, vendor_name')
    .in('category_id', categoryIds);

  if (!lineItems || lineItems.length === 0) return [];

  const lineItemMap = new Map(lineItems.map((li) => [li.id, { category_id: li.category_id, vendor_name: li.vendor_name }]));
  const lineItemIds = lineItems.map((li) => li.id);

  // Get pending payments with due dates within 30 days (including overdue)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const cutoffDate = thirtyDaysFromNow.toISOString().split('T')[0];

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .in('line_item_id', lineItemIds)
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lte('due_date', cutoffDate)
    .order('due_date', { ascending: true });

  if (!payments || payments.length === 0) return [];

  // Build alerts
  const alerts: PaymentAlert[] = [];
  for (const payment of payments) {
    const lineItem = lineItemMap.get(payment.line_item_id);
    if (!lineItem) continue;

    const category = categoryMap.get(lineItem.category_id);
    if (!category) continue;

    const clientId = budgetToClient.get(category.budget_id);
    if (!clientId) continue;

    const clientName = clientMap.get(clientId);
    if (!clientName) continue;

    alerts.push({
      payment_id: payment.id,
      vendor_name: lineItem.vendor_name,
      client_id: clientId,
      client_name: clientName,
      category_name: category.name,
      label: payment.label,
      amount: Number(payment.amount),
      due_date: payment.due_date,
      urgency: getPaymentUrgency(payment.due_date),
    });
  }

  return alerts;
}

async function getUpcomingMilestones(userId: string): Promise<MilestoneAlert[]> {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', userId);

  if (!clients || clients.length === 0) return [];

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const clientIds = clients.map((c) => c.id);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const cutoffDate = thirtyDaysFromNow.toISOString().split('T')[0];

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .in('client_id', clientIds)
    .neq('status', 'completed')
    .lte('target_date', cutoffDate)
    .order('target_date', { ascending: true });

  if (!milestones || milestones.length === 0) return [];

  return milestones.map((m) => ({
    milestone_id: m.id,
    title: m.title,
    client_id: m.client_id,
    client_name: clientMap.get(m.client_id) || 'Unknown',
    target_date: m.target_date,
    status: m.status,
    urgency: getMilestoneUrgency(m.target_date),
  }));
}

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [clients, paymentAlerts, milestoneAlerts] = await Promise.all([
    getClientsWithBudgetStatus(user.id),
    getUpcomingPayments(user.id),
    getUpcomingMilestones(user.id),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">WedLedger</h1>
          <form action={signOut}>
            <Button variant="secondary" size="sm" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
            <p className="text-slate-600 mt-1">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/clients/new">
            <Button>New Client</Button>
          </Link>
        </div>

        <UpcomingPayments alerts={paymentAlerts} />
        <UpcomingMilestones alerts={milestoneAlerts} />

        {clients.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <p className="text-slate-600 mb-4">No clients yet. Create your first client to get started.</p>
            <Link href="/clients/new">
              <Button>Create Client</Button>
            </Link>
          </div>
        ) : (
          <ClientList clients={clients} />
        )}
      </main>
    </div>
  );
}
