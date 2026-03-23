import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CommissionTable({ data }) {
  // Group by referrer for subtotals
  const grouped = useMemo(() => {
    const map = {};
    data.forEach(d => {
      if (!map[d.referrer_id]) map[d.referrer_id] = { name: d.referrer_name, rows: [], total: 0 };
      map[d.referrer_id].rows.push(d);
      map[d.referrer_id].total += d.commission_amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  if (data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">ไม่พบข้อมูลค่าแนะนำ</div>;
  }

  return (
    <div className="bg-card rounded-xl border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">ผู้แนะนำ</TableHead>
            <TableHead className="text-xs">ลูกค้า</TableHead>
            <TableHead className="text-xs">Invoice</TableHead>
            <TableHead className="text-xs">เดือน</TableHead>
            <TableHead className="text-xs text-right">ยอดรวม</TableHead>
            <TableHead className="text-xs text-right">ค่าบริการ</TableHead>
            <TableHead className="text-xs text-right">% แนะนำ</TableHead>
            <TableHead className="text-xs text-right">ค่าแนะนำ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.map(group => (
            <React.Fragment key={group.name}>
              {group.rows.map((row, i) => (
                <TableRow key={row.billing_id} className="hover:bg-muted/50">
                  {i === 0 && (
                    <TableCell rowSpan={group.rows.length} className="text-xs font-semibold align-top border-r bg-muted/30">
                      {group.name}
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{row.customer_name}</TableCell>
                  <TableCell className="text-xs font-mono">{row.invoice_number || '—'}</TableCell>
                  <TableCell className="text-xs">{row.period_month || '—'}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-muted-foreground">฿{row.billing_amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">฿{row.service_amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.commission_pct}%</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-600">฿{row.commission_amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 border-b-2">
                <TableCell colSpan={7} className="text-xs font-semibold text-right">รวม {group.name}</TableCell>
                <TableCell className="text-xs text-right font-bold text-amber-700 tabular-nums">฿{group.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            </React.Fragment>
          ))}
          <TableRow className="bg-primary/5 border-t-2">
            <TableCell colSpan={7} className="text-sm font-bold text-right">รวมทั้งหมด</TableCell>
            <TableCell className="text-sm text-right font-bold text-amber-700 tabular-nums">
              ฿{data.reduce((s, d) => s + d.commission_amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}