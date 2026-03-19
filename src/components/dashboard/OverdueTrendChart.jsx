import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function OverdueTrendChart({ tasks }) {
  const data = useMemo(() => {
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(today, i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const label = format(m, 'MMM');

      const completedInMonth = tasks.filter(t => {
        if (!t.completed_date) return false;
        const d = new Date(t.completed_date);
        return isWithinInterval(d, { start, end });
      }).length;

      const overdueInMonth = tasks.filter(t => {
        if (!t.due_date || t.status === 'cancelled') return false;
        const dueDate = new Date(t.due_date);
        return isWithinInterval(dueDate, { start, end }) && (t.status !== 'completed' || (t.completed_date && new Date(t.completed_date) > dueDate));
      }).length;

      months.push({ name: label, completed: completedInMonth, overdue: overdueInMonth });
    }
    return months;
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Task Overdue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="overdue" name="Overdue" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="completed" name="Completed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}