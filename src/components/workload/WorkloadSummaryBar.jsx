import React from 'react';
import { Users, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

export default function WorkloadSummaryBar({ people }) {
  const total = people.length;
  const overloaded = people.filter(p => p.activeTasks.length > p.maxTasks).length;
  const light = people.filter(p => p.activeTasks.length <= p.maxTasks * 0.4).length;
  const totalTasks = people.reduce((s, p) => s + p.activeTasks.length, 0);
  const totalCapacity = people.reduce((s, p) => s + p.maxTasks, 0);
  const avgUtil = totalCapacity > 0 ? Math.round((totalTasks / totalCapacity) * 100) : 0;

  const stats = [
    { label: 'พนักงาน', value: total, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Utilization เฉลี่ย', value: `${avgUtil}%`, icon: TrendingUp, color: 'text-primary bg-primary/10' },
    { label: 'ว่าง / รับงานได้', value: light, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'เกิน Capacity', value: overloaded, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
            <s.icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}