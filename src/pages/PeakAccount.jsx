import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';

const PKG_COLORS = { basic: 'bg-blue-100 text-blue-700', pro: 'bg-purple-100 text-purple-700', pro_plus: 'bg-yellow-100 text-yellow-700', none: 'bg-gray-100 text-gray-700' };
const PKG_LABELS = { basic: 'Basic', pro: 'Pro', pro_plus: 'Pro Plus', none: '-' };

export default function PeakAccount() {
  const { t } = useLanguage();
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const peakCustomers = customers.filter(c => (c.services || []).includes('peak_licensing'));
  const today = new Date();

  const stats = {
    total: peakCustomers.length,
    basic: peakCustomers.filter(c => c.peak_package === 'basic').length,
    pro: peakCustomers.filter(c => c.peak_package === 'pro').length,
    pro_plus: peakCustomers.filter(c => c.peak_package === 'pro_plus').length,
    expiring: peakCustomers.filter(c => { if (!c.peak_license_end) return false; const d = differenceInDays(parseISO(c.peak_license_end), today); return d >= 0 && d <= 30; }).length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('peak_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('peak_subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 md:p-4 text-center"><p className="text-xl md:text-2xl font-bold">{stats.total}</p><p className="text-[11px] text-muted-foreground">{t('peak_total')}</p></Card>
        <Card className="p-3 md:p-4 text-center"><p className="text-xl md:text-2xl font-bold text-blue-600">{stats.basic}</p><p className="text-[11px] text-muted-foreground">Basic</p></Card>
        <Card className="p-3 md:p-4 text-center"><p className="text-xl md:text-2xl font-bold text-purple-600">{stats.pro}</p><p className="text-[11px] text-muted-foreground">Pro</p></Card>
        <Card className="p-3 md:p-4 text-center"><p className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pro_plus}</p><p className="text-[11px] text-muted-foreground">Pro Plus</p></Card>
        <Card className="p-3 md:p-4 text-center col-span-2 md:col-span-1"><p className="text-xl md:text-2xl font-bold text-red-600">{stats.expiring}</p><p className="text-[11px] text-muted-foreground">{t('peak_expiring')}</p></Card>
      </div>

      <div className="space-y-2">
        {peakCustomers.length === 0 ? <Card className="p-8 text-center text-muted-foreground">{t('no_peak')}</Card> :
          peakCustomers.map(c => {
            const daysLeft = c.peak_license_end ? differenceInDays(parseISO(c.peak_license_end), today) : null;
            const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
            const isExpired = daysLeft !== null && daysLeft < 0;
            return (
              <Card key={c.id} className="hover:shadow-md transition-all">
                <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4 flex-wrap sm:flex-nowrap">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Key className="w-4 h-4 md:w-5 md:h-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.peak_license_start && `${t('peak_start')} ${format(parseISO(c.peak_license_start), 'dd/MM/yyyy')}`}
                      {c.peak_license_end && ` — ${t('peak_end')} ${format(parseISO(c.peak_license_end), 'dd/MM/yyyy')}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className={PKG_COLORS[c.peak_package]}>{PKG_LABELS[c.peak_package]}</Badge>
                  {isExpiring && <Badge variant="secondary" className="bg-yellow-100 text-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" />{t('days_left', { n: daysLeft })}</Badge>}
                  {isExpired && <Badge variant="secondary" className="bg-red-100 text-red-700">{t('peak_expired')}</Badge>}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}