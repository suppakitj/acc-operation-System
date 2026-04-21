import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { CalendarClock, AlertTriangle, Users, TrendingUp } from 'lucide-react';

export default function PostponeSummaryCards({ tasks, postpones }) {
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const postponedTasks = tasks.filter(t => (t.due_date_change_count || 0) > 0).length;
    const totalPostpones = postpones.length;
    const redFlagTasks = tasks.filter(t => (t.due_date_change_count || 0) >= 3).length;
    const postponeRate = totalTasks > 0 ? ((postponedTasks / totalTasks) * 100).toFixed(1) : '0';
    const avgSlippage = postpones.length > 0
      ? (postpones.reduce((s, p) => {
          if (p.old_due_date && p.new_due_date) {
            return s + Math.max(0, Math.round((new Date(p.new_due_date) - new Date(p.old_due_date)) / 86400000));
          }
          return s;
        }, 0) / postpones.length).toFixed(1)
      : '0';

    const pendingRequests = tasks.filter(t => t.pending_due_change).length;

    return [
      { label: 'งานที่เลื่อน', value: postponedTasks, sub: `จาก ${totalTasks} งาน (${postponeRate}%)`, icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'จำนวนครั้งที่เลื่อน', value: totalPostpones, sub: `เฉลี่ย ${avgSlippage} วัน/ครั้ง`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Red Flag (≥3 ครั้ง)', value: redFlagTasks, sub: 'งานที่เลื่อนบ่อยเกินไป', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
      { label: 'รออนุมัติ', value: pendingRequests, sub: 'คำขอเลื่อนที่ยังไม่ดำเนินการ', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];
  }, [tasks, postpones]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => (
        <Card key={s.label} className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
            <div className={`p-2 rounded-lg ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}