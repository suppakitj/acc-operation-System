import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';

const DEPT_LABELS = {
  management: 'Management',
  accounting: 'Accounting',
  consulting: 'Consulting',
  audit: 'Audit',
  billing: 'Billing',
  it: 'IT',
};

export default function WorkloadByTeam({ tasks }) {
  const data = useMemo(() => {
    const map = {};
    tasks.filter(t => t.status !== 'cancelled').forEach(t => {
      const dept = t.department || 'other';
      if (!map[dept]) map[dept] = { in_progress: 0, overdue: 0 };
      if (t.status === 'in_progress' || t.status === 'pending' || t.status === 'review') map[dept].in_progress++;
      if (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed') map[dept].overdue++;
    });
    return Object.entries(map)
      .map(([key, val]) => ({ name: DEPT_LABELS[key] || key, in_progress: val.in_progress, overdue: val.overdue }))
      .sort((a, b) => (b.in_progress + b.overdue) - (a.in_progress + a.overdue))
      .slice(0, 6);
  }, [tasks]);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal-500" />
          Workload by Team
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="in_progress" name="In Progress" fill="#22c55e" stackId="a" />
            <Bar dataKey="overdue" name="Overdue" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}