import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

const STATUS_LABELS = {
  pending: 'รอ',
  in_progress: 'ทำอยู่',
  review: 'ตรวจ',
};

export default function WorkloadCard({ person, onTaskClick, onReassign }) {
  const { name, email, department, position, maxTasks, activeTasks, overdueTasks } = person;
  const utilization = maxTasks > 0 ? Math.round((activeTasks.length / maxTasks) * 100) : 0;
  const isOverloaded = activeTasks.length > maxTasks;
  const isLight = activeTasks.length <= maxTasks * 0.4;

  let statusColor = 'border-emerald-300 bg-emerald-50/50';
  let statusLabel = 'ว่าง';
  let StatusIcon = CheckCircle2;
  if (isOverloaded) {
    statusColor = 'border-red-300 bg-red-50/50';
    statusLabel = 'เกิน Capacity';
    StatusIcon = AlertTriangle;
  } else if (utilization > 80) {
    statusColor = 'border-amber-300 bg-amber-50/50';
    statusLabel = 'ใกล้เต็ม';
    StatusIcon = Clock;
  } else if (utilization > 40) {
    statusColor = 'border-blue-200 bg-blue-50/30';
    statusLabel = 'ปกติ';
    StatusIcon = User;
  }

  const progressColor = isOverloaded ? 'bg-red-500' : utilization > 80 ? 'bg-amber-500' : utilization > 40 ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <div className={cn('rounded-xl border p-4 transition-all hover:shadow-md', statusColor)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{name || email?.split('@')[0]}</p>
              <p className="text-[10px] text-muted-foreground truncate">{position || department || '-'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">{statusLabel}</span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-muted-foreground">
            {activeTasks.length} / {maxTasks} งาน ({utilization}%)
          </span>
          {overdueTasks > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
              {overdueTasks} เกินกำหนด
            </Badge>
          )}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', progressColor)} style={{ width: `${Math.min(utilization, 100)}%` }} />
        </div>
      </div>

      {/* Task list */}
      {activeTasks.length > 0 ? (
        <div className="space-y-1 max-h-[160px] overflow-y-auto">
          {activeTasks.slice(0, 8).map(task => (
            <div
              key={task.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/60 hover:bg-white text-[11px] cursor-pointer group"
              onClick={() => onTaskClick?.(task)}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('task', JSON.stringify(task))}
            >
              <Badge className={cn('text-[8px] px-1 py-0 h-3.5 shrink-0', PRIORITY_COLORS[task.priority] || 'bg-muted')}>
                {task.priority?.charAt(0)?.toUpperCase()}
              </Badge>
              <span className="truncate flex-1">{task.title}</span>
              <span className="text-[9px] text-muted-foreground shrink-0">{STATUS_LABELS[task.status] || task.status}</span>
            </div>
          ))}
          {activeTasks.length > 8 && (
            <p className="text-[10px] text-muted-foreground text-center">+{activeTasks.length - 8} งานอื่น</p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center py-2">ไม่มีงาน active</p>
      )}

      {/* Drop zone */}
      <div
        className="mt-2 border-2 border-dashed border-muted-foreground/20 rounded-lg py-1.5 text-center text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const task = JSON.parse(e.dataTransfer.getData('task'));
          onReassign?.(task, email);
        }}
      >
        ลากงานมาวางเพื่อ assign
      </div>
    </div>
  );
}