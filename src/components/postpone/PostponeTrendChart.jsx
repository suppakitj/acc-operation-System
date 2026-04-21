import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function PostponeTrendChart({ postpones, from, to }) {
  const data = useMemo(() => {
    const map = {};
    postpones.forEach(p => {
      const date = p.changed_at?.slice(0, 7); // yyyy-MM
      if (!date) return;
      map[date] = (map[date] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({
        month,
        label: format(new Date(month + '-01'), 'MMM yy'),
        count,
      }));
  }, [postpones]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" /> แนวโน้มการเลื่อนรายเดือน
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground text-center py-8">ไม่มีข้อมูล</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" /> แนวโน้มการเลื่อนรายเดือน
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [`${v} ครั้ง`, 'จำนวนเลื่อน']} contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}