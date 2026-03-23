import React from 'react';
import { ClipboardList, AlertTriangle, Clock, Timer, Pause, CheckCircle2 } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

const VARIANTS = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  green: 'bg-green-50 border-green-200 text-green-700',
};
const ICON_COLORS = {
  blue: 'text-blue-500', red: 'text-red-500', yellow: 'text-yellow-500',
  orange: 'text-orange-500', purple: 'text-purple-500', green: 'text-green-500',
};

export default function TaskStatsRow({ tasks }) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const overdue = active.filter(t => t.due_date && new Date(t.due_date) < todayStart).length;
  const due3 = active.filter(t => { if (!t.due_date) return false; const d = differenceInDays(new Date(t.due_date), todayStart); return d >= 0 && d <= 3; }).length;
  const due7 = active.filter(t => { if (!t.due_date) return false; const d = differenceInDays(new Date(t.due_date), todayStart); return d >= 0 && d <= 7; }).length;
  const waiting = tasks.filter(t => t.status === 'review').length;
  const completedToday = tasks.filter(t => t.completed_date === format(now, 'yyyy-MM-dd')).length;

  const stats = [
    { label: 'OPEN TASKS', value: active.length, icon: ClipboardList, variant: 'blue' },
    { label: 'OVERDUE', value: overdue, icon: AlertTriangle, variant: 'red' },
    { label: 'DUE IN 3 DAYS', value: due3, icon: Clock, variant: 'yellow' },
    { label: 'DUE IN 7 DAYS', value: due7, icon: Timer, variant: 'orange' },
    { label: 'WAITING', value: waiting, icon: Pause, variant: 'purple' },
    { label: 'COMPLETED TODAY', value: completedToday, icon: CheckCircle2, variant: 'green' },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
      {stats.map(s => (
        <div key={s.label} className={cn('rounded-xl border p-2.5 md:p-3', VARIANTS[s.variant])}>
          <div className="flex items-center justify-between">
            <p className="text-[9px] md:text-[10px] font-medium uppercase tracking-wide opacity-80 truncate">{s.label}</p>
            <s.icon className={cn('w-3.5 h-3.5 md:w-4 md:h-4 shrink-0', ICON_COLORS[s.variant])} />
          </div>
          <p className="text-xl md:text-2xl font-bold mt-0.5">{s.value}</p>
        </div>
      ))}
    </div>
  );
}