import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function OverdueTrendChart({ tasks }) {
  const data = useMemo(() => {
    const year = new Date().getFullYear();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const m = new Date(year, i, 1);
      const start = startOfMonth(m);
      const end = endOfMonth(m);

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

      months.push({ name: format(m, 'MMM'), completed: completedInMonth, overdue: overdueInMonth });
    }
    return months;
  }, [tasks]);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Task Overdue Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey="completed" name="Completed" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="overdue" name="Overdue" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}