import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const STATS_CONFIG = [
  { key: 'total', label: 'ทั้งหมด', icon: FileText, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { key: 'pending', label: 'รอบันทึก', icon: Clock, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  { key: 'success', label: 'เสร็จสิ้น', icon: CheckCircle2, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  { key: 'failed', label: 'ล้มเหลว', icon: AlertTriangle, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
];

export default function LineFileStats() {
  const { data: messages = [] } = useQuery({
    queryKey: ['lineFileStats'],
    queryFn: () => base44.entities.LineMessage.filter(
      { direction: 'incoming' },
      '-created_date',
      1000
    ),
    staleTime: 30_000,
  });

  const fileMessages = messages.filter(m => m.file_url && (m.message_type === 'image' || m.message_type === 'file'));

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
            <p className="text-xl font-bold">{counts[key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}