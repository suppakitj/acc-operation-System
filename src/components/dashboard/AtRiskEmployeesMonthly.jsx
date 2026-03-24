import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays, format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function AtRiskEmployeesMonthly({ tasks }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthLabel = format(today, 'MMMM yyyy', { locale: th });
  const todayStart = new Date(currentYear, today.getMonth(), today.getDate());

  const atRisk = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'cancelled') return;
      if (!t.due_date) return;
      const dueDate = new Date(t.due_date);
      // เฉพาะ due_date ในเดือนปัจจุบัน
      if (dueDate.getMonth() !== currentMonth || dueDate.getFullYear() !== currentYear) return;

      // นับเฉพาะงานที่ยังไม่เสร็จและเลย due_date แล้ว (completed ไม่นับ)
      if (t.status === 'completed') return;
      if (dueDate >= todayStart) return;

      const delay = differenceInDays(today, dueDate);
      if (!map[t.assigned_to]) map[t.assigned_to] = { name: t.assigned_name || t.assigned_to, overdue: 0, totalDelay: 0 };
      map[t.assigned_to].overdue++;
      map[t.assigned_to].totalDelay += delay;
    });
    return Object.values(map)
      .map(e => ({ ...e, avgDelay: e.overdue > 0 ? (e.totalDelay / e.overdue).toFixed(1) : 0 }))
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5);
  }, [tasks, currentMonth, currentYear]);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Top 5 Overdue — ประจำเดือน ({monthLabel})</CardTitle>
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