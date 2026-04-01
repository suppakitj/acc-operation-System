import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS = {
  urgent: 'border-l-red-500 bg-red-50',
  high: 'border-l-orange-500 bg-orange-50',
  medium: 'border-l-blue-500 bg-blue-50',
  low: 'border-l-gray-400 bg-gray-50',
};

const STATUS_LABELS = {
  pending: 'รอดำเนินการ', in_progress: 'กำลังทำ', review: 'รอตรวจสอบ',
  completed: 'เสร็จแล้ว', cancelled: 'ยกเลิก',
};

export default function DayTaskListPopup({ date, tasks, open, onOpenChange, onTaskClick }) {
  if (!date) return null;
  const dateLabel = format(new Date(date), 'd MMMM yyyy (EEEE)', { locale: th });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{dateLabel}</DialogTitle>
          <p className="text-xs text-muted-foreground">{tasks.length} งาน</p>
        </DialogHeader>
        <div className="overflow-y-auto space-y-1.5 pr-1 -mr-1">
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg border-l-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all",
                PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.customer_name && (
                    <span className="text-[10px] text-muted-foreground truncate">{task.customer_name}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {STATUS_LABELS[task.status] || task.status}
                </Badge>
                {task.assigned_name && (
                  <span className="text-[9px] text-muted-foreground">{task.assigned_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}