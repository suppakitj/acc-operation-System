import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function TopPerformersMonthly({ tasks }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthLabel = format(today, 'MMMM yyyy', { locale: th });

  const performers = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'cancelled') return;
      // Filter: completed_date ในเดือนปัจจุบัน
      if (t.status === 'completed' && t.completed_date) {
        const cd = new Date(t.completed_date);
        if (cd.getMonth() === currentMonth && cd.getFullYear() === currentYear) {
          if (!map[t.assigned_to]) map[t.assigned_to] = { name: t.assigned_name || t.assigned_to, completed: 0 };
          map[t.assigned_to].completed++;
        }
      }
    });
    return Object.values(map)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
  }, [tasks, currentMonth, currentYear]);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Top Performers — ประจำเดือน ({monthLabel})</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {performers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium w-10">Rank</th>
                <th className="text-left py-2 font-medium">Employee</th>
                <th className="text-right py-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {performers.map((p, i) => (
                <tr key={p.name} className="border-b last:border-b-0">
                  <td className="py-2.5 font-semibold text-center">{i + 1}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-medium">{p.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}