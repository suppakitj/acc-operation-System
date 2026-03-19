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
      if (dueDate >= today) return;
      if (!map[t.assigned_to]) map[t.assigned_to] = { name: t.assigned_name || t.assigned_to, overdue: 0, totalDelay: 0 };
      map[t.assigned_to].overdue++;
      map[t.assigned_to].totalDelay += differenceInDays(today, dueDate);
    });
    return Object.values(map)
      .map(e => ({ ...e, avgDelay: e.overdue > 0 ? (e.totalDelay / e.overdue).toFixed(1) : 0 }))
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5);
  }, [tasks]);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          At Risk Employees
        </CardTitle>
      </CardHeader>
      <CardContent>
        {atRisk.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีพนักงานที่มีงานเกินกำหนด</p>
        ) : (
          <div className="space-y-2">
            {atRisk.map(e => (
              <div key={e.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50/50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground">avg {e.avgDelay} days late</p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    {e.overdue} overdue
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}