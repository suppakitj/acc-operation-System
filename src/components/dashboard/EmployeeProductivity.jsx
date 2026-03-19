import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users } from 'lucide-react';

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
      .map(([email, d]) => ({
        name: d.name ? (d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name) : email.split('@')[0],
        completed: d.completed,
        total: d.total,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 6);
  }, [tasks, users]);

  return (
    <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          Employee Productivity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data} layout="vertical" barSize={12} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={75} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            <Bar dataKey="total" name="Total Assigned" fill="#fbbf24" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}