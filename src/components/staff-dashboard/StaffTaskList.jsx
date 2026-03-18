import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
};

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังทำ',
  review: 'รอตรวจสอบ',
  completed: 'เสร็จแล้ว',
};

const PRIORITY_DOTS = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
};

export default function StaffTaskList({ pendingTasks, completedTasks, overdueTasks }) {
  const [tab, setTab] = useState('pending');
  const today = new Date();

  const tabs = [
    { key: 'pending', label: `ค้าง (${pendingTasks.length})` },
    { key: 'overdue', label: `เกินกำหนด (${overdueTasks.length})` },
    { key: 'completed', label: `เสร็จเดือนนี้ (${completedTasks.length})` },
  ];

  const currentList = tab === 'pending' ? pendingTasks : tab === 'overdue' ? overdueTasks : completedTasks;

  return (
    <div>
      <div className="flex gap-1 mb-3 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
              tab === t.key
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {currentList.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">ไม่มีรายการ</p>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {currentList.map(task => {
            const daysOver = task.due_date ? differenceInDays(today, new Date(task.due_date)) : null;
            const isOverdue = daysOver !== null && daysOver > 0 && task.status !== 'completed';

            return (
              <div key={task.id} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOTS[task.priority] || PRIORITY_DOTS.medium}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.customer_name && (
                      <span className="text-[10px] text-muted-foreground truncate">{task.customer_name}</span>
                    )}
                    {task.due_date && (
                      <span className={`text-[10px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        {isOverdue ? `เกิน ${daysOver} วัน` : format(new Date(task.due_date), 'dd MMM')}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_STYLES[task.status] || ''}`}>
                  {STATUS_LABELS[task.status] || task.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}