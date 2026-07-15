import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '../LanguageContext';

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  waiting_client: 'bg-cyan-100 text-cyan-700',
  cancelled: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  suspended: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  scheduled: 'bg-blue-100 text-blue-700',
};

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
  const label = t(`status_${status}`) || status;
  return <Badge variant="secondary" className={style}>{label}</Badge>;
}