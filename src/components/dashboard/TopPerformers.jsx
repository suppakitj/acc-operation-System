import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

const RANK_STYLES = [
  'bg-amber-100 text-amber-700',
  'bg-slate-100 text-slate-600',
  'bg-orange-100 text-orange-600',
];

export default function TopPerformers({ tasks }) {
  const performers = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'cancelled') return;
      if (!map[t.assigned_to]) map[t.assigned_to] = { name: t.assigned_name || t.assigned_to, completed: 0, total: 0 };
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
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-2">
            {performers.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${RANK_STYLES[i] || 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.completed} completed</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-sm font-bold ${p.efficiency >= 80 ? 'text-emerald-600' : p.efficiency >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {p.efficiency}%
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