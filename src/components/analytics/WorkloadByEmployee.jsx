import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';

export default function WorkloadByEmployee({ tasks }) {
  const [viewBy, setViewBy] = useState('employee'); // employee | department

  const data = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status !== 'cancelled');

    if (viewBy === 'department') {
      const map = {};
      activeTasks.forEach(t => {
        const key = t.department || 'Unassigned';
        if (!map[key]) map[key] = { name: key, open: 0, completed: 0, overdue: 0 };
        if (t.status === 'completed') map[key].completed++;
        else {
          map[key].open++;
          if (t.due_date && new Date(t.due_date) < new Date()) map[key].overdue++;
        }
      });
      return Object.values(map).sort((a, b) => (b.open + b.completed) - (a.open + a.completed));
    }

    // by employee
    const map = {};
    activeTasks.forEach(t => {
      const key = t.assigned_name || t.assigned_to || 'Unassigned';
      if (!map[key]) map[key] = { name: key, open: 0, completed: 0, overdue: 0 };
      if (t.status === 'completed') map[key].completed++;
      else {
        map[key].open++;
        if (t.due_date && new Date(t.due_date) < new Date()) map[key].overdue++;
      }
    });
    return Object.values(map).sort((a, b) => (b.open + b.completed) - (a.open + a.completed)).slice(0, 15);
  }, [tasks, viewBy]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">Workload Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Open, completed & overdue tasks</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={viewBy === 'employee' ? 'default' : 'ghost'}
              size="sm" className="h-6 text-[11px] px-2"
              onClick={() => setViewBy('employee')}
            >By Employee</Button>
            <Button
              variant={viewBy === 'department' ? 'default' : 'ghost'}
              size="sm" className="h-6 text-[11px] px-2"
              onClick={() => setViewBy('department')}
            >By Department</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks available</p>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name="Open" fill="hsl(var(--chart-2))" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={32} />
                <Bar dataKey="completed" name="Completed" fill="hsl(var(--chart-3))" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={32} />
                <Bar dataKey="overdue" name="Overdue" fill="hsl(var(--destructive))" stackId="b" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}