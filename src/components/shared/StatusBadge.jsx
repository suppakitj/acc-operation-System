import React from 'react';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  pending: { label: 'รอดำเนินการ', className: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'กำลังทำ', className: 'bg-blue-100 text-blue-700' },
  review: { label: 'รอตรวจสอบ', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'เสร็จแล้ว', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-700' },
  active: { label: 'ใช้งาน', className: 'bg-green-100 text-green-700' },
  inactive: { label: 'ไม่ใช้งาน', className: 'bg-gray-100 text-gray-700' },
  suspended: { label: 'ระงับ', className: 'bg-red-100 text-red-700' },
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-700' },
  sent: { label: 'ส่งแล้ว', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'ชำระแล้ว', className: 'bg-green-100 text-green-700' },
  overdue: { label: 'เกินกำหนด', className: 'bg-red-100 text-red-700' },
  scheduled: { label: 'กำหนดแล้ว', className: 'bg-blue-100 text-blue-700' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
}