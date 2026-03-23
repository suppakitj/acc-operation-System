import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';

function fmt(n) {
  return (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MonthlyCommissionSummary({ data }) {
  // Pivot: month → referrer → total commission
  const { months, referrerNames, pivot, referrerTotals, monthTotals, grandTotal } = useMemo(() => {
    const pivot = {};       // { month: { referrerName: amount } }
    const refTotals = {};   // { referrerName: total }
    const mTotals = {};     // { month: total }
    let grand = 0;

    data.forEach(d => {
      const month = d.period_month || 'ไม่ระบุเดือน';
      const ref = d.referrer_name || '—';
      if (!pivot[month]) pivot[month] = {};
      pivot[month][ref] = (pivot[month][ref] || 0) + d.commission_amount;
      refTotals[ref] = (refTotals[ref] || 0) + d.commission_amount;
      mTotals[month] = (mTotals[month] || 0) + d.commission_amount;
      grand += d.commission_amount;
    });

    const months = Object.keys(mTotals).sort().reverse();
    const referrerNames = Object.keys(refTotals).sort((a, b) => refTotals[b] - refTotals[a]);

    return { months, referrerNames, pivot, referrerTotals: refTotals, monthTotals: mTotals, grandTotal: grand };
  }, [data]);

  // Export to CSV (opens as Excel)
  const handleExport = () => {
    if (months.length === 0) return;

    // Header row
    const headers = ['เดือน', ...referrerNames, 'รวม'];
    const rows = months.map(m => {
      const row = [m];
      referrerNames.forEach(ref => {
        row.push(pivot[m]?.[ref] || 0);
      });
      row.push(monthTotals[m] || 0);
      return row;
    });

    // Grand total row
    const totalRow = ['รวมทั้งหมด'];
    referrerNames.forEach(ref => totalRow.push(referrerTotals[ref] || 0));
    totalRow.push(grandTotal);
    rows.push(totalRow);

    // Build CSV with BOM for Thai support in Excel
    const csvContent = '\uFEFF' + [headers, ...rows].map(r =>
      r.map(cell => typeof cell === 'number' ? cell.toFixed(2) : `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (months.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">ไม่พบข้อมูลค่าแนะนำ</div>;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">สรุปค่าแนะนำรายเดือน</CardTitle>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" /> Export Excel
        </Button>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold">เดือน</TableHead>
              {referrerNames.map(ref => (
                <TableHead key={ref} className="text-xs text-right font-semibold">{ref}</TableHead>
              ))}
              <TableHead className="text-xs text-right font-bold">รวม</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map(m => (
              <TableRow key={m} className="hover:bg-muted/50">
                <TableCell className="text-xs font-medium">{m}</TableCell>
                {referrerNames.map(ref => (
                  <TableCell key={ref} className="text-xs text-right tabular-nums">
                    {pivot[m]?.[ref] ? `฿${fmt(pivot[m][ref])}` : '—'}
                  </TableCell>
                ))}
                <TableCell className="text-xs text-right tabular-nums font-semibold text-primary">
                  ฿{fmt(monthTotals[m])}
                </TableCell>
              </TableRow>
            ))}
            {/* Grand total row */}
            <TableRow className="bg-primary/5 border-t-2">
              <TableCell className="text-xs font-bold">รวมทั้งหมด</TableCell>
              {referrerNames.map(ref => (
                <TableCell key={ref} className="text-xs text-right tabular-nums font-bold text-amber-700">
                  ฿{fmt(referrerTotals[ref])}
                </TableCell>
              ))}
              <TableCell className="text-xs text-right tabular-nums font-bold text-amber-700">
                ฿{fmt(grandTotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}