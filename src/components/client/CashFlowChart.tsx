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
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md">
      <p className="text-slate-600 text-xs font-medium mb-1">{month}</p>
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
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#64748b' }}
              />
              <Bar dataKey="paid" name="Paid" fill="#10b981" stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="upcoming" name="Upcoming" fill="#3b82f6" stackId="stack" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
