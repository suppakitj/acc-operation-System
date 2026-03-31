import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SVC_LABELS = {
  accounting: 'Accounting', payroll: 'Payroll',
  tax_consulting: 'Tax Consulting', audit: 'Audit', peak_licensing: 'Peak Licensing',
};

function getSlaStatus(rate) {
  if (rate >= 90) return { color: 'bg-green-100 text-green-700 border-green-300', label: 'ดี' };
  if (rate >= 75) return { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'ปานกลาง' };
  return { color: 'bg-red-100 text-red-700 border-red-300', label: 'ต้องปรับปรุง' };
}

export default function SlaComplianceTable({ slaData }) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">SLA Compliance by Service Type</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-4 px-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Service Type</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">ทั้งหมด</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">ตรงเวลา</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">สาย</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">On-Time Rate</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">SLA</th>
              </tr>
            </thead>
            <tbody>
              {slaData.map(row => {
                const sla = getSlaStatus(row.rate);
                return (
                  <tr key={row.service} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5 text-xs font-medium">{SVC_LABELS[row.service] || row.service}</td>
                    <td className="px-3 py-2.5 text-xs text-center">{row.total}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-green-700">{row.onTime}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-red-600">{row.late}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.rate >= 90 ? 'bg-green-500' : row.rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(row.rate, 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{row.rate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[9px] ${sla.color}`}>{sla.label}</Badge>
                    </td>
                  </tr>
                );
              })}
              {slaData.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}