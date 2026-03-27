import React from 'react';
import { Clock, Users, Building2, TrendingUp } from 'lucide-react';

function formatHours(mins) {
  if (!mins) return '0 ชม.';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m > 0 ? `${m} น.` : ''}`;
}

export default function TimeTrackingStats({ entries }) {
  const completed = entries.filter(e => !e.is_running && e.duration_minutes);
  const totalMinutes = completed.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const uniqueTasks = new Set(completed.map(e => e.task_id)).size;
  const uniqueCustomers = new Set(completed.filter(e => e.customer_id).map(e => e.customer_id)).size;
  const avgPerTask = uniqueTasks > 0 ? totalMinutes / uniqueTasks : 0;

  const stats = [
    { label: 'เวลารวม', value: formatHours(totalMinutes), icon: Clock, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'จำนวน Tasks', value: uniqueTasks, icon: TrendingUp, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'ลูกค้า', value: uniqueCustomers, icon: Building2, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'เฉลี่ย/Task', value: formatHours(avgPerTask), icon: Users, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${s.color}`}>
          <s.icon className="w-4 h-4 shrink-0" />
          <div>
            <p className="text-lg font-bold leading-tight">{s.value}</p>
            <p className="text-[10px] opacity-70">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}