import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SVC_LABELS = {
  accounting: 'Accounting', payroll: 'Payroll',
  tax_consulting: 'Tax Consulting', audit: 'Audit', peak_licensing: 'Peak',
};
const SVC_COLORS = {
  accounting: '#22c55e', payroll: '#3b82f6',
  tax_consulting: '#a855f7', audit: '#f97316', peak_licensing: '#eab308',
};

function fmtCost(value) {
  return `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

export default function CostByServiceChart({ filteredEntries, userCostMap }) {
  const data = Object.keys(SVC_LABELS).map(svc => {
    const entries = filteredEntries.filter(e => e.service_type === svc);
    const totalMins = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
    const totalCost = entries.reduce((s, e) => s + ((e.duration_minutes || 0) / 60) * (userCostMap[e.user_email] || 0), 0);
    return {
      name: SVC_LABELS[svc],
      key: svc,
      cost: Math.round(totalCost),
      hours: Math.round(totalMins / 60 * 10) / 10,
    };
  }).filter(d => d.cost > 0 || d.hours > 0).sort((a, b) => b.cost - a.cost);

  if (data.length === 0) return null;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">ต้นทุนตามประเภทบริการ</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" barSize={20}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#475569' }} />
            <Tooltip
              formatter={(value, name) => [fmtCost(value), 'ต้นทุน']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              labelFormatter={(label) => {
                const item = data.find(d => d.name === label);
                return `${label} — ${item?.hours || 0} ชม.`;
              }}
            />
            <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
              {data.map(d => <Cell key={d.key} fill={SVC_COLORS[d.key] || '#94a3b8'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}