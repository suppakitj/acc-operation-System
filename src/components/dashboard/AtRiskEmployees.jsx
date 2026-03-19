import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function AtRiskEmployees({ tasks }) {
  const today = new Date();

  const atRisk = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'completed' || t.status === 'cancelled') return;
      if (!t.due_date) return;
      const dueDate = new Date(t.due_date);
      if (dueDate >= today) return; // not overdue

      if (!map[t.assigned_to]) {
        map[t.assigned_to] = { name: t.assigned_name || t.assigned_to, overdue: 0, totalDelay: 0 };
      }
      map[t.assigned_to].overdue++;
      map[t.assigned_to].totalDelay += differenceInDays(today, dueDate);
    });

    return Object.values(map)
      .map(e => ({ ...e, avgDelay: e.overdue > 0 ? (e.totalDelay / e.overdue).toFixed(1) : 0 }))
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" /> At Risk Employees
        </CardTitle>
      </CardHeader>
      <CardContent>
        {atRisk.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่มีพนักงานที่มีงานเกินกำหนด</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left py-2 font-medium">Employee</th>
                <th className="text-right py-2 font-medium">Overdue</th>
                <th className="text-right py-2 font-medium">Avg. Delay</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map(e => (
                <tr key={e.name} className="border-b last:border-b-0">
                  <td className="py-2.5 font-medium truncate max-w-[120px]">{e.name}</td>
                  <td className="py-2.5 text-right font-semibold text-red-600">{e.overdue}</td>
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