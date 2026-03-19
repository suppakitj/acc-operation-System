import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Task Completion Rate</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-4">
        <div className="relative w-[170px] h-[170px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={78}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={isAboveTarget ? '#22c55e' : '#f59e0b'} />
                <Cell fill="#e5e7eb" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${isAboveTarget ? 'text-emerald-600' : 'text-amber-600'}`}>{rate}%</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isAboveTarget ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          Target 80%
        </p>
      </CardContent>
    </Card>
  );
}