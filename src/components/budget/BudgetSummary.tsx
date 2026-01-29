'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface BudgetSummaryProps {
  clientId: string;
}

export default function BudgetSummary({ clientId }: BudgetSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">AI Budget Summary</h3>
        <Button onClick={generateSummary} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Budget Summary'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {summary && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(summary);
            }}
            className="mt-3 text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Copy to clipboard
          </button>
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
