import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TaxQAErrorFrequency({ period }) {
  // Get filings for this period, then their flags
  const { data: filings = [] } = useQuery({
    queryKey: ['taxqa_filings_for_flags', period],
    queryFn: () => base44.entities.TaxQA_Filing.filter({ tax_period: period }, '-created_date', 500),
  });

  const filingIds = useMemo(() => filings.map(f => f.id), [filings]);

  const { data: flags = [] } = useQuery({
    queryKey: ['taxqa_flags_freq', filingIds],
    queryFn: async () => {
      if (filingIds.length === 0) return [];
      // Fetch flags for all filings — batch by filing_id
      const all = [];
      for (const fid of filingIds) {
        const batch = await base44.entities.TaxQA_ExceptionFlag.filter({ filing_id: fid }, '-created_date', 100);
        all.push(...batch);
      }
      return all;
    },
    enabled: filingIds.length > 0,
  });

  const chartData = useMemo(() => {
    const freq = {};
    flags.forEach(f => {
      freq[f.rule_code] = (freq[f.rule_code] || 0) + 1;
    });
    return Object.entries(freq)
      .map(([code, count]) => ({ rule_code: code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [flags]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ความถี่ Error แยกตาม Rule Code — {period}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">ไม่มี exception flag ในงวดนี้</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="rule_code" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="จำนวน" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}