import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';

export default function KpiTrendChart({ tasks }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = endOfMonth(subMonths(now, i));
      const label = format(mStart, 'MMM yy', { locale: th });

      const completed = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completed_date) return false;
        const d = new Date(t.completed_date);
        return d >= mStart && d <= mEnd;
      });

      const onTime = completed.filter(t => t.due_date && t.completed_date <= t.due_date);
      const onTimeRate = completed.length > 0 ? (onTime.length / completed.length) * 100 : 0;

      const allInMonth = tasks.filter(t => {
        const ref = t.start_date || t.created_date;
        if (!ref) return false;
        const d = new Date(ref);
        return d >= mStart && d <= mEnd;
      });
      const changed = allInMonth.filter(t => (t.due_date_change_count || 0) >= 1);
      const changeRate = allInMonth.length > 0 ? (changed.length / allInMonth.length) * 100 : 0;

      months.push({ label, onTimeRate: Math.round(onTimeRate * 10) / 10, changeRate: Math.round(changeRate * 10) / 10 });
    }
    return months;
  }, [tasks]);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">KPI Trend (6 เดือน)</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(v, name) => [`${v}%`, name]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Line type="monotone" dataKey="onTimeRate" name="On-Time Rate" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="changeRate" name="Due Date Change Rate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}