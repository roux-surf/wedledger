'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ClientWithBudgetStatus } from '@/lib/types';
import ClientCard from './ClientCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface ClientListProps {
  clients: ClientWithBudgetStatus[];
}

export default function ClientList({ clients }: ClientListProps) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRequest = (clientId: string, clientName: string) => {
    setDeleteTarget({ id: clientId, name: clientName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      console.warn('Failed to delete client:', err);
      showToast('Failed to delete client', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} onDelete={handleDeleteRequest} />
        ))}
      </div>
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Wedding"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This will permanently delete all budget data, categories, line items, and payments. This cannot be undone.`}
        confirmLabel="Delete Wedding"
        loading={deleting}
      />
    </>
  );
}
