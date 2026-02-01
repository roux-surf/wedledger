'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CashFlowDataPoint } from '@/lib/clientDataTransformers';
import { formatCurrency } from '@/lib/types';

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-slate-300 text-xs font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-5">
      <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
        Cash Flow Timeline
      </h4>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] lg:h-[300px]">
          <p className="text-slate-400 text-sm">No payment data available yet.</p>
        </div>
      ) : (
        <div className="h-[220px] lg:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
              />
              <Bar dataKey="paid" name="Paid" fill="#34d399" stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="upcoming" name="Upcoming" fill="#60a5fa" stackId="stack" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
