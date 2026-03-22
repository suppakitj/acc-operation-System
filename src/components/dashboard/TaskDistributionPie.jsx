import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SERVICE_LABELS = {
  accounting: 'Accounting',
  payroll: 'Payroll',
  tax_consulting: 'Tax',
  audit: 'Audit',
  peak_licensing: 'Peak',
};

const COLORS = ['#1e3a5f', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#64748b'];

export default function TaskDistributionPie({ tasks }) {
  const data = useMemo(() => {
    const map = {};
    const completedMap = {};
    tasks.filter(t => t.status !== 'cancelled').forEach(t => {
      const key = t.service_type || 'other';
      map[key] = (map[key] || 0) + 1;
      if (t.status === 'completed') completedMap[key] = (completedMap[key] || 0) + 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([key, count]) => ({
        name: SERVICE_LABELS[key] || key,
        value: count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        completionRate: count > 0 ? Math.round(((completedMap[key] || 0) / count) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Tasks by Service Type</CardTitle>
        <CardDescription className="text-xs">Distribution and completion rate</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-[190px] h-[190px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} tasks`, name]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-3">
            {data.map((d, i) => (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-medium">{d.name}</span>
                    <span className="text-[10px] text-muted-foreground">{d.value} tasks</span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums">{d.completionRate}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${d.completionRate}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}