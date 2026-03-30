import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DEPT_LABELS = {
  management: 'Management',
  accounting: 'Accounting',
  consulting: 'Consulting',
  audit: 'Audit',
  billing: 'Billing',
  it: 'IT',
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  review: '#a855f7',
  completed: '#22c55e',
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
};

export default function TaskStatusByDept({ tasks }) {
  const data = useMemo(() => {
    const map = {};
    tasks.filter(t => t.status !== 'cancelled').forEach(t => {
      const dept = t.department || 'other';
      if (!map[dept]) map[dept] = { pending: 0, in_progress: 0, review: 0, completed: 0 };
      if (map[dept][t.status] !== undefined) map[dept][t.status]++;
    });

    return Object.entries(map)
      .map(([key, val]) => ({
        name: DEPT_LABELS[key] || key,
        ...val,
        total: val.pending + val.in_progress + val.review + val.completed,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tasks]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-foreground mb-1.5">{label} — {total} งาน</p>
        {payload.map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{STATUS_LABELS[p.dataKey]}:</span>
            <span className="font-semibold ml-auto">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">สถานะงานแยกตามแผนก</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">ไม่มีข้อมูล</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                formatter={(value) => STATUS_LABELS[value] || value}
              />
              <Bar dataKey="pending" name="pending" fill={STATUS_COLORS.pending} stackId="a" />
              <Bar dataKey="in_progress" name="in_progress" fill={STATUS_COLORS.in_progress} stackId="a" />
              <Bar dataKey="review" name="review" fill={STATUS_COLORS.review} stackId="a" />
              <Bar dataKey="completed" name="completed" fill={STATUS_COLORS.completed} stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}