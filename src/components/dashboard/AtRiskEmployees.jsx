import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';

const LEGEND = [
  { label: 'Overdue', color: 'bg-amber-400' },
  { label: '', color: 'bg-red-500' },
  { label: '', color: 'bg-red-300' },
];

export default function AtRiskEmployees({ tasks }) {
  const today = new Date();
  const currentYear = today.getFullYear();

  const atRisk = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'cancelled') return;
      if (!t.due_date) return;
      const dueDate = new Date(t.due_date);
      // เฉพาะ tasks ที่ due_date อยู่ในปีปัจจุบัน
      if (dueDate.getFullYear() !== currentYear) return;
      // นับ overdue สะสม: ยังไม่เสร็จแต่เลย due_date, หรือเสร็จหลัง due_date
      const isOverdue = (() => {
        if (t.status !== 'completed' && dueDate < today) return true;
        if (t.status === 'completed' && t.completed_date && new Date(t.completed_date) > dueDate) return true;
        return false;
      })();
      if (!isOverdue) return;
      const completedOrToday = t.completed_date ? new Date(t.completed_date) : today;
      const delay = differenceInDays(completedOrToday, dueDate);
      if (!map[t.assigned_to]) map[t.assigned_to] = { name: t.assigned_name || t.assigned_to, overdue: 0, totalDelay: 0 };
      map[t.assigned_to].overdue++;
      map[t.assigned_to].totalDelay += delay;
    });
    return Object.values(map)
      .map(e => ({ ...e, avgDelay: e.overdue > 0 ? (e.totalDelay / e.overdue).toFixed(1) : 0 }))
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5);
  }, [tasks, currentYear]);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Top 5 Overdue — พนักงานที่เกินกำหนดมากสุด ({new Date().getFullYear()})</CardTitle>
          <div className="flex items-center gap-2">
            {LEGEND.map((l, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${l.color}`} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {atRisk.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีพนักงานที่มีงานเกินกำหนด</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">Employee</th>
                <th className="text-right py-2 font-medium">Overdue Tasks</th>
                <th className="text-right py-2 font-medium">Avg. Delay</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map(e => (
                <tr key={e.name} className="border-b last:border-b-0">
                  <td className="py-2.5 font-medium truncate max-w-[140px]">{e.name}</td>
                  <td className="py-2.5 text-right font-semibold">{e.overdue}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{e.avgDelay} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}