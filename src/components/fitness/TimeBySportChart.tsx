'use client';

import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import type { TypeBreakdown } from '@/lib/fitness/types';
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from './chartTheme';

// Isolated from OverviewSection specifically so only this chart (the one
// piece that actually touches recharts' SSR/CSR measurement mismatch)
// needs to be client-only — the rest of Overview stays server-renderable
// and never has to sit behind a blank loading window.
export default function TimeBySportChart({ data }: { data: TypeBreakdown[] }) {
  return (
    <div style={{ width: 168, height: 168, flexShrink: 0 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(v: number) => [`${v} min`, 'Time']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
