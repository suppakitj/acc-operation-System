import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FastTrackQueue({ canApprove }) {
  const [selected, setSelected] = useState([]);
  const [approving, setApproving] = useState(false);
  const queryClient = useQueryClient();

  const { data: filings = [], isLoading } = useQuery({
    queryKey: ['taxqa_filings_clean'],
    queryFn: () => base44.entities.TaxQA_Filing.filter({ status: 'clean' }, '-created_date', 200),
    refetchInterval: 15000,
  });

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filings.length) setSelected([]);
    else setSelected(filings.map(f => f.id));
  };

  const handleBatchApprove = async () => {
    if (selected.length === 0) return;
    setApproving(true);
    const res = await base44.functions.invoke('taxqaReview', { action: 'batch_approve', filing_ids: selected });
    if (res.data.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`อนุมัติ ${res.data.approved} รายการ`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['taxqa_filings_clean'] });
    }
    setApproving(false);
  };

  const fmtNum = (n) => n != null ? Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-green-600" />
            คิว Fast-track ({filings.length})
          </CardTitle>
          {canApprove && filings.length > 0 && (
            <Button size="sm" className="gap-1.5" onClick={handleBatchApprove} disabled={approving || selected.length === 0}>
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              อนุมัติทั้งหมด ({selected.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่มี filing ที่ผ่านการตรวจอัตโนมัติ (clean)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {canApprove && (
                    <th className="pb-2 pr-2 w-8">
                      <Checkbox checked={selected.length === filings.length && filings.length > 0} onCheckedChange={toggleAll} />
                    </th>
                  )}
                  <th className="pb-2 pr-3">ลูกค้า</th>
                  <th className="pb-2 pr-3">แบบ</th>
                  <th className="pb-2 pr-3">งวด</th>
                  <th className="pb-2 pr-3 text-right">ยอดภาษี</th>
                  <th className="pb-2 pr-3">รายการ</th>
                  <th className="pb-2">สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {filings.map(f => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                    {canApprove && (
                      <td className="py-2 pr-2">
                        <Checkbox checked={selected.includes(f.id)} onCheckedChange={() => toggleSelect(f.id)} />
                      </td>
                    )}
                    <td className="py-2 pr-3 font-medium">{f.customer_name}</td>
                    <td className="py-2 pr-3"><Badge variant="outline">{f.form_type}</Badge></td>
                    <td className="py-2 pr-3">{f.tax_period}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmtNum(f.header_total_tax)}</td>
                    <td className="py-2 pr-3">{f.line_count || 0}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {f.created_date ? format(new Date(f.created_date), 'dd/MM/yy HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}