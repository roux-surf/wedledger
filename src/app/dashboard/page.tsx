import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ClientList from '@/components/dashboard/ClientList';
import MarketplaceClientList from '@/components/dashboard/MarketplaceClientList';
import UpcomingPayments from '@/components/dashboard/UpcomingPayments';
import { Client, ClientWithBudgetStatus, MarketplaceClient, PaymentAlert, MilestoneAlert, getBudgetStatus, getPaymentUrgency, getMilestoneUrgency, EngagementType } from '@/lib/types';
import Button from '@/components/ui/Button';
import { getUserProfile } from '@/lib/userProfile';

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

  const budgetByClient = new Map((allBudgets || []).map((b) => [b.client_id, b.id]));
  const budgetIds = (allBudgets || []).map((b) => b.id);

  // Batch-fetch all categories
  const { data: allCategories } = budgetIds.length > 0
    ? await supabase.from('categories').select('id, budget_id').in('budget_id', budgetIds)
    : { data: [] };

  const categoryToBudget = new Map((allCategories || []).map((c) => [c.id, c.budget_id]));
  const categoryIds = (allCategories || []).map((c) => c.id);

  // Batch-fetch all line items
  const { data: allLineItems } = categoryIds.length > 0
    ? await supabase.from('line_items').select('actual_cost, category_id').in('category_id', categoryIds)
    : { data: [] };

  // Build spending by client
  const budgetToClient = new Map((allBudgets || []).map((b) => [b.id, b.client_id]));
  const spentByClient = new Map<string, number>();
  for (const li of allLineItems || []) {
    const budgetId = categoryToBudget.get(li.category_id);
    if (!budgetId) continue;
    const cId = budgetToClient.get(budgetId);
    if (!cId) continue;
    spentByClient.set(cId, (spentByClient.get(cId) || 0) + (Number(li.actual_cost) || 0));
  }

  // Batch-fetch all milestones
  const { data: allMilestones } = clientIds.length > 0
    ? await supabase.from('milestones').select('client_id, status').in('client_id', clientIds)
    : { data: [] };

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

