import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Clock, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATS_CONFIG = [
  { key: 'total', label: 'ทั้งหมด', icon: FileText, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { key: 'pending', label: 'รอบันทึก', icon: Clock, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  { key: 'success', label: 'เสร็จสิ้น', icon: CheckCircle2, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  { key: 'failed', label: 'ล้มเหลว', icon: AlertTriangle, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
];

export default function LineFileStats() {
  const [retrying, setRetrying] = useState(false);
  const queryClient = useQueryClient();

  const handleRetry = async () => {
    setRetrying(true);
    const res = await base44.functions.invoke('manualRetryDriveSave', {});
    const d = res.data;
    if (d.error) {
      toast.error(d.error);
    } else if (d.retried === 0) {
      toast.info(d.message || 'ไม่มีไฟล์ให้ retry');
    } else {
      toast.success(`Retry ${d.retried} ไฟล์: สำเร็จ ${d.success}, ล้มเหลว ${d.failed}`);
      queryClient.invalidateQueries({ queryKey: ['lineFileStats'] });
    }
    setRetrying(false);
  };

  const { data: imgMessages = [] } = useQuery({
    queryKey: ['lineFileStats', 'image'],
    queryFn: () => base44.entities.LineMessage.filter(
      { direction: 'incoming', message_type: 'image' },
      '-created_date',
      1000
    ),
    staleTime: 30_000,
  });

  const { data: fileOnlyMessages = [] } = useQuery({
    queryKey: ['lineFileStats', 'file'],
    queryFn: () => base44.entities.LineMessage.filter(
      { direction: 'incoming', message_type: 'file' },
      '-created_date',
      1000
    ),
    staleTime: 30_000,
  });

  const fileMessages = [...imgMessages, ...fileOnlyMessages].filter(m => m.file_url);

  const counts = {
    total: fileMessages.length,
    success: fileMessages.filter(m => m.drive_saved === true).length,
    failed: fileMessages.filter(m => !m.drive_saved && (m.drive_retry_count || 0) >= 10).length,
    pending: 0,
  };
  counts.pending = counts.total - counts.success - counts.failed;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STATS_CONFIG.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
        <div key={key} className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">{counts[key]}</p>
              {key === 'failed' && counts.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  {retrying ? 'กำลัง Retry...' : 'Retry'}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}