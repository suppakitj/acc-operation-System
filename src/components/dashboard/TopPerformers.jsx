import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function TopPerformers({ tasks }) {
  const performers = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'cancelled') return;
      if (!map[t.assigned_to]) {
        map[t.assigned_to] = { name: t.assigned_name || t.assigned_to, completed: 0, total: 0 };
      }
      map[t.assigned_to].total++;
      if (t.status === 'completed') map[t.assigned_to].completed++;
    });

    return Object.values(map)
      .filter(p => p.total >= 3)
      .map(p => ({ ...p, efficiency: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0 }))
      .sort((a, b) => b.completed - a.completed || b.efficiency - a.efficiency)
      .slice(0, 5);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" /> Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูล</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left py-2 font-medium">Rank</th>
                <th className="text-left py-2 font-medium">Employee</th>
                <th className="text-right py-2 font-medium">Completed</th>
                <th className="text-right py-2 font-medium">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {performers.map((p, i) => (
                <tr key={p.name} className="border-b last:border-b-0">
                  <td className="py-2.5 font-semibold">{i + 1}</td>
                  <td className="py-2.5 font-medium truncate max-w-[120px]">{p.name}</td>
                  <td className="py-2.5 text-right">{p.completed}</td>
                  <td className="py-2.5 text-right font-medium text-green-600">{p.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}