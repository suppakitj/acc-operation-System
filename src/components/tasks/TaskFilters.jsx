import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function TaskFilters({ filters, setFilters, customers = [], users = [] }) {
  const { t } = useLanguage();
  const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-2">
      {/* Row 1 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search task ID, name..." value={filters.search} onChange={e => update('search', e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={filters.department} onValueChange={v => update('department', v)}>
          <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="accounting">{t('dept_accounting')}</SelectItem>
            <SelectItem value="audit">{t('dept_audit')}</SelectItem>
            <SelectItem value="consulting">{t('dept_consulting')}</SelectItem>
            <SelectItem value="billing">{t('dept_billing')}</SelectItem>
            <SelectItem value="management">{t('dept_management')}</SelectItem>
            <SelectItem value="it">{t('dept_it')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={v => update('status', v)}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">{t('status_pending')}</SelectItem>
            <SelectItem value="in_progress">{t('status_in_progress')}</SelectItem>
            <SelectItem value="review">{t('status_review')}</SelectItem>
            <SelectItem value="completed">{t('status_completed')}</SelectItem>
            <SelectItem value="cancelled">{t('status_cancelled')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priority} onValueChange={v => update('priority', v)}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">{t('priority_low')}</SelectItem>
            <SelectItem value="medium">{t('priority_medium')}</SelectItem>
            <SelectItem value="high">{t('priority_high')}</SelectItem>
            <SelectItem value="urgent">{t('priority_urgent')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.owner} onValueChange={v => update('owner', v)}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="All Owners" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto whitespace-nowrap">{filters._count} of {filters._total}</span>
      </div>
      {/* Row 2 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={filters.serviceType} onValueChange={v => update('serviceType', v)}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="accounting">{t('service_accounting')}</SelectItem>
            <SelectItem value="payroll">{t('service_payroll')}</SelectItem>
            <SelectItem value="tax_consulting">{t('service_tax')}</SelectItem>
            <SelectItem value="audit">{t('service_audit')}</SelectItem>
            <SelectItem value="peak_licensing">{t('service_peak')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.client} onValueChange={v => update('client', v)}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.taskType} onValueChange={v => update('taskType', v)}>
          <SelectTrigger className="w-full sm:w-[110px] h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="recurring">Recurring</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Due range:</span>
          <Input type="date" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} className="h-8 text-xs w-[130px]" />
          <span>→</span>
          <Input type="date" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} className="h-8 text-xs w-[130px]" />
        </div>
      </div>
    </div>
  );
}