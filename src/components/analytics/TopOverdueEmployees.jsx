import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TopOverdueEmployees({ tasks, year }) {
  const data = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.due_date || !t.assigned_name || t.status === 'cancelled') return;
      const dueDate = new Date(t.due_date);
      if (dueDate.getFullYear() !== year) return;

      // Count overdue: completed after due OR still open past due
      let isOverdue = false;
      if (t.status === 'completed' && t.completed_date) {
        isOverdue = new Date(t.completed_date) > dueDate;
      } else if (t.status !== 'completed') {
        isOverdue = new Date() > dueDate;
      }

      const key = t.assigned_to || t.assigned_name;
      if (!map[key]) map[key] = { name: t.assigned_name, email: key, overdue: 0, total: 0 };
      map[key].total++;
      if (isOverdue) map[key].overdue++;
    });

    return Object.values(map)
      .filter(e => e.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue || (b.overdue / b.total) - (a.overdue / a.total))
      .slice(0, 5);
  }, [tasks, year]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Top 5 Overdue — พนักงานที่เกินกำหนดมากสุด ({year})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">🎉 ไม่มีงาน overdue ในปี {year}</p>
        ) : (
          <div className="space-y-3">
            {data.map((emp, i) => {
              const pct = emp.total > 0 ? Math.round((emp.overdue / emp.total) * 100) : 0;
              return (
                <div key={emp.email} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-destructive text-destructive-foreground' :
                    i === 1 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div
                        className="bg-destructive h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="destructive" className="text-[10px]">{emp.overdue} งาน</Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% ของ {emp.total} งาน</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}