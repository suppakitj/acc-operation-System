import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { differenceInDays } from 'date-fns';

const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_WEIGHT = { pending: 3, in_progress: 2, review: 1 };

function computeLevel(task, today) {
  if (!task.due_date) return null;
  const daysLeft = differenceInDays(new Date(task.due_date), today);
  const priorityW = PRIORITY_WEIGHT[task.priority] || 2;
  const statusW = STATUS_WEIGHT[task.status] || 2;
  const checklist = task.checklist || [];
  const progress = checklist.length > 0 ? checklist.filter(c => c.checked).length / checklist.length : 0;
  const changePenalty = Math.min((task.due_date_change_count || 0) * 0.15, 0.6);

  let score = 0;
  if (daysLeft <= 0) score += 50;
  else if (daysLeft <= 1) score += 40;
  else if (daysLeft <= 3) score += 30;
  else if (daysLeft <= 7) score += 20;
  else if (daysLeft <= 14) score += 10;
  else score += 5;
  score += (1 - progress) * 20;
  score += priorityW * 4;
  score += statusW * 3;
  score += changePenalty * 15;
  score = Math.min(100, Math.round(score));

  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

const COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const LABELS = { critical: 'วิกฤต', high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' };

export default function RiskDistributionChart({ tasks }) {
  const today = new Date();

  const data = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    tasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date).forEach(t => {
      const level = computeLevel(t, today);
      if (level) counts[level]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: LABELS[key], value, key }));
  }, [tasks]);

  if (data.length === 0) return null;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {data.map(d => <Cell key={d.key} fill={COLORS[d.key]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}