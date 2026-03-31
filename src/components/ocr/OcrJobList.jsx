import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, ExternalLink, Loader2, Trash2, FileSpreadsheet, FileType } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  uploading: { label: 'กำลังอัปโหลด', className: 'bg-blue-100 text-blue-700' },
  processing: { label: 'กำลังประมวลผล', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-green-100 text-green-700' },
  failed: { label: 'ล้มเหลว', className: 'bg-red-100 text-red-700' },
};

export default function OcrJobList({ jobs, onRefresh }) {
  const [pollingId, setPollingId] = useState(null);

  const handlePoll = async (jobId) => {
    setPollingId(jobId);
    const res = await base44.functions.invoke('pollOcrResult', { ocr_job_id: jobId });
    if (res.data?.status === 'completed') {
      toast.success('ประมวลผลเสร็จ — ได้ไฟล์ Excel แล้ว');
    } else if (res.data?.status === 'failed') {
      toast.error('ประมวลผลล้มเหลว: ' + (res.data?.error || ''));
    } else {
      toast.info('ยังอยู่ระหว่างประมวลผล — กรุณารอสักครู่');
    }
    setPollingId(null);
    onRefresh?.();
  };

  const handleDelete = async (jobId) => {
    await base44.entities.OcrJob.delete(jobId);
    toast.success('ลบแล้ว');
    onRefresh?.();
  };

  if (!jobs.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีรายการ OCR</p>;
  }

  return (
    <div className="space-y-2">
      {jobs.map(job => {
        const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.uploading;
        return (
          <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{job.filename}</p>
                <Badge className={sc.className + ' text-[10px]'}>{sc.label}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {job.output_format === 'word' ? (
                  <span className="flex items-center gap-0.5 text-blue-600"><FileType className="w-3 h-3" /> Word</span>
                ) : (
                  <span className="flex items-center gap-0.5 text-green-600"><FileSpreadsheet className="w-3 h-3" /> Excel</span>
                )}
                {job.customer_name && <span>{job.customer_name}</span>}
                <span>{format(new Date(job.created_date), 'dd/MM/yyyy HH:mm')}</span>
                {job.notes && <span>• {job.notes}</span>}
              </div>
              {job.status === 'failed' && job.error_message && (
                <p className="text-xs text-red-500 mt-1">{job.error_message}</p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {job.status === 'processing' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePoll(job.id)}
                  disabled={pollingId === job.id}
                  className="text-xs"
                  title="ตรวจสอบแบบ manual (หรือรอ Webhook อัตโนมัติ)"
                >
                  {pollingId === job.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1">ตรวจสอบ</span>
                </Button>
              )}
              {job.status === 'completed' && job.output_file_url && (
                <Button variant="outline" size="sm" asChild className="text-xs">
                  <a href={job.output_file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5 mr-1" /> {job.output_format === 'word' ? 'Word' : 'Excel'}
                  </a>
                </Button>
              )}
              {job.manus_task_url && (
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                  <a href={job.manus_task_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(job.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}