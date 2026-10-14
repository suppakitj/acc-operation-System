import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';

const PRIORITY = {
  urgent: { label: 'เร่งด่วน', cls: 'bg-red-100 text-red-700' },
  high: { label: 'สูง', cls: 'bg-orange-100 text-orange-700' },
  medium: { label: 'ปานกลาง', cls: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'ต่ำ', cls: 'bg-green-100 text-green-700' },
};

export default function BoardTaskCard({ task, today, actions = [], busy }) {
  const overdue = task.due_date && task.due_date < today && !['completed', 'cancelled'].includes(task.status);
  const p = PRIORITY[task.priority] || PRIORITY.medium;
  return (
    <Card className="p-3 space-y-2">
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {task.customer_name && <p className="text-xs text-muted-foreground">{task.customer_name}</p>}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge variant="outline" className={p.cls}>{p.label}</Badge>
        {task.department && <Badge variant="outline">{task.department}</Badge>}
        {task.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
            <Calendar className="w-3 h-3" />{task.due_date}{overdue && ' (เลยกำหนด)'}
          </span>
        )}
      </div>
      {actions.length > 0 && (
        <div className="flex gap-2 pt-1">
          {actions.map(a => (
            <Button key={a.key} size="sm" variant={a.variant || 'default'} className="flex-1 h-9" disabled={busy} onClick={a.onClick}>
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}{a.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}