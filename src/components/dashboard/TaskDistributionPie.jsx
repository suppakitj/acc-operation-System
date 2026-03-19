import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const SERVICE_LABELS = {
  accounting: 'ทำบัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบบัญชี',
  peak_licensing: 'Peak Account',
};

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export default function TaskDistributionPie({ tasks }) {
  const data = useMemo(() => {
    const map = {};
    tasks.filter(t => t.status !== 'cancelled').forEach(t => {
      const key = t.service_type || 'other';
      map[key] = (map[key] || 0) + 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([key, count]) => ({
        name: SERVICE_LABELS[key] || key,
        value: count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-violet-500" />
          Task Distribution by Type
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center gap-6">
          <div className="w-[150px] h-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" strokeWidth={2} stroke="#fff">
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} งาน`, name]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2.5">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-xs truncate text-foreground">{d.name}</span>
                <span className="text-xs font-semibold tabular-nums">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}