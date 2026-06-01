import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import ExceptionDetail from './ExceptionDetail';

const STATUS_MAP = {
  validating: { label: 'กำลัง validate', cls: 'bg-blue-100 text-blue-700' },
  flagged: { label: 'Flagged', cls: 'bg-red-100 text-red-700' },
  under_review: { label: 'กำลังตรวจ', cls: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'ตีกลับ', cls: 'bg-red-100 text-red-700' },
};

export default function ExceptionQueue({ canApprove, canResubmit, userEmail }) {
  const [selectedFiling, setSelectedFiling] = useState(null);
  const queryClient = useQueryClient();

  const { data: filings = [], isLoading } = useQuery({
    queryKey: ['taxqa_filings_exception'],
    queryFn: async () => {
      const flagged = await base44.entities.TaxQA_Filing.filter({ status: 'flagged' }, '-created_date', 200);
      const underReview = await base44.entities.TaxQA_Filing.filter({ status: 'under_review' }, '-created_date', 200);
      const rejected = await base44.entities.TaxQA_Filing.filter({ status: 'rejected' }, '-created_date', 200);
      return [...flagged, ...underReview, ...rejected];
    },
    refetchInterval: 15000,
  });

  // Preparer sees only their own filings
  const visibleFilings = canApprove
    ? filings
    : filings.filter(f => f.prepared_by === userEmail);

  if (selectedFiling) {
    return (
      <ExceptionDetail
        filing={selectedFiling}
        canApprove={canApprove}
        canResubmit={canResubmit}
        userEmail={userEmail}
        onBack={() => {
          setSelectedFiling(null);
          queryClient.invalidateQueries({ queryKey: ['taxqa_filings_exception'] });
        }}
      />
    );
  }

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          คิว Exception ({visibleFilings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visibleFilings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่มี filing ที่มี exception flag</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">ลูกค้า</th>
                  <th className="pb-2 pr-3">แบบ</th>
                  <th className="pb-2 pr-3">งวด</th>
                  <th className="pb-2 pr-3">สถานะ</th>
                  <th className="pb-2 pr-3">Flags</th>
                  <th className="pb-2">สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {visibleFilings.map(f => {
                  const st = STATUS_MAP[f.status] || { label: f.status, cls: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedFiling(f)}>
                      <td className="py-2 pr-3 font-medium">{f.customer_name}</td>
                      <td className="py-2 pr-3"><Badge variant="outline">{f.form_type}</Badge></td>
                      <td className="py-2 pr-3">{f.tax_period}</td>
                      <td className="py-2 pr-3"><Badge className={st.cls}>{st.label}</Badge></td>
                      <td className="py-2 pr-3">{f.flag_count || 0}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {f.created_date ? format(new Date(f.created_date), 'dd/MM/yy HH:mm') : '-'}
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