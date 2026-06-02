import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import ExceptionDetail from './ExceptionDetail';

const STATUS_MAP = {
  superseded: { label: 'ถูกแทนที่', cls: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-gray-100 text-gray-600' },
  rejected: { label: 'ตีกลับ', cls: 'bg-red-100 text-red-700' },
  approved: { label: 'อนุมัติ', cls: 'bg-green-100 text-green-700' },
  filed: { label: 'ยื่นแล้ว', cls: 'bg-blue-100 text-blue-700' },
};

export default function TaxQAHistoryQueue({ canApprove, canResubmit, userEmail }) {
  const [selectedFiling, setSelectedFiling] = useState(null);
  const queryClient = useQueryClient();

  const { data: filings = [], isLoading } = useQuery({
    queryKey: ['taxqa_filings_history'],
    queryFn: async () => {
      const [superseded, cancelled, rejected, approved, filed] = await Promise.all([
        base44.entities.TaxQA_Filing.filter({ status: 'superseded' }, '-created_date', 100),
        base44.entities.TaxQA_Filing.filter({ status: 'cancelled' }, '-created_date', 100),
        base44.entities.TaxQA_Filing.filter({ status: 'rejected' }, '-created_date', 100),
        base44.entities.TaxQA_Filing.filter({ status: 'approved' }, '-created_date', 100),
        base44.entities.TaxQA_Filing.filter({ status: 'filed' }, '-created_date', 100),
      ]);
      return [...superseded, ...cancelled, ...rejected, ...approved, ...filed]
        .sort((a, b) => (b.updated_date || b.created_date || '').localeCompare(a.updated_date || a.created_date || ''));
    },
    refetchInterval: 30000,
  });

  if (selectedFiling) {
    return (
      <ExceptionDetail
        filing={selectedFiling}
        canApprove={canApprove}
        canResubmit={canResubmit}
        userEmail={userEmail}
        onBack={() => {
          setSelectedFiling(null);
          queryClient.invalidateQueries({ queryKey: ['taxqa_filings_history'] });
        }}
      />
    );
  }

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-5 h-5 text-muted-foreground" />
          ประวัติ ({filings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่มีประวัติ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">ลูกค้า</th>
                  <th className="pb-2 pr-3">แบบ</th>
                  <th className="pb-2 pr-3">งวด</th>
                  <th className="pb-2 pr-3">Ver</th>
                  <th className="pb-2 pr-3">สถานะ</th>
                  <th className="pb-2">อัปเดตเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {filings.map(f => {
                  const st = STATUS_MAP[f.status] || { label: f.status, cls: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedFiling(f)}>
                      <td className="py-2 pr-3 font-medium">{f.customer_name}</td>
                      <td className="py-2 pr-3"><Badge variant="outline">{f.form_type}</Badge></td>
                      <td className="py-2 pr-3">{f.tax_period}</td>
                      <td className="py-2 pr-3">v{f.version || 1}</td>
                      <td className="py-2 pr-3"><Badge className={st.cls}>{st.label}</Badge></td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {(f.updated_date || f.created_date) ? format(new Date(f.updated_date || f.created_date), 'dd/MM/yy HH:mm') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}