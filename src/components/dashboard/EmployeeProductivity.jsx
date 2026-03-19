import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function EmployeeProductivity({ tasks, users }) {
  const data = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'cancelled') return;
      if (!map[t.assigned_to]) {
        map[t.assigned_to] = { name: '', completed: 0, total: 0 };
      }
      map[t.assigned_to].total++;
      if (t.status === 'completed') map[t.assigned_to].completed++;
      if (t.assigned_name) map[t.assigned_to].name = t.assigned_name;
    });

    // Match user names from users list
    users.forEach(u => {
      if (map[u.email] && !map[u.email].name) {
        map[u.email].name = u.full_name || u.email;
      }
    });

    return Object.entries(map)
      .map(([email, d]) => ({
        name: d.name ? (d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name) : email.split('@')[0],
        completed: d.completed,
        total: d.total,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 6);
  }, [tasks, users]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Employee Productivity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" barSize={14}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="total" name="Total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}