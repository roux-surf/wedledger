'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface BudgetSummaryProps {
  clientId: string;
  onPushToClient: (summary: string) => Promise<void>;
  currentPublishedSummary: string | null;
}

export default function BudgetSummary({ clientId, onPushToClient, currentPublishedSummary }: BudgetSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToClient = async () => {
    if (!summary) return;
    setPushing(true);
    try {
      await onPushToClient(summary);
    } catch {
      setError('Failed to push summary to client view');
    } finally {
      setPushing(false);
    }
  };

  const handleRemoveFromClient = async () => {
    setRemoving(true);
    try {
      await onPushToClient('');
    } catch {
      setError('Failed to remove summary from client view');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">AI Budget Summary</h3>
        <Button onClick={generateSummary} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Budget Summary'}
        </Button>
      </div>

      {currentPublishedSummary && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
          <span className="text-sm text-green-700">Currently published to client view</span>
          <button
            onClick={handleRemoveFromClient}
            disabled={removing}
            className="text-xs text-red-600 hover:text-red-700 underline ml-auto"
          >
            {removing ? 'Removing...' : 'Remove from Client View'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {summary && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(summary);
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Copy to clipboard
            </button>
            <button
              onClick={handlePushToClient}
              disabled={pushing}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
            >
              {pushing ? 'Pushing...' : 'Push to Client View'}
            </button>
          </div>
        </div>
      )}

      {!summary && !error && !loading && (
        <p className="text-sm text-slate-500">
          Click the button above to generate a professional budget summary suitable for client communication.
        </p>
      )}
    </div>
  );
}
