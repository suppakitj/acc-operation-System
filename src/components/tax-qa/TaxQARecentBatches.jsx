import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import moment from 'moment';

const STATUS_MAP = {
  uploaded: { label: 'อัปโหลด', color: 'bg-blue-100 text-blue-700', icon: Clock },
  validating: { label: 'กำลังตรวจ', color: 'bg-amber-100 text-amber-700', icon: Clock },
  parsed: { label: 'สำเร็จ', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'ล้มเหลว', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export default function TaxQARecentBatches() {
  const { data: batches = [] } = useQuery({
    queryKey: ['taxqa_recent_batches'],
    queryFn: () => base44.entities.TaxQA_IngestionBatch.list('-created_date', 20),
    refetchInterval: 10000,
  });

  if (batches.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="w-5 h-5" />
          ประวัติการอัปโหลดล่าสุด
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-4">วันที่</th>
                <th className="text-left py-2 pr-4">ลูกค้า</th>
                <th className="text-left py-2 pr-4">งวด</th>
                <th className="text-left py-2 pr-4">ประเภท</th>
                <th className="text-left py-2 pr-4">Layout</th>
                <th className="text-right py-2 pr-4">รายการ</th>
                <th className="text-left py-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const st = STATUS_MAP[b.status] || STATUS_MAP.uploaded;
                return (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 text-muted-foreground">{moment(b.created_date).format('DD/MM HH:mm')}</td>
                    <td className="py-2 pr-4 font-medium">{b.customer_name}</td>
                    <td className="py-2 pr-4 font-mono">{b.tax_period}</td>
                    <td className="py-2 pr-4">{b.form_type}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{b.detected_layout}</td>
                    <td className="py-2 pr-4 text-right">{b.parsed_count}</td>
                    <td className="py-2">
                      <Badge className={st.color}>{st.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}