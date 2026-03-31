import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const overdueInMonth = tasks.filter(t => {
        if (!t.due_date || t.status === 'cancelled') return false;
        const dueDate = new Date(t.due_date);
        if (!isWithinInterval(dueDate, { start, end })) return false;
        const dueStr = t.due_date.slice(0, 10);
        if (t.status === 'completed') {
          // Completed: overdue only if completed_date is strictly after due_date
          if (t.completed_date) {
            return t.completed_date.slice(0, 10) > dueStr;
          }
          return false;
        }
        // Not completed: overdue only if due_date has already passed
        return dueStr < todayStr;
      }).length;

      months.push({ name: format(m, 'MMM'), completed: completedInMonth, overdue: overdueInMonth });
    }
    return months;
  }, [tasks]);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Task Overdue Trend</CardTitle>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block rounded" /> Overdue Tasks</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Completed Tasks</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
            <Line type="monotone" dataKey="overdue" name="Overdue" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} />
            <Line type="monotone" dataKey="completed" name="Completed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}