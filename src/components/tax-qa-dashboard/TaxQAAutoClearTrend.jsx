import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TaxQAAutoClearTrend() {
  // Last 6 months of filings
  const periods = useMemo(() => {
    const now = new Date();
    const ps = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      ps.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return ps;
  }, []);

  const { data: allFilings = [], isLoading } = useQuery({
    queryKey: ['taxqa_autoclear_trend', periods],
    queryFn: async () => {
      const all = [];
      for (const p of periods) {
        const batch = await base44.entities.TaxQA_Filing.filter({ tax_period: p }, '-created_date', 500);
        all.push(...batch.map(f => ({ ...f, _period: p })));
      }
      return all;
    },
  });

  const chartData = useMemo(() => {
    return periods.map(p => {
      const inPeriod = allFilings.filter(f => f._period === p);
      const total = inPeriod.length;
      const autoClear = inPeriod.filter(f => f.status === 'clean' || f.status === 'approved' || f.status === 'filed').length;
      const rate = total ? Math.round((autoClear / total) * 100) : 0;
      return { period: p, total, autoClear, rate };
    });
  }, [allFilings, periods]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Auto-clear Rate Trend (KPI หลัก)</CardTitle>
        <CardDescription>สัดส่วน filing ที่ผ่าน clean/approved/filed เทียบทั้งหมด — รายเดือน</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v, n) => n === 'rate' ? `${v}%` : v} />
              <Line type="monotone" dataKey="rate" stroke="hsl(var(--success))" strokeWidth={3} dot={{ r: 5 }} name="Auto-clear %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}