import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { differenceInDays } from 'date-fns';

const DEPT_LABELS = {
  management: 'Mgmt',
  accounting: 'Acct',
  consulting: 'Consult',
  audit: 'Audit',
  billing: 'Billing',
  it: 'IT',
};

const BAR_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--info))',
];

export default function AvgCompletionTime({ tasks }) {
  const data = useMemo(() => {
    const deptMap = {};
    tasks.forEach(t => {
      if (t.status !== 'completed' || !t.completed_date || !t.created_date) return;
      const dept = t.department || 'other';
      if (!deptMap[dept]) deptMap[dept] = [];
      const days = differenceInDays(new Date(t.completed_date), new Date(t.created_date.slice(0, 10)));
      if (days >= 0) deptMap[dept].push(days);
    });

    return Object.entries(deptMap).map(([dept, arr]) => ({
      department: DEPT_LABELS[dept] || dept,
      avgDays: arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0,
      count: arr.length,
    })).sort((a, b) => b.avgDays - a.avgDays);
  }, [tasks]);

  const overallAvg = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed' && t.completed_date && t.created_date);
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, t) => {
      return sum + Math.max(0, differenceInDays(new Date(t.completed_date), new Date(t.created_date.slice(0, 10))));
    }, 0);
    return Math.round((total / completed.length) * 10) / 10;
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Avg Completion Time by Dept</CardTitle>
            <p className="text-xs text-muted-foreground">Days from creation to completion</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{overallAvg}</div>
            <div className="text-[10px] text-muted-foreground">days avg</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No completed tasks yet</p>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit=" d" />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value, name) => [`${value} days (${data.find(d => d.avgDays === value)?.count || 0} tasks)`, 'Avg Time']}
                />
                <Bar dataKey="avgDays" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}