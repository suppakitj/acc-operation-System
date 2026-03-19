import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function CompletionRateDonut({ tasks }) {
  const active = tasks.filter(t => t.status !== 'cancelled');
  const completed = active.filter(t => t.status === 'completed').length;
  const total = active.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = 100 - rate;

  const data = [
    { name: 'Completed', value: rate },
    { name: 'Remaining', value: remaining },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Task Completion Rate</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-[180px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill="#22c55e" />
                <Cell fill="#e5e7eb" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-green-600">{rate}%</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Target 80%</p>
        <p className="text-xs text-muted-foreground">{completed} / {total} งานเสร็จ</p>
      </CardContent>
    </Card>
  );
}