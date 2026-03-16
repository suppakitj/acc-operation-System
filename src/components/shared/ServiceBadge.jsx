import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '../LanguageContext';

const SERVICE_STYLES = {
  accounting: 'bg-blue-100 text-blue-700',
  payroll: 'bg-green-100 text-green-700',
  tax_consulting: 'bg-purple-100 text-purple-700',
  audit: 'bg-orange-100 text-orange-700',
  peak_licensing: 'bg-yellow-100 text-yellow-700',
};

const SERVICE_KEYS = {
  accounting: 'service_accounting',
  payroll: 'service_payroll',
  tax_consulting: 'service_tax',
  audit: 'service_audit',
  peak_licensing: 'service_peak',
};

export default function ServiceBadge({ service }) {
  const { t } = useLanguage();
  return (
    <Badge variant="secondary" className={SERVICE_STYLES[service] || 'bg-gray-100 text-gray-700'}>
      {t(SERVICE_KEYS[service]) || service}
    </Badge>
  );
}