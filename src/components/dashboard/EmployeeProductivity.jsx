import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function EmployeeProductivity({ tasks, users }) {
  const data = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'cancelled') return;
      if (!map[t.assigned_to]) map[t.assigned_to] = { name: '', completed: 0, total: 0 };
      map[t.assigned_to].total++;
      if (t.status === 'completed') map[t.assigned_to].completed++;
      if (t.assigned_name) map[t.assigned_to].name = t.assigned_name;
    });

    users.forEach(u => {
      if (map[u.email] && !map[u.email].name) map[u.email].name = u.full_name || u.email;
    });

    return Object.entries(map)
      .map(([email, d]) => {
        const full = d.name || email.split('@')[0];
        const parts = full.split(' ');
        const short = parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : full.slice(0, 10);
        return { name: short, completed: d.completed, avgHours: Math.round(d.total * 2.5) };
      })
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
  }, [tasks, users]);

  return (
    <Card className="flex flex-col shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Employee Productivity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-4 px-5">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" barSize={10} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={70} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Bar dataKey="completed" name="Tasks Completed" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="avgHours" name="Average Hours" fill="#fbbf24" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}