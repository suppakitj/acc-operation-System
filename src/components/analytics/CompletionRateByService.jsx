import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SVC_LABELS = {
  accounting: 'Accounting',
  payroll: 'Payroll',
  tax_consulting: 'Tax',
  audit: 'Audit',
  peak_licensing: 'Peak',
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function CompletionRateByService({ tasks }) {
  const data = useMemo(() => {
    const map = {};
    tasks.filter(t => t.status !== 'cancelled').forEach(t => {
      const svc = t.service_type || 'other';
      if (!map[svc]) map[svc] = { total: 0, done: 0 };
      map[svc].total++;
      if (t.status === 'completed') map[svc].done++;
    });

    return Object.entries(map).map(([svc, v]) => ({
      name: SVC_LABELS[svc] || svc,
      value: v.total,
      rate: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
    })).sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tasks by Service Type</CardTitle>
        <p className="text-xs text-muted-foreground">Distribution and completion rate</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="h-[220px] w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, n, p) => [`${v} tasks (${p.payload.rate}% done)`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {data.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{d.value} tasks</span>
                    <div className="w-16 bg-muted rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${d.rate}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right">{d.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}