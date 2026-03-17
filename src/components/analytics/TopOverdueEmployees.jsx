import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function TopOverdueEmployees({ tasks }) {
  const currentYear = new Date().getFullYear();

  const data = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return;
      if (!t.due_date || !t.assigned_to) return;
      const dueDate = new Date(t.due_date);
      if (dueDate.getFullYear() !== currentYear) return;
      if (dueDate >= new Date()) return; // not overdue yet

      const key = t.assigned_to;
      if (!map[key]) map[key] = { name: t.assigned_name || t.assigned_to, email: t.assigned_to, count: 0 };
      map[key].count++;
    });

    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [tasks, currentYear]);

  const maxCount = data.length > 0 ? data[0].count : 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Top 5 Overdue — {currentYear}
            </CardTitle>
            <p className="text-xs text-muted-foreground">พนักงานที่มีงาน overdue มากที่สุดในปีนี้</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">🎉 ไม่มีงาน overdue ในปี {currentYear}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((emp, i) => (
              <div key={emp.email} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  i === 0 ? 'bg-red-100 text-red-700' :
                  i === 1 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{emp.name}</span>
                    <span className="text-xs font-bold text-destructive shrink-0 ml-2">{emp.count} งาน</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-destructive/70 transition-all"
                      style={{ width: `${(emp.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}