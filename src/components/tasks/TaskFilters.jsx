import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Search } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function TaskFilters({ filters, setFilters, customers = [], users = [] }) {
  const { t } = useLanguage();
  const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const STATUS_TABS = [
    { key: 'all', label: 'ทั้งหมด', color: 'bg-primary text-primary-foreground' },
    { key: 'active', label: 'ยังไม่เสร็จ', color: 'bg-blue-600 text-white' },
    { key: 'pending', label: 'รอดำเนินการ', color: 'bg-slate-500 text-white' },
    { key: 'in_progress', label: 'กำลังทำ', color: 'bg-orange-500 text-white' },
    { key: 'review', label: 'รอ Approve', color: 'bg-purple-600 text-white' },
    { key: 'completed', label: 'เสร็จแล้ว', color: 'bg-green-600 text-white' },
  ];

  return (
    <div className="space-y-2">
      {/* Quick Status Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map(tab => {
          const isActive = filters.status === tab.key;
          const count = tab.key === 'all' ? (filters._total || 0)
            : tab.key === 'active' ? (filters._statusCounts?.active || 0)
            : (filters._statusCounts?.[tab.key] || 0);
          return (
            <button
              key={tab.key}
              onClick={() => update('status', tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? `${tab.color} shadow-sm`
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-background'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

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
        <SearchableSelect
          value={filters.owner}
          onValueChange={v => update('owner', v)}
          options={[{ value: 'all', label: 'All Owners' }, ...users.map(u => ({ value: u.email, label: u.full_name || u.email }))]}
          placeholder="All Owners"
          className="w-full sm:w-[130px] h-8 text-xs"
        />
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
        <SearchableSelect
          value={filters.client}
          onValueChange={v => update('client', v)}
          options={[{ value: 'all', label: 'All Clients' }, ...customers.map(c => ({ value: c.id, label: c.company_name }))]}
          placeholder="All Clients"
          className="w-full sm:w-[130px] h-8 text-xs"
        />
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