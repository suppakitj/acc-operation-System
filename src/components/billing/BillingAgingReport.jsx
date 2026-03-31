import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AGING_BUCKETS = [
  { key: 'current', label: 'ยังไม่ครบกำหนด', color: '#22c55e', min: -Infinity, max: 0 },
  { key: '1_30', label: '1–30 วัน', color: '#eab308', min: 1, max: 30 },
  { key: '31_60', label: '31–60 วัน', color: '#f97316', min: 31, max: 60 },
  { key: '61_90', label: '61–90 วัน', color: '#ef4444', min: 61, max: 90 },
  { key: '90_plus', label: '90+ วัน', color: '#7f1d1d', min: 91, max: Infinity },
];

function fmtAmount(val) {
  return `฿${(val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BillingAgingReport({ billings }) {
  const [expandedBucket, setExpandedBucket] = useState(null);
  const today = new Date();

  // Only unpaid billings with a due date
  const unpaid = useMemo(() => {
    return billings.filter(b =>
      b.due_date && !['paid', 'cancelled'].includes(b.status)
    ).map(b => {
      const daysOverdue = differenceInDays(today, parseISO(b.due_date));
      return { ...b, daysOverdue };
    });
  }, [billings]);

  // Group into buckets
  const buckets = useMemo(() => {
    return AGING_BUCKETS.map(bucket => {
      const items = unpaid.filter(b => {
        if (bucket.key === 'current') return b.daysOverdue <= 0;
        return b.daysOverdue >= bucket.min && b.daysOverdue <= bucket.max;
      });
      const totalAmount = items.reduce((s, b) => s + (b.amount || 0), 0);
      return { ...bucket, items, count: items.length, totalAmount };
    });
  }, [unpaid]);

  const totalUnpaid = unpaid.reduce((s, b) => s + (b.amount || 0), 0);
  const totalOverdue = unpaid.filter(b => b.daysOverdue > 0).reduce((s, b) => s + (b.amount || 0), 0);

  // By customer
  const byCustomer = useMemo(() => {
    const map = {};
    unpaid.filter(b => b.daysOverdue > 0).forEach(b => {
      const key = b.customer_id || b.customer_name || '_unknown';
      if (!map[key]) map[key] = { name: b.customer_name || '-', totalAmount: 0, count: 0, maxDays: 0 };
      map[key].totalAmount += b.amount || 0;
      map[key].count++;
      map[key].maxDays = Math.max(map[key].maxDays, b.daysOverdue);
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [unpaid]);

  // Chart data
  const chartData = buckets.filter(b => b.key !== 'current').map(b => ({
    name: b.label,
    amount: b.totalAmount,
    count: b.count,
    key: b.key,
    color: b.color,
  }));

  // Export CSV
  const handleExport = () => {
    const header = 'ลูกค้า,Invoice #,ค่าบริการ,วันครบกำหนด,วันเกินกำหนด,สถานะ\n';
    const rows = unpaid.filter(b => b.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .map(b => `"${b.customer_name || '-'}","${b.invoice_number || '-'}",${b.amount || 0},"${b.due_date}",${b.daysOverdue},"${b.status}"`)
      .join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'billing_aging_report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">ยอดค้างชำระทั้งหมด</p>
            <p className="text-lg font-bold">{fmtAmount(totalUnpaid)}</p>
            <p className="text-[10px] text-muted-foreground">{unpaid.length} รายการ</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">ยอดเกินกำหนด</p>
            <p className="text-lg font-bold text-red-600">{fmtAmount(totalOverdue)}</p>
            <p className="text-[10px] text-muted-foreground">{unpaid.filter(b => b.daysOverdue > 0).length} รายการ</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">ลูกค้าค้างชำระ</p>
            <p className="text-lg font-bold">{byCustomer.length} ราย</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">ค้างนานสุด</p>
            <p className="text-lg font-bold text-red-600">
              {unpaid.length > 0 ? `${Math.max(...unpaid.map(b => b.daysOverdue), 0)} วัน` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aging Buckets */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-500" />
                Aging Buckets
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1 text-[10px] h-7" onClick={handleExport}>
                <Download className="w-3 h-3" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-4 px-5 space-y-1.5">
            {buckets.map(bucket => (
              <div key={bucket.key} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpandedBucket(expandedBucket === bucket.key ? null : bucket.key)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: bucket.color }} />
                  <span className="text-xs font-medium flex-1">{bucket.label}</span>
                  <span className="text-xs text-muted-foreground">{bucket.count} รายการ</span>
                  <span className="text-xs font-bold">{fmtAmount(bucket.totalAmount)}</span>
                  {bucket.items.length > 0 && (
                    expandedBucket === bucket.key
                      ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
                {expandedBucket === bucket.key && bucket.items.length > 0 && (
                  <div className="px-3 pb-2 border-t bg-muted/20 space-y-1 max-h-[200px] overflow-y-auto">
                    {bucket.items.sort((a, b) => b.daysOverdue - a.daysOverdue).map(b => (
                      <div key={b.id} className="flex items-center justify-between text-[10px] py-1">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate">{b.customer_name}</span>
                          {b.invoice_number && <span className="text-muted-foreground ml-1">#{b.invoice_number}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{fmtAmount(b.amount)}</span>
                          {b.daysOverdue > 0 && <Badge variant="outline" className="text-[8px] text-red-600 border-red-300">{b.daysOverdue}d</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Aging Distribution (เกินกำหนด)</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4 px-5">
            {chartData.every(d => d.amount === 0) ? (
              <p className="text-xs text-muted-foreground text-center py-8">ไม่มียอดเกินกำหนด 🎉</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [fmtAmount(v), 'ยอดเงิน']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
                    labelFormatter={(label) => {
                      const item = chartData.find(d => d.name === label);
                      return `${label} — ${item?.count || 0} รายการ`;
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {chartData.map(d => <Cell key={d.key} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Overdue Customers */}
      {byCustomer.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">ลูกค้าที่ค้างชำระ (เรียงตามยอด)</CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-4 px-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase">ลูกค้า</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">จำนวนบิล</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-right">ยอดค้าง</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">เกินนานสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {byCustomer.slice(0, 15).map((c, i) => (
                    <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-2 py-2 text-xs font-medium">{c.name}</td>
                      <td className="px-2 py-2 text-xs text-center">{c.count}</td>
                      <td className="px-2 py-2 text-xs text-right font-bold">{fmtAmount(c.totalAmount)}</td>
                      <td className="px-2 py-2 text-center">
                        <Badge variant="outline" className={`text-[9px] ${c.maxDays > 90 ? 'bg-red-100 text-red-700 border-red-300' : c.maxDays > 60 ? 'bg-orange-100 text-orange-700 border-orange-300' : c.maxDays > 30 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
                          {c.maxDays} วัน
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}