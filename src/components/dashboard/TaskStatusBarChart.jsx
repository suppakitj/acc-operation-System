import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const STATUS_MAP = [
  { key: 'pending', label: 'not started', color: '#94a3b8' },
  { key: 'in_progress', label: 'in progress', color: '#3b82f6' },
  { key: 'review', label: 'waiting', color: '#f59e0b' },
  { key: 'completed', label: 'completed', color: '#22c55e' },
];

export default function TaskStatusBarChart({ tasks }) {
  const { t } = useLanguage();

  const overdue = tasks.filter(task => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  }).length;

  const data = STATUS_MAP.map(s => ({
    name: s.label,
    value: tasks.filter(task => task.status === s.key).length,
    color: s.color,
  }));

  data.push({ name: 'overdue', value: overdue, color: '#ef4444' });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <CardTitle className="text-sm md:text-base font-semibold">Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}