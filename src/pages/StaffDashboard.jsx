import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '../components/auth/useAccessControl';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users } from 'lucide-react';
import StaffSummaryCards from '../components/staff-dashboard/StaffSummaryCards';
import StaffRow from '../components/staff-dashboard/StaffRow';

const DEPT_LABELS = {
  management: 'Management',
  accounting: 'บัญชี',
  consulting: 'ที่ปรึกษา',
  audit: 'Audit',
  billing: 'Billing',
  it: 'IT',
};

export default function StaffDashboard() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const ac = useAccessControl(currentUser);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
  });
  const { data: users = [], isLoading: loadingUsers, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: ac.canManageUsers || ac.role === 'admin' || ac.role === 'management' || ac.role === 'manager',
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Build per-staff stats
  const staffStats = useMemo(() => {
    const map = {};

    // Initialize from users
    users.forEach(u => {
      map[u.email] = {
        email: u.email,
        name: u.full_name || u.email,
        department: u.department || '',
        departments: u.departments || [],
        pending: [],
        completed: [],
        completedThisMonth: [],
        overdue: [],
        byService: {},
      };
    });

    tasks.forEach(t => {
      const email = t.assigned_to;
      if (!email) return;
      if (!map[email]) {
        map[email] = {
          email,
          name: t.assigned_name || email,
          department: t.department || '',
          departments: [],
          pending: [],
          completed: [],
          completedThisMonth: [],
          overdue: [],
          byService: {},
        };
      }

      const entry = map[email];

      // Count by service
      const svc = t.service_type || 'other';
      entry.byService[svc] = (entry.byService[svc] || 0) + 1;

      if (t.status === 'completed') {
        entry.completed.push(t);
        if (t.completed_date) {
          const cd = parseISO(t.completed_date);
          if (cd >= monthStart && cd <= monthEnd) {
            entry.completedThisMonth.push(t);
          }
        }
      } else if (t.status !== 'cancelled') {
        entry.pending.push(t);
        if (t.due_date && new Date(t.due_date) < today) {
          entry.overdue.push(t);
        }
      }
    });

    return Object.values(map).sort((a, b) => b.pending.length - a.pending.length);
  }, [tasks, users]);

  // Filter
  const filtered = useMemo(() => {
    return staffStats.filter(s => {
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      }
      if (deptFilter !== 'all') {
        const depts = s.departments.length > 0 ? s.departments : (s.department ? [s.department] : []);
        if (!depts.includes(deptFilter)) return false;
      }
      return true;
    });
  }, [staffStats, search, deptFilter]);

  // Overall stats
  const totalPending = filtered.reduce((s, x) => s + x.pending.length, 0);
  const totalOverdue = filtered.reduce((s, x) => s + x.overdue.length, 0);
  const totalCompletedMonth = filtered.reduce((s, x) => s + x.completedThisMonth.length, 0);

  const isLoading = loadingTasks || loadingUsers;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Staff Dashboard
        </h1>
        <p className="text-xs text-muted-foreground">
          สรุปงานตามรายชื่อพนักงาน — {format(today, 'MMMM yyyy')}
        </p>
      </div>

      {/* Summary Cards */}
      <StaffSummaryCards
        staffCount={filtered.length}
        totalPending={totalPending}
        totalOverdue={totalOverdue}
        totalCompletedMonth={totalCompletedMonth}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อพนักงาน..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="ทุกแผนก" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแผนก</SelectItem>
            {Object.entries(DEPT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Staff List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">ไม่พบข้อมูลพนักงาน</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(staff => (
            <StaffRow key={staff.email} staff={staff} />
          ))}
        </div>
      )}
    </div>
  );
}