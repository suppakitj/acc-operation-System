import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEPTS = [
  { value: 'all', label: 'ทุกแผนก' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
  { value: 'management', label: 'Management' },
];

const SERVICES = [
  { value: 'all', label: 'ทุกประเภท' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'tax_consulting', label: 'Tax Consulting' },
  { value: 'audit', label: 'Audit' },
  { value: 'peak_licensing', label: 'Peak Licensing' },
];

const PERIODS = [
  { value: 'this_month', label: 'เดือนนี้' },
  { value: 'this_quarter', label: 'ไตรมาสนี้' },
  { value: 'this_year', label: 'ปีนี้' },
  { value: 'custom', label: 'กำหนดเอง' },
];

export default function StaffCostFilters({ filters, setFilters, users = [] }) {
  const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 bg-card border rounded-lg">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">ช่วงเวลา</Label>
        <Select value={filters.period} onValueChange={v => update('period', v)}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filters.period === 'custom' && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">ตั้งแต่</Label>
            <Input type="date" className="w-[140px] h-8 text-xs" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">ถึง</Label>
            <Input type="date" className="w-[140px] h-8 text-xs" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} />
          </div>
        </>
      )}

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">แผนก</Label>
        <Select value={filters.department} onValueChange={v => update('department', v)}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">ประเภทบริการ</Label>
        <Select value={filters.serviceType} onValueChange={v => update('serviceType', v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SERVICES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">พนักงาน</Label>
        <Select value={filters.selectedUser} onValueChange={v => update('selectedUser', v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="ทุกคน" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกคน</SelectItem>
            {users.map(u => (
              <SelectItem key={u.email} value={u.email}>{u.initials || u.nickname || u.full_name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}