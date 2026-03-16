import React from 'react';
import { Badge } from '@/components/ui/badge';

const SERVICE_LABELS = {
  accounting: 'ทำบัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบบัญชี',
  peak_licensing: 'Peak Account',
};

const SERVICE_COLORS = {
  accounting: 'bg-blue-100 text-blue-700',
  payroll: 'bg-green-100 text-green-700',
  tax_consulting: 'bg-purple-100 text-purple-700',
  audit: 'bg-orange-100 text-orange-700',
  peak_licensing: 'bg-yellow-100 text-yellow-700',
};

export default function ServiceBadge({ service }) {
  return (
    <Badge variant="secondary" className={SERVICE_COLORS[service] || 'bg-gray-100 text-gray-700'}>
      {SERVICE_LABELS[service] || service}
    </Badge>
  );
}