import React from 'react';
import { Card } from '@/components/ui/card';
import { ClipboardList, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

function formatDuration(mins) {
  if (!mins) return '0 ชม.';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m > 0 ? `${m} น.` : ''}`;
}

export default function CustomerProfileStats({ tasks, timeEntries }) {
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    return t.due_date && new Date(t.due_date) < new Date();
  }).length;
  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  const stats = [
    { label: 'งานทั้งหมด', value: totalTasks, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { label: 'กำลังดำเนินการ', value: activeTasks, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'เสร็จแล้ว', value: completedTasks, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'เกินกำหนด', value: overdueTasks, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'เวลารวม', value: formatDuration(totalMinutes), icon: Clock, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map(s => (
        <Card key={s.label} className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-bold">{s.value}</p>
          <p className="text-[10px] text-muted-foreground">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}