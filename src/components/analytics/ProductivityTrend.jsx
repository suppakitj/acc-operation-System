import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function ProductivityTrend({ tasks }) {
  const data = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = format(startOfMonth(d), 'yyyy-MM-dd');
      const me = format(endOfMonth(d), 'yyyy-MM-dd');
      const label = format(d, 'MMM yy');

      const created = tasks.filter(t => t.created_date && t.created_date.slice(0, 10) >= ms && t.created_date.slice(0, 10) <= me).length;
      const completed = tasks.filter(t => t.completed_date && t.completed_date >= ms && t.completed_date <= me).length;

      months.push({ month: label, created, completed });
    }
    return months;
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Team Productivity (6 Months)</CardTitle>
        <p className="text-xs text-muted-foreground">Tasks created vs completed per month</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="created" name="Created" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}