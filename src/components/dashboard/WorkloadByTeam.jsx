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

export default function WorkloadByTeam({ tasks }) {
  const data = useMemo(() => {
    const map = {};
    tasks.filter(t => t.status !== 'cancelled').forEach(t => {
      const dept = t.department || 'other';
      if (!map[dept]) map[dept] = { in_progress: 0, overdue: 0 };
      if (t.status === 'in_progress' || t.status === 'pending' || t.status === 'review') {
        map[dept].in_progress++;
      }
      if (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed') {
        map[dept].overdue++;
      }
    });

    return Object.entries(map)
      .map(([key, val]) => ({
        name: DEPT_LABELS[key] || key,
        in_progress: val.in_progress,
        overdue: val.overdue,
      }))
      .sort((a, b) => (b.in_progress + b.overdue) - (a.in_progress + a.overdue))
      .slice(0, 6);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Workload by Team</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="in_progress" name="In Progress" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="overdue" name="Overdue" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}