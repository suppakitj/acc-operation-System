import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useLanguage } from '../LanguageContext';

const STATUS_COLORS = {
  pending: '#94a3b8', in_progress: '#3b82f6', review: '#f59e0b',
  completed: '#22c55e', cancelled: '#ef4444',
};

export default function TaskStatusChart({ tasks }) {
  const { t } = useLanguage();

  const statusCounts = {};
  tasks.forEach(task => { statusCounts[task.status] = (statusCounts[task.status] || 0) + 1; });

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: t(`status_${status}`),
    value: count,
    color: STATUS_COLORS[status] || '#94a3b8',
  }));

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{t('task_status')}</CardTitle></CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">{t('no_data')}</div>
        )}
      </CardContent>
    </Card>
  );
}