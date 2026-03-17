import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, Users, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { differenceInDays, subDays, format } from 'date-fns';

export default function TeamSummaryCards({ tasks }) {
  const stats = useMemo(() => {
    const now = new Date();
    const active = tasks.filter(t => t.status !== 'cancelled');
    const completed = active.filter(t => t.status === 'completed');
    const open = active.filter(t => t.status !== 'completed');
    const overdue = open.filter(t => t.due_date && new Date(t.due_date) < now);

    // Completion rate
    const rate = active.length > 0 ? Math.round((completed.length / active.length) * 100) : 0;

    // Avg completion time
    const withDates = completed.filter(t => t.completed_date && t.created_date);
    const avgDays = withDates.length > 0
      ? Math.round((withDates.reduce((s, t) => s + Math.max(0, differenceInDays(new Date(t.completed_date), new Date(t.created_date.slice(0, 10)))), 0) / withDates.length) * 10) / 10
      : 0;

    // Unique assignees
    const assignees = new Set(active.filter(t => t.assigned_to).map(t => t.assigned_to)).size;

    // Last 7 days completed
    const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd');
    const recentCompleted = completed.filter(t => t.completed_date && t.completed_date >= sevenDaysAgo).length;

    return { total: active.length, completed: completed.length, open: open.length, overdue: overdue.length, rate, avgDays, assignees, recentCompleted };
  }, [tasks]);

  const cards = [
    { label: 'Completion Rate', value: `${stats.rate}%`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Avg Completion', value: `${stats.avgDays}d`, icon: Clock, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Members', value: stats.assignees, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Done Last 7d', value: stats.recentCompleted, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Total Tasks', value: stats.total, icon: BarChart3, color: 'text-sky-600 bg-sky-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.color}`}>
              <c.icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold leading-tight">{c.value}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{c.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}