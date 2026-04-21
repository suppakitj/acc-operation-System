import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ReworkTrendChart({ tasks, from, to }) {
  const data = useMemo(() => {
    const monthMap = {};
    tasks.forEach(t => {
      (t.submission_cycles || []).forEach(c => {
        if (c.decision !== 'rejected' || !c.decided_at) return;
        const month = c.decided_at.slice(0, 7); // YYYY-MM
        if (!monthMap[month]) monthMap[month] = { month, minor: 0, major: 0, critical: 0, total: 0 };
        const sev = c.severity || 'major';
        if (monthMap[month][sev] !== undefined) monthMap[month][sev]++;
        monthMap[month].total++;
      });
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          แนวโน้มรายเดือน
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">ดูว่าอบรมแล้วดีขึ้นไหม — ส่งกลับควรลดลงทุกเดือน</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 0, right: 10 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => {
                    try { return format(parseISO(v + '-01'), 'MMM yy'); } catch { return v; }
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => {
                    try { return format(parseISO(v + '-01'), 'MMMM yyyy'); } catch { return v; }
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="minor" stackId="a" fill="#22c55e" name="Minor" radius={[0, 0, 0, 0]} />
                <Bar dataKey="major" stackId="a" fill="#eab308" name="Major" radius={[0, 0, 0, 0]} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}