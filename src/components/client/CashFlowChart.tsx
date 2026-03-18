'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CashFlowDataPoint } from '@/lib/clientDataTransformers';
import { formatCurrency } from '@/lib/types';

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; payload: CashFlowDataPoint }> }) {
  if (!active || !payload || !payload.length) return null;
  const month = payload[0].payload.month;

  return (
    <div className="bg-cream border border-stone rounded-lg px-3 py-2 shadow-md">
      <p className="text-warm-gray text-xs font-medium mb-1">{month}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <div className="bg-cream border border-stone rounded-lg p-5">
      <h4 className="text-sm font-medium text-warm-gray uppercase tracking-wider mb-4">
        Cash Flow Timeline
      </h4>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[260px] lg:h-[340px]">
          <p className="text-warm-gray-light text-sm">No payment data available yet.</p>
        </div>
      ) : (
        <div className="h-[260px] lg:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} />
              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
                tick={{ fill: '#8A8578', fontSize: 12 }}
                axisLine={{ stroke: '#D6D3CE' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8A8578', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#8A8578' }}
              />
              <Bar dataKey="paid" name="Paid" fill="#8B9D7B" stackId="stack" radius={[2, 2, 2, 2]} />
              <Bar dataKey="upcoming" name="Upcoming" fill="#C5A572" stackId="stack" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
