import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';

export default function TopPerformers({ tasks, year }) {
  const data = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (t.status !== 'completed' || !t.completed_date || !t.assigned_name || t.status === 'cancelled') return;
      const completedDate = new Date(t.completed_date);
      if (completedDate.getFullYear() !== year) return;

      const key = t.assigned_to || t.assigned_name;
      if (!map[key]) map[key] = { name: t.assigned_name, email: key, completed: 0, onTime: 0, totalDays: 0 };
      map[key].completed++;

      if (t.due_date && completedDate <= new Date(t.due_date)) {
        map[key].onTime++;
      }

      if (t.created_date) {
        const days = Math.max(0, differenceInDays(completedDate, new Date(t.created_date.slice(0, 10))));
        map[key].totalDays += days;
      }
    });

    return Object.values(map)
      .map(e => ({
        ...e,
        onTimeRate: e.completed > 0 ? Math.round((e.onTime / e.completed) * 100) : 0,
        avgDays: e.completed > 0 ? Math.round((e.totalDays / e.completed) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.completed - a.completed || b.onTimeRate - a.onTimeRate)
      .slice(0, 5);
  }, [tasks, year]);

  const medals = ['🥇', '🥈', '🥉', '4', '5'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Top 5 Performer — ทำงานเสร็จมากสุด ({year})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีงานเสร็จในปี {year}</p>
        ) : (
          <div className="space-y-3">
            {data.map((emp, i) => (
              <div key={emp.email} className="flex items-center gap-3">
                <div className="w-7 h-7 flex items-center justify-center text-lg shrink-0">
                  {i < 3 ? medals[i] : (
                    <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">ตรงเวลา {emp.onTimeRate}%</span>
                    <span className="text-[10px] text-muted-foreground">• เฉลี่ย {emp.avgDays} วัน/งาน</span>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 text-[10px] shrink-0">{emp.completed} งาน</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}