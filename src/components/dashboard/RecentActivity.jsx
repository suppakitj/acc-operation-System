import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

const ICONS = {
  completed: { icon: CheckCircle2, color: 'text-green-500' },
  overdue: { icon: AlertTriangle, color: 'text-red-500' },
  in_progress: { icon: Clock, color: 'text-blue-500' },
  pending: { icon: Clock, color: 'text-yellow-500' },
  review: { icon: User, color: 'text-purple-500' },
};

export default function RecentActivity({ tasks }) {
  const recent = tasks
    .filter(t => t.status !== 'cancelled')
    .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
    .slice(0, 6);

  const getActivityLabel = (task) => {
    const today = new Date();
    if (task.status === 'completed') return `${task.assigned_name || '-'} completed "${task.title}"`;
    if (task.due_date && new Date(task.due_date) < today && task.status !== 'completed') return `Overdue: ${task.assigned_name || '-'} - ${task.title}`;
    if (task.status === 'review') return `${task.title} Pending Review`;
    return `${task.assigned_name || '-'} assigned to "${task.title}"`;
  };

  const getType = (task) => {
    const today = new Date();
    if (task.status === 'completed') return 'completed';
    if (task.due_date && new Date(task.due_date) < today) return 'overdue';
    return task.status;
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[320px] space-y-0">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่มีกิจกรรม</p>
        ) : (
          recent.map(task => {
            const type = getType(task);
            const cfg = ICONS[type] || ICONS.pending;
            const Icon = cfg.icon;
            return (
              <div key={task.id} className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug">{getActivityLabel(task)}</p>
                  <p className="text-[10px] text-muted-foreground">{task.customer_name || ''}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                  {format(new Date(task.updated_date || task.created_date), 'd MMM HH:mm')}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}