import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Clock, UserCheck, Activity } from 'lucide-react';
import { format } from 'date-fns';

const ICONS = {
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  overdue: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  review: { icon: UserCheck, color: 'text-purple-500', bg: 'bg-purple-50' },
};

export default function RecentActivity({ tasks }) {
  const recent = tasks
    .filter(t => t.status !== 'cancelled')
    .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
    .slice(0, 6);

  const getActivityLabel = (task) => {
    const today = new Date();
    if (task.status === 'completed') return `${task.assigned_name || '-'} completed "${task.title}"`;
    if (task.due_date && new Date(task.due_date) < today && task.status !== 'completed') return `Overdue: ${task.assigned_name || '-'} — ${task.title}`;
    if (task.status === 'review') return `${task.title} — Pending Review`;
    return `${task.assigned_name || '-'} assigned to "${task.title}"`;
  };

  const getType = (task) => {
    const today = new Date();
    if (task.status === 'completed') return 'completed';
    if (task.due_date && new Date(task.due_date) < today) return 'overdue';
    return task.status;
  };

  return (
    <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[340px]">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีกิจกรรม</p>
        ) : (
          <div className="space-y-1">
            {recent.map(task => {
              const type = getType(task);
              const cfg = ICONS[type] || ICONS.pending;
              const Icon = cfg.icon;
              return (
                <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug">{getActivityLabel(task)}</p>
                    {task.customer_name && <p className="text-[10px] text-muted-foreground mt-0.5">{task.customer_name}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap mt-0.5">
                    {format(new Date(task.updated_date || task.created_date), 'd MMM HH:mm')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}