import React from 'react';
import { ClipboardList, AlertTriangle, Clock, Inbox, Search, CheckCircle2, PlayCircle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

const VARIANTS = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
};
const ICON_COLORS = {
  blue: 'text-blue-500', red: 'text-red-500', yellow: 'text-yellow-500',
  orange: 'text-orange-500', purple: 'text-purple-500', green: 'text-green-500',
  slate: 'text-slate-500',
};

export default function TaskStatsRow({ tasks }) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = format(now, 'yyyy-MM-dd');
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const pending = tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const overdue = active.filter(t => t.due_date && new Date(t.due_date) < todayStart).length;
  const due3 = active.filter(t => { if (!t.due_date) return false; const d = differenceInDays(new Date(t.due_date), todayStart); return d >= 0 && d <= 3; }).length;
  const waitingApprove = tasks.filter(t => t.status === 'review').length;
  const completedToday = tasks.filter(t => t.completed_date === todayStr).length;

  const stats = [
    { label: 'งานทั้งหมด', value: active.length, icon: ClipboardList, variant: 'blue' },
    { label: 'รอดำเนินการ', value: pending, icon: Inbox, variant: 'slate' },
    { label: 'กำลังทำ', value: inProgress, icon: PlayCircle, variant: 'orange' },
    { label: 'เลยกำหนด', value: overdue, icon: AlertTriangle, variant: 'red' },
    { label: 'ใกล้กำหนด 3 วัน', value: due3, icon: Clock, variant: 'yellow' },
    { label: 'รอ Approve', value: waitingApprove, icon: Search, variant: 'purple' },
    { label: 'เสร็จวันนี้', value: completedToday, icon: CheckCircle2, variant: 'green' },
  ];

  return (
    <div className="grid grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
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