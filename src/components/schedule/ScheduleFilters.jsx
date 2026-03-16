import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

const DEPT_LABELS = {
  management: 'Management',
  accounting: 'บัญชี',
  consulting: 'ที่ปรึกษา',
  audit: 'Audit',
  billing: 'Billing',
  it: 'IT',
};

const TYPE_LABELS = {
  client_visit: 'Client Visit',
  office: 'Office',
  leave: 'Leave',
  meeting: 'Meeting',
  fieldwork: 'Fieldwork',
  wfh: 'Work from Home',
  other: 'Other',
};

export default function ScheduleFilters({ filters, setFilters, customers = [], users = [], totalEntries = 0 }) {
  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employee, client..."
            value={filters.search || ''}
            onChange={e => update('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filters.department || 'all'} onValueChange={v => update('department', v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {Object.entries(DEPT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.employee || 'all'} onValueChange={v => update('employee', v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.type || 'all'} onValueChange={v => update('type', v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.customer || 'all'} onValueChange={v => update('customer', v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">{totalEntries} entries</p>
    </div>
  );
}