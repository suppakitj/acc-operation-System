import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '../hooks/useUserList';
import { useAccessControl } from '../components/auth/useAccessControl';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, RotateCcw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfMonth, startOfQuarter, format, subMonths } from 'date-fns';
import ReworkSummaryCards from '../components/rework/ReworkSummaryCards';
import ReworkStaffTable from '../components/rework/ReworkStaffTable';
import ReworkCategoryChart from '../components/rework/ReworkCategoryChart';
import ReworkTrendChart from '../components/rework/ReworkTrendChart';

const DEPT_OPTIONS = [
  { value: 'all', label: 'ทุกแผนก' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'management', label: 'Management' },
  { value: 'it', label: 'IT' },
];

export default function ReworkAnalytics() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: allUsers = [] } = useUserList();

  const today = new Date();
  const [from, setFrom] = useState(format(startOfQuarter(today), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(today, 'yyyy-MM-dd'));
  const [dept, setDept] = useState('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks_rework'],
    queryFn: () => base44.entities.Task.list('-created_date', 5000),
    staleTime: 60_000,
  });

  // Filter tasks by date range & department
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const d = t.created_date?.slice(0, 10) || '';
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (dept !== 'all' && t.department !== dept) return false;
      return true;
    });
  }, [tasks, from, to, dept]);

  // Extract all rejection cycles
  const allRejections = useMemo(() => {
    const rejections = [];
    filtered.forEach(t => {
      (t.submission_cycles || []).forEach(c => {
        if (c.decision === 'rejected') {
          rejections.push({
            ...c,
            task_id: t.id,
            task_title: t.title,
            assigned_to: t.assigned_to,
            assigned_name: t.assigned_name,
            customer_name: t.customer_name,
            department: t.department,
            service_type: t.service_type,
          });
        }
      });
    });
    return rejections;
  }, [filtered]);

  // Per-staff aggregation
  const staffStats = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const email = t.assigned_to;
      if (!email) return;
      if (!map[email]) {
        const u = allUsers.find(u => u.email === email);
        map[email] = {
          email,
          name: t.assigned_name || u?.full_name || email,
          department: t.department || u?.department || '',
          total_tasks: 0,
          reviewed: 0,
          rejected_count: 0,
          rework_weighted: 0,
          severity: { minor: 0, major: 0, critical: 0 },
          categories: {},
          first_time_right: 0,
          completed: 0,
        };
      }
      const s = map[email];
      s.total_tasks++;
      if (t.status === 'completed') s.completed++;
      if (t.first_time_right === true) s.first_time_right++;

      const reviewed = t.review_status === 'approved' || t.review_status === 'rejected' || t.status === 'completed';
      if (reviewed) s.reviewed++;

      (t.submission_cycles || []).forEach(c => {
        if (c.decision === 'rejected') {
          s.rejected_count++;
          const sev = c.severity || 'major';
          if (s.severity[sev] !== undefined) s.severity[sev]++;
          const w = sev === 'minor' ? 0.5 : sev === 'critical' ? 2 : 1;
          s.rework_weighted += w;
          if (c.category) s.categories[c.category] = (s.categories[c.category] || 0) + 1;
        }
      });
    });
    return Object.values(map).sort((a, b) => b.rework_weighted - a.rework_weighted);
  }, [filtered, allUsers]);

  if (!currentUser) return null;

  const canView = ac.role === 'admin' || ac.role === 'management' || ac.role === 'manager' || ac.role === 'super_supervisor';
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-red-600" />
            Rework Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            สรุปการส่งกลับแก้ไข — ใช้ประเมินพนักงาน & วางแผนอบรม
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs w-[130px]" />
          <span className="text-xs text-muted-foreground">ถึง</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs w-[130px]" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลด...</div>
      ) : (
        <>
          <ReworkSummaryCards tasks={filtered} rejections={allRejections} staffStats={staffStats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReworkCategoryChart rejections={allRejections} />
            <ReworkTrendChart tasks={filtered} from={from} to={to} />
          </div>
          <ReworkStaffTable staffStats={staffStats} />
        </>
      )}
    </div>
  );
}