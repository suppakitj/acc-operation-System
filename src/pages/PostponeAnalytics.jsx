import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, CalendarClock } from 'lucide-react';
import { startOfQuarter, format } from 'date-fns';

import PostponeSummaryCards from '@/components/postpone/PostponeSummaryCards';
import PostponeByStaffTable from '@/components/postpone/PostponeByStaffTable';
import PostponeByCustomerTable from '@/components/postpone/PostponeByCustomerTable';
import PostponeReasonChart from '@/components/postpone/PostponeReasonChart';
import PostponeTrendChart from '@/components/postpone/PostponeTrendChart';

const DEPT_OPTIONS = [
  { value: 'all', label: 'ทุกแผนก' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'management', label: 'Management' },
  { value: 'it', label: 'IT' },
];

export default function PostponeAnalytics() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: allUsers = [] } = useUserList();

  const today = new Date();
  const [from, setFrom] = useState(format(startOfQuarter(today), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(today, 'yyyy-MM-dd'));
  const [dept, setDept] = useState('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks_postpone'],
    queryFn: () => base44.entities.Task.list('-created_date', 5000),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const d = t.created_date?.slice(0, 10) || '';
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (dept !== 'all' && t.department !== dept) return false;
      return true;
    });
  }, [tasks, from, to, dept]);

  // Extract all postpone events from due_date_change_history
  const allPostpones = useMemo(() => {
    const events = [];
    filtered.forEach(t => {
      (t.due_date_change_history || []).forEach(h => {
        events.push({
          ...h,
          task_id: t.id,
          task_title: t.title,
          assigned_to: t.assigned_to,
          assigned_name: t.assigned_name,
          customer_id: t.customer_id,
          customer_name: t.customer_name,
          department: t.department,
          service_type: t.service_type,
        });
      });
    });
    return events;
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
          postponed_tasks: 0,
          total_postpones: 0,
          avg_slippage: 0,
          reasons: {},
          _slippages: [],
        };
      }
      const s = map[email];
      s.total_tasks++;
      const changes = t.due_date_change_count || 0;
      if (changes > 0) {
        s.postponed_tasks++;
        s.total_postpones += changes;
      }
      (t.due_date_change_history || []).forEach(h => {
        if (h.old_due_date && h.new_due_date) {
          const diff = Math.round((new Date(h.new_due_date) - new Date(h.old_due_date)) / 86400000);
          if (diff > 0) s._slippages.push(diff);
        }
        if (h.reason) {
          s.reasons[h.reason] = (s.reasons[h.reason] || 0) + 1;
        }
      });
    });
    return Object.values(map).map(s => {
      s.avg_slippage = s._slippages.length > 0 ? Math.round(s._slippages.reduce((a, b) => a + b, 0) / s._slippages.length * 10) / 10 : 0;
      s.postpone_rate = s.total_tasks > 0 ? s.postponed_tasks / s.total_tasks : 0;
      delete s._slippages;
      return s;
    }).sort((a, b) => b.total_postpones - a.total_postpones);
  }, [filtered, allUsers]);

  // Per-customer aggregation
  const customerStats = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const cid = t.customer_id || t.customer_name || 'ไม่ระบุ';
      if (!map[cid]) {
        map[cid] = { customer_id: cid, customer_name: t.customer_name || 'ไม่ระบุ', total_tasks: 0, postponed_tasks: 0, total_postpones: 0, reasons: {} };
      }
      const s = map[cid];
      s.total_tasks++;
      const changes = t.due_date_change_count || 0;
      if (changes > 0) {
        s.postponed_tasks++;
        s.total_postpones += changes;
      }
      (t.due_date_change_history || []).forEach(h => {
        if (h.reason) s.reasons[h.reason] = (s.reasons[h.reason] || 0) + 1;
      });
    });
    return Object.values(map).filter(s => s.total_postpones > 0).sort((a, b) => b.total_postpones - a.total_postpones);
  }, [filtered]);

  if (!currentUser) return null;
  const canView = ['admin', 'management', 'manager', 'super_supervisor'].includes(ac.role);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-amber-600" />
            Postpone Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            สถิติการเลื่อน Due Date — ใครเลื่อนบ่อย ลูกค้าไหนมีปัญหา เหตุผลอะไรที่เลื่อนมากสุด
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
          <PostponeSummaryCards tasks={filtered} postpones={allPostpones} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PostponeReasonChart postpones={allPostpones} />
            <PostponeTrendChart postpones={allPostpones} from={from} to={to} />
          </div>
          <PostponeByStaffTable staffStats={staffStats} />
          <PostponeByCustomerTable customerStats={customerStats} />
        </>
      )}
    </div>
  );
}