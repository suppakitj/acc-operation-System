import React from 'react';
import { Badge } from '@/components/ui/badge';

function formatHours(mins) {
  if (!mins) return '0';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m > 0 ? `${m} น.` : ''}`;
}

export default function TimeByEmployeeTable({ entries }) {
  const completed = entries.filter(e => !e.is_running && e.duration_minutes);

  const byEmployee = {};
  completed.forEach(e => {
    const key = e.user_email || '_none';
    if (!byEmployee[key]) byEmployee[key] = { name: e.user_name || e.user_email || '?', totalMinutes: 0, taskCount: new Set(), entryCount: 0 };
    byEmployee[key].totalMinutes += e.duration_minutes || 0;
    byEmployee[key].taskCount.add(e.task_id);
    byEmployee[key].entryCount++;
  });

  const rows = Object.entries(byEmployee)
    .map(([id, data]) => ({ id, ...data, taskCount: data.taskCount.size }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const maxMinutes = rows.length > 0 ? rows[0].totalMinutes : 1;

  if (rows.length === 0) return <div className="text-center py-6 text-muted-foreground text-sm">ไม่มีข้อมูล</div>;

  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">{row.name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{row.name}</p>
            <p className="text-[10px] text-muted-foreground">{row.taskCount} tasks · {row.entryCount} entries</p>
          </div>
          <div className="w-24 md:w-40 hidden sm:block">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent/60 rounded-full" style={{ width: `${(row.totalMinutes / maxMinutes) * 100}%` }} />
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">{formatHours(row.totalMinutes)}</Badge>
        </div>
      ))}
    </div>
  );
}