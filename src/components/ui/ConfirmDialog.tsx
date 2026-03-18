'use client';

import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  loadingLabel?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  loading = false,
  loadingLabel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-warm-gray">{message}</p>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={confirmVariant} size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? (loadingLabel ?? 'Processing...') : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
