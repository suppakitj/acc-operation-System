import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Target } from 'lucide-react';

export default function CompletionRateDonut({ tasks }) {
  const active = tasks.filter(t => t.status !== 'cancelled');
  const completed = active.filter(t => t.status === 'completed').length;
  const total = active.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = 100 - rate;
  const isAboveTarget = rate >= 80;

  const data = [
    { name: 'Completed', value: rate },
    { name: 'Remaining', value: remaining },
  ];

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-500" />
          Task Completion Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-2">
        <div className="relative w-[160px] h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={isAboveTarget ? '#22c55e' : '#f59e0b'} />
                <Cell fill="#f1f5f9" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${isAboveTarget ? 'text-emerald-600' : 'text-amber-600'}`}>{rate}%</span>
            <span className="text-[10px] text-muted-foreground">completion</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Done {completed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-200" />
            <span className="text-muted-foreground">Remaining {total - completed}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAboveTarget ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          Target 80%
        </p>
      </CardContent>
    </Card>
  );
}