async function getMarketplaceClients(userId: string): Promise<MarketplaceClient[]> {
  const supabase = await createClient();

  // Fetch accepted/active engagements (don't require client_id to be set)
  const { data: engagements, error: engError } = await supabase
    .from('engagements')
    .select('id, client_id, couple_user_id, type')
    .eq('planner_user_id', userId)
    .in('status', ['accepted', 'active']);

  if (engError || !engagements || engagements.length === 0) {
    return [];
  }

  const coupleUserIds = [...new Set(engagements.map((e) => e.couple_user_id as string))];

  // Fetch couple display names
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name')
    .in('user_id', coupleUserIds);

  const nameMap = new Map((profiles ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));

  // Look up client records for each couple via user_id (works even if client_id isn't set on engagement)
  const { data: coupleClients } = await supabase
    .from('clients')
    .select('*')
    .in('user_id', coupleUserIds)
    .order('wedding_date', { ascending: true });

  if (!coupleClients || coupleClients.length === 0) {
    return [];
  }

  // Map couple_user_id -> client record
  const clientByCouple = new Map(coupleClients.map((c) => [c.user_id as string, c]));

  // Build a map from couple_user_id -> engagement info
  const engagementByCouple = new Map(
    engagements.map((e) => [
      e.couple_user_id as string,
      { id: e.id as string, type: e.type as EngagementType, client_id: e.client_id as string | null },
    ])
  );

  // Backfill: if any engagement is missing client_id, set it (fire-and-forget)
  for (const eng of engagements) {
    if (!eng.client_id) {
      const client = clientByCouple.get(eng.couple_user_id as string);
      if (client) {
        supabase
          .from('engagements')
          .update({ client_id: client.id })
          .eq('id', eng.id)
          .then(() => {});
      }
    }
  }

  // Filter to engagements that have a matching client record
  const clients = coupleUserIds
    .map((coupleId) => {
      const client = clientByCouple.get(coupleId);
      const eng = engagementByCouple.get(coupleId);
      if (!client || !eng) return null;
      return { client, eng };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Batch-fetch spending data for all marketplace clients
  const mpClientIds = clients.map(({ client }) => client.id);

  const { data: mpBudgets } = mpClientIds.length > 0
    ? await supabase.from('budgets').select('id, client_id').in('client_id', mpClientIds)
    : { data: [] };

  const mpBudgetToClient = new Map((mpBudgets || []).map((b) => [b.id, b.client_id]));
  const mpBudgetIds = (mpBudgets || []).map((b) => b.id);

  const { data: mpCategories } = mpBudgetIds.length > 0
    ? await supabase.from('categories').select('id, budget_id').in('budget_id', mpBudgetIds)
    : { data: [] };

  const mpCatToBudget = new Map((mpCategories || []).map((c) => [c.id, c.budget_id]));
  const mpCatIds = (mpCategories || []).map((c) => c.id);

  const { data: mpLineItems } = mpCatIds.length > 0
    ? await supabase.from('line_items').select('actual_cost, category_id').in('category_id', mpCatIds)
    : { data: [] };

  const mpSpentByClient = new Map<string, number>();
  for (const li of mpLineItems || []) {
    const budgetId = mpCatToBudget.get(li.category_id);
    if (!budgetId) continue;
    const cId = mpBudgetToClient.get(budgetId);
    if (!cId) continue;
    mpSpentByClient.set(cId, (mpSpentByClient.get(cId) || 0) + (Number(li.actual_cost) || 0));
  }

  const { data: mpMilestones } = mpClientIds.length > 0
    ? await supabase.from('milestones').select('client_id, status').in('client_id', mpClientIds)
    : { data: [] };

  const mpMsByClient = new Map<string, { total: number; completed: number }>();
  for (const m of mpMilestones || []) {
    const entry = mpMsByClient.get(m.client_id) || { total: 0, completed: 0 };
    entry.total++;
    if (m.status === 'completed') entry.completed++;
    mpMsByClient.set(m.client_id, entry);
  }

  const marketplaceClients: MarketplaceClient[] = clients.map(({ client, eng }) => {
    const totalSpent = mpSpentByClient.get(client.id) || 0;
    const ms = mpMsByClient.get(client.id) || { total: 0, completed: 0 };
    const coupleUserId = client.user_id as string;
    return {
      ...client,
      total_spent: totalSpent,
      budget_status: getBudgetStatus(Number(client.total_budget), totalSpent),
      milestones_total: ms.total,
      milestones_completed: ms.completed,
      engagement_type: eng.type,
      couple_name: nameMap.get(coupleUserId) ?? 'Unknown',
    };
  });

  return marketplaceClients;
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

async function getUpcomingMilestones(userId: string, extraClientIds: string[] = []): Promise<MilestoneAlert[]> {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', userId);

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const clientIds = [...new Set([...(clients ?? []).map((c) => c.id), ...extraClientIds])];

  if (clientIds.length === 0) return [];

  // Fetch names for any extra client IDs not already in the map
  const missingIds = extraClientIds.filter((id) => !clientMap.has(id));
  if (missingIds.length > 0) {
    const { data: extraClients } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', missingIds);
    for (const c of extraClients ?? []) {
      clientMap.set(c.id, c.name);
    }
  }

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

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = await createClient();
  const profile = await getUserProfile(supabase, userId);

  if (!profile) {
    redirect('/onboarding');
  }

  const isPlannerRole = profile.role === 'planner';

  const [clients, paymentAlerts, marketplaceClients] = await Promise.all([
    getClientsWithBudgetStatus(userId),
    getUpcomingPayments(userId),
    isPlannerRole ? getMarketplaceClients(userId) : Promise.resolve([]),
  ]);

  // Fetch milestones including marketplace client IDs
  const marketplaceClientIds = marketplaceClients.map((mc) => mc.id);
  const milestoneAlerts = await getUpcomingMilestones(userId, marketplaceClientIds);

  // Group milestones by client_id, sorted by urgency then date, max 3 per client
  const urgencyOrder = { overdue: 0, this_week: 1, upcoming: 2 };
  const milestonesByClient: Record<string, MilestoneAlert[]> = {};
  for (const alert of milestoneAlerts) {
    if (!milestonesByClient[alert.client_id]) {
      milestonesByClient[alert.client_id] = [];
    }
    milestonesByClient[alert.client_id].push(alert);
  }
  for (const clientId of Object.keys(milestonesByClient)) {
    milestonesByClient[clientId] = milestonesByClient[clientId]
      .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.target_date.localeCompare(b.target_date))
      .slice(0, 3);
  }

  return (
    <div className="min-h-screen bg-ivory">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-heading font-semibold tracking-tight text-charcoal">Clients</h2>
            <p className="text-warm-gray mt-1">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
              {marketplaceClients.length > 0 && (
                <span className="text-champagne-dark">
                  {' '}+ {marketplaceClients.length} marketplace
                </span>
              )}
            </p>
          </div>
          <Link href="/clients/new">
            <Button>New Client</Button>
          </Link>
        </div>

        {clients.length === 0 && marketplaceClients.length === 0 ? (
          <div className="bg-cream border border-stone rounded-lg p-12 text-center">
            <p className="text-warm-gray mb-4">No clients yet. Create your first client to get started.</p>
            <Link href="/clients/new">
              <Button>Create Client</Button>
            </Link>
          </div>
        ) : (
          <>
            {clients.length > 0 && (
              <div>
                {marketplaceClients.length > 0 && (
                  <h3 className="text-lg font-semibold text-charcoal mb-3">My Clients</h3>
                )}
                <ClientList clients={clients} milestonesByClient={milestonesByClient} />
              </div>
            )}

            {marketplaceClients.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-charcoal mb-3">Marketplace Clients</h3>
                <MarketplaceClientList clients={marketplaceClients} milestonesByClient={milestonesByClient} />
              </div>
            )}
          </>
        )}

        <UpcomingPayments alerts={paymentAlerts} />
      </main>
    </div>
  );
}
