import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfWeek, startOfMonth, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444'];

function fmtCost(value) {
  return `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

export default function CostTimelineChart({ filteredEntries, userCostMap, dateRange }) {
  const data = useMemo(() => {
    if (!filteredEntries.length) return { chartData: [], top5: [] };

    const daySpan = differenceInDays(dateRange.end, dateRange.start);
    const useWeekly = daySpan <= 120;

    // Get top 5 staff by cost
    const staffCostMap = {};
    filteredEntries.forEach(e => {
      const cost = ((e.duration_minutes || 0) / 60) * (userCostMap[e.user_email] || 0);
      staffCostMap[e.user_email] = (staffCostMap[e.user_email] || 0) + cost;
    });
    const top5 = Object.entries(staffCostMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email]) => email);

    // Get unique user names
    const nameMap = {};
    filteredEntries.forEach(e => {
      if (!nameMap[e.user_email]) nameMap[e.user_email] = e.user_name || e.user_email;
    });

    // Group by period
    const bucketMap = {};
    filteredEntries.forEach(e => {
      if (!top5.includes(e.user_email)) return;
      const d = new Date(e.start_time);
      const bucketDate = useWeekly ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d);
      const key = format(bucketDate, 'yyyy-MM-dd');
      if (!bucketMap[key]) bucketMap[key] = { date: key, label: useWeekly ? format(bucketDate, 'd MMM', { locale: th }) : format(bucketDate, 'MMM yy', { locale: th }) };
      const cost = ((e.duration_minutes || 0) / 60) * (userCostMap[e.user_email] || 0);
      bucketMap[key][e.user_email] = (bucketMap[key][e.user_email] || 0) + Math.round(cost);
    });

    const chartData = Object.values(bucketMap).sort((a, b) => a.date.localeCompare(b.date));
    return { chartData, top5: top5.map(email => ({ email, name: nameMap[email] || email })) };
  }, [filteredEntries, userCostMap, dateRange]);

  if (data.chartData.length < 2) return null;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">ต้นทุนรายช่วงเวลา (Top 5)</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [fmtCost(v), 'ต้นทุน']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            {data.top5.map((staff, i) => (
              <Line key={staff.email} type="monotone" dataKey={staff.email} name={staff.name}
                stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}