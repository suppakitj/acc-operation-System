import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeartPulse, Search } from 'lucide-react';
import { useAccessControl } from '../components/auth/useAccessControl';
import { computeCustomerHealthScore } from '@/lib/customerHealth';
import HealthGradeCards from '../components/customer-health/HealthGradeCards';
import HealthTable from '../components/customer-health/HealthTable';
import HealthDetailModal from '../components/customer-health/HealthDetailModal';
import TablePagination, { paginateData } from '../components/shared/TablePagination';

const DEPT_OPTIONS = [
  { value: 'all', label: 'ทุกแผนก' },
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

const GROUP_OPTIONS = [
  { value: 'all', label: 'ทุก Group' },
  { value: 'individual', label: 'บุคคลธรรมดา' },
  { value: 'sme', label: 'SME' },
  { value: 'corporate', label: 'นิติบุคคล' },
  { value: 'government', label: 'ราชการ' },
  { value: 'other', label: 'อื่นๆ' },
];

const SORT_OPTIONS = [
  { value: 'score_asc', label: 'Score ต่ำ → สูง' },
  { value: 'score_desc', label: 'Score สูง → ต่ำ' },
  { value: 'revenue', label: 'รายได้ สูง → ต่ำ' },
  { value: 'name', label: 'ชื่อ A → Z' },
];

export default function CustomerHealthScore() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 5 * 60_000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-health'],
    queryFn: () => base44.entities.Task.list('-created_date', 3000),
    staleTime: 5 * 60_000,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries-health'],
    queryFn: () => base44.entities.TimeEntry.list('-start_time', 3000),
    staleTime: 5 * 60_000,
  });

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score_asc');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Compute all health scores
  const allHealthData = useMemo(() => {
    return customers
      .filter(c => c.status === 'active')
      .map(c => ({
        ...c,
        health: computeCustomerHealthScore(c.id, tasks, timeEntries),
      }));
  }, [customers, tasks, timeEntries]);

  // Grade counts
  const gradeCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    allHealthData.forEach(c => {
      if (c.health?.grade && counts[c.health.grade] !== undefined) counts[c.health.grade]++;
    });
    return counts;
  }, [allHealthData]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = allHealthData.filter(c => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.company_name?.toLowerCase().includes(q) && !c.customer_code?.toLowerCase().includes(q)) return false;
      }
      if (gradeFilter !== 'all') {
        if (c.health?.grade !== gradeFilter) return false;
      }
      if (deptFilter !== 'all') {
        if (!(c.departments || []).includes(deptFilter)) return false;
      }
      if (groupFilter !== 'all') {
        if (c.customer_group !== groupFilter) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const sa = a.health?.score ?? -1;
      const sb = b.health?.score ?? -1;
      if (sortBy === 'score_asc') return sa - sb;
      if (sortBy === 'score_desc') return sb - sa;
      if (sortBy === 'revenue') return (b.monthly_fee || 0) - (a.monthly_fee || 0);
      if (sortBy === 'name') return (a.company_name || '').localeCompare(b.company_name || '');
      return 0;
    });

    return result;
  }, [allHealthData, search, gradeFilter, deptFilter, groupFilter, sortBy]);

  useEffect(() => { setPage(1); }, [search, gradeFilter, deptFilter, groupFilter, sortBy]);

  const paged = paginateData(filtered, page, pageSize);

  // Permission check
  const role = currentUser?.role;
  if (currentUser && role !== 'admin' && role !== 'management') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <HeartPulse className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-muted-foreground">หน้านี้สำหรับ Admin และ Management เท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-red-500" /> Customer Health Score
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          วัดความยากง่ายในการทำงานกับลูกค้าแต่ละราย — ยิ่งต่ำยิ่ง "งานยาก"
        </p>
      </div>

      {/* Grade Summary Cards */}
      <HealthGradeCards gradeCounts={gradeCounts} activeGrade={gradeFilter} onGradeClick={setGradeFilter} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} ลูกค้า</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">ไม่พบข้อมูลลูกค้า</div>
      ) : (
        <>
          <HealthTable data={paged} onViewDetail={setSelectedCustomer} />
          <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Detail Modal */}
      <HealthDetailModal
        customer={selectedCustomer}
        tasks={tasks}
        open={!!selectedCustomer}
        onOpenChange={(v) => { if (!v) setSelectedCustomer(null); }}
      />
    </div>
  );
}