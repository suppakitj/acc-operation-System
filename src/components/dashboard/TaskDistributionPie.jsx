import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SERVICE_LABELS = {
  accounting: 'ทำบัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบบัญชี',
  peak_licensing: 'Peak Account',
};

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

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
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Task Distribution by Type</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <div className="flex items-center gap-6">
          <div className="w-[160px] h-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} งาน`, name]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-xs truncate">{d.name}</span>
                <span className="text-xs font-semibold tabular-nums">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}