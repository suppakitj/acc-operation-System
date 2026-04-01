import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const PRIORITY_CONFIG = {
  urgent: { label: 'เร่งด่วน', color: 'bg-red-100 text-red-700' },
  high: { label: 'สูง', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'ปานกลาง', color: 'bg-blue-100 text-blue-700' },
  low: { label: 'ต่ำ', color: 'bg-gray-100 text-gray-600' },
};

const STATUS_CONFIG = {
  pending: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'กำลังทำ', color: 'bg-blue-100 text-blue-700' },
  review: { label: 'รอตรวจสอบ', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'เสร็จแล้ว', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-500' },
};

const SERVICE_LABELS = {
  accounting: 'ทำบัญชี', payroll: 'เงินเดือน', tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบ', peak_licensing: 'Peak Account',
};

function InfoRow({ label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-xs font-medium">{children}</span>
    </div>
  );
}

export default function TaskDetailPopup({ task, open, onOpenChange }) {
  if (!task) return null;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;

  const checklist = task.checklist || [];
  const checked = checklist.filter(c => c.checked).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base pr-6">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={`text-[10px] ${status.color} border-0`}>{status.label}</Badge>
            <Badge className={`text-[10px] ${priority.color} border-0`}>{priority.label}</Badge>
            {task.service_type && (
              <Badge variant="outline" className="text-[10px]">{SERVICE_LABELS[task.service_type] || task.service_type}</Badge>
            )}
          </div>
          <div className="space-y-2 bg-muted/30 rounded-lg p-3">
            <InfoRow label="ลูกค้า">{task.customer_name}</InfoRow>
            <InfoRow label="ผู้รับผิดชอบ">{task.assigned_name || task.assigned_to}</InfoRow>
            <InfoRow label="แผนก">{task.department}</InfoRow>
            <InfoRow label="กำหนดส่ง">
              {task.due_date ? format(new Date(task.due_date), 'd MMM yyyy', { locale: th }) : '-'}
            </InfoRow>
            <InfoRow label="วันเริ่มงาน">
              {task.start_date ? format(new Date(task.start_date), 'd MMM yyyy', { locale: th }) : '-'}
            </InfoRow>
            {checklist.length > 0 && (
              <InfoRow label="Checklist">{checked}/{checklist.length} รายการ</InfoRow>
            )}
          </div>
          {task.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">รายละเอียด</p>
              <p className="text-xs bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}