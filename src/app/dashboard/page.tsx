import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ClientCard from '@/components/dashboard/ClientCard';
import { Client, ClientWithBudgetStatus, getBudgetStatus } from '@/lib/types';
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

  // For each client, calculate total spent from line items
  const clientsWithStatus: ClientWithBudgetStatus[] = await Promise.all(
    clients.map(async (client: Client) => {
      // Get budget for this client
      const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('client_id', client.id)
        .single();

      let totalSpent = 0;

      if (budget) {
        // Get all categories for this budget
        const { data: categories } = await supabase
          .from('categories')
          .select('id')
          .eq('budget_id', budget.id);

        if (categories && categories.length > 0) {
          // Get sum of actual_cost from all line items
          const categoryIds = categories.map((c) => c.id);
          const { data: lineItems } = await supabase
            .from('line_items')
            .select('actual_cost')
            .in('category_id', categoryIds);

          if (lineItems) {
            totalSpent = lineItems.reduce(
              (sum, item) => sum + (Number(item.actual_cost) || 0),
              0
            );
          }
        }
      }

      return {
        ...client,
        total_spent: totalSpent,
        budget_status: getBudgetStatus(Number(client.total_budget), totalSpent),
      };
    })
  );

  return clientsWithStatus;
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

  const clients = await getClientsWithBudgetStatus(user.id);

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

        {clients.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <p className="text-slate-600 mb-4">No clients yet. Create your first client to get started.</p>
            <Link href="/clients/new">
              <Button>Create Client</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
