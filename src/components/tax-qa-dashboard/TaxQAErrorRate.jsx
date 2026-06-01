import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TaxQAErrorRate({ period }) {
  const { data: filings = [] } = useQuery({
    queryKey: ['taxqa_filings_errrate', period],
    queryFn: () => base44.entities.TaxQA_Filing.filter({ tax_period: period }, '-created_date', 500),
  });

  // By prepared_by
  const byPreparer = useMemo(() => {
    const map = {};
    filings.forEach(f => {
      const key = f.prepared_by_name || f.prepared_by || 'ไม่ระบุ';
      if (!map[key]) map[key] = { name: key, total: 0, flagged: 0 };
      map[key].total++;
      if (f.status === 'flagged' || f.status === 'rejected') map[key].flagged++;
    });
    return Object.values(map).map(v => ({ ...v, rate: v.total ? Math.round((v.flagged / v.total) * 100) : 0 })).sort((a, b) => b.rate - a.rate);
  }, [filings]);

  // By form_type
  const byForm = useMemo(() => {
    const map = {};
    filings.forEach(f => {
      const key = f.form_type || 'ไม่ระบุ';
      if (!map[key]) map[key] = { name: key, total: 0, flagged: 0 };
      map[key].total++;
      if (f.status === 'flagged' || f.status === 'rejected') map[key].flagged++;
    });
    return Object.values(map).map(v => ({ ...v, rate: v.total ? Math.round((v.flagged / v.total) * 100) : 0 })).sort((a, b) => b.rate - a.rate);
  }, [filings]);

  const renderChart = (data) => (
    data.length === 0 ? (
      <p className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</p>
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis unit="%" />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          <Bar dataKey="rate" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Error Rate %" />
        </BarChart>
      </ResponsiveContainer>
    )
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Error Rate — {period}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preparer">
          <TabsList className="mb-3">
            <TabsTrigger value="preparer">แยกตามผู้จัดทำ</TabsTrigger>
            <TabsTrigger value="form">แยกตามประเภทแบบ</TabsTrigger>
          </TabsList>
          <TabsContent value="preparer">{renderChart(byPreparer)}</TabsContent>
          <TabsContent value="form">{renderChart(byForm)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}