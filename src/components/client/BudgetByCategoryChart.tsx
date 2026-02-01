'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategoryAllocationDataPoint, CATEGORY_COLORS } from '@/lib/clientDataTransformers';
import { formatCurrency } from '@/lib/types';

interface BudgetByCategoryChartProps {
  data: CategoryAllocationDataPoint[];
  totalBudget: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryAllocationDataPoint }> }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-white text-sm font-medium">{item.name}</p>
      <p className="text-slate-300 text-xs mt-1">
        Budget: {formatCurrency(item.value)}
      </p>
      <p className="text-slate-300 text-xs">
        Spent: {formatCurrency(item.spent)}
      </p>
    </div>
  );
}

function CustomLabel({ cx, cy, totalBudget }: { cx: number; cy: number; totalBudget: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.5em" fill="#94a3b8" fontSize={11}>
        Total
      </tspan>
      <tspan x={cx} dy="1.4em" fill="#ffffff" fontSize={16} fontWeight="bold">
        {formatCurrency(totalBudget)}
      </tspan>
    </text>
  );
}

export default function BudgetByCategoryChart({ data, totalBudget }: BudgetByCategoryChartProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-5">
      <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
        Budget by Category
      </h4>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] lg:h-[300px]">
          <p className="text-slate-400 text-sm">No category allocations set.</p>
        </div>
      ) : (
        <div className="h-[220px] lg:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  />
                ))}
                <CustomLabel cx={0} cy={0} totalBudget={totalBudget} />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 11, lineHeight: '20px' }}
                formatter={(value: string) => (
                  <span className="text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
