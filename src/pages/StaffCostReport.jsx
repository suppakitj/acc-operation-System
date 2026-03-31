import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { DollarSign, ShieldAlert } from 'lucide-react';
import { useUserList } from '@/hooks/useUserList';

import StaffCostFilters from '../components/staff-cost/StaffCostFilters';
import StaffCostStatCards from '../components/staff-cost/StaffCostStatCards';
import StaffCostTable from '../components/staff-cost/StaffCostTable';
import CostByServiceChart from '../components/staff-cost/CostByServiceChart';
import CostTimelineChart from '../components/staff-cost/CostTimelineChart';

function getDateRange(period, dateFrom, dateTo) {
  const now = new Date();
  if (period === 'this_month') return { start: startOfMonth(now), end: endOfMonth(now) };
  if (period === 'this_quarter') return { start: startOfQuarter(now), end: endOfQuarter(now) };
  if (period === 'this_year') return { start: startOfYear(now), end: endOfYear(now) };
  if (period === 'custom' && dateFrom && dateTo) {
    return { start: new Date(dateFrom), end: new Date(dateTo + 'T23:59:59') };
  }
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export default function StaffCostReport() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: users = [] } = useUserList();
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-start_time', 2000),
    staleTime: 5 * 60_000,
  });

  const [filters, setFilters] = useState({
    period: 'this_month',
    dateFrom: '',
    dateTo: '',
    department: 'all',
    serviceType: 'all',
    selectedUser: 'all',
  });

  const role = currentUser?.role;

  const dateRange = useMemo(() => getDateRange(filters.period, filters.dateFrom, filters.dateTo), [filters.period, filters.dateFrom, filters.dateTo]);

  // User cost map
  const userCostMap = useMemo(() => Object.fromEntries(users.map(u => [u.email, u.hourly_cost || 0])), [users]);
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.email, u])), [users]);

  // Manager: filter users to own department only
  const managerDepts = useMemo(() => {
    if (role !== 'manager' || !currentUser) return null;
    return currentUser.departments?.length ? currentUser.departments : currentUser.department ? [currentUser.department] : [];
  }, [currentUser, role]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return timeEntries.filter(e => {
      if (!e.start_time || !e.duration_minutes) return false;
      const d = new Date(e.start_time);
      if (d < dateRange.start || d > dateRange.end) return false;
      if (filters.department !== 'all' && e.department !== filters.department) return false;
      if (filters.serviceType !== 'all' && e.service_type !== filters.serviceType) return false;
      if (filters.selectedUser !== 'all' && e.user_email !== filters.selectedUser) return false;
      // Manager restriction
      if (managerDepts) {
        const u = userMap[e.user_email];
        const uDepts = u?.departments?.length ? u.departments : u?.department ? [u.department] : [];
        if (!uDepts.some(d => managerDepts.includes(d))) return false;
      }
      return true;
    });
  }, [timeEntries, dateRange, filters, managerDepts, userMap]);

  // Compute stats
  const totalMinutes = useMemo(() => filteredEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0), [filteredEntries]);
  const totalCost = useMemo(() => filteredEntries.reduce((s, e) => s + ((e.duration_minutes || 0) / 60) * (userCostMap[e.user_email] || 0), 0), [filteredEntries, userCostMap]);

  // Staff data grouped
  const staffData = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      const email = e.user_email;
      if (!map[email]) {
        const u = userMap[email] || {};
        map[email] = {
          email,
          name: u.initials || u.nickname || u.full_name || e.user_name || email,
          initials: u.initials || '',
          position: u.position || '',
          department: u.department || e.department || '',
          rate: userCostMap[email] || 0,
          totalMinutes: 0,
          totalCost: 0,
          taskCount: 0,
          taskSet: new Set(),
          serviceBreakdown: {},
          byCustomer: {},
        };
      }
      const s = map[email];
      const mins = e.duration_minutes || 0;
      s.totalMinutes += mins;
      s.totalCost += (mins / 60) * s.rate;
      if (e.task_id) s.taskSet.add(e.task_id);
      s.serviceBreakdown[e.service_type] = (s.serviceBreakdown[e.service_type] || 0) + mins;
      const custKey = e.customer_id || '_none';
      if (!s.byCustomer[custKey]) s.byCustomer[custKey] = { name: e.customer_name || '', minutes: 0 };
      s.byCustomer[custKey].minutes += mins;
    });

    return Object.values(map).map(s => ({
      ...s,
      taskCount: s.taskSet.size,
      taskSet: undefined,
      byCustomer: Object.values(s.byCustomer).sort((a, b) => b.minutes - a.minutes),
    }));
  }, [filteredEntries, userMap, userCostMap]);

  const staffCount = staffData.length;

  // Export CSV
  const handleExportCSV = () => {
    const header = 'พนักงาน,แผนก,ตำแหน่ง,ชั่วโมง,อัตรา/ชม,ต้นทุนรวม,Tasks\n';
    const rows = staffData.map(s => {
      const hours = (s.totalMinutes / 60).toFixed(1);
      return `"${s.name}","${s.department}","${s.position}",${hours},${s.rate},${Math.round(s.totalCost)},${s.taskCount}`;
    }).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_cost_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter users for selector (manager sees own dept only)
  const selectableUsers = useMemo(() => {
    let list = users.filter(u => u.user_status !== 'inactive');
    if (managerDepts) {
      list = list.filter(u => {
        const uDepts = u.departments?.length ? u.departments : u.department ? [u.department] : [];
        return uDepts.some(d => managerDepts.includes(d));
      });
    }
    return list;
  }, [users, managerDepts]);

  // Access control
  if (role && !['admin', 'management', 'manager'].includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-muted-foreground mt-1">เฉพาะ Admin, Management และ Manager เท่านั้น</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Staff Cost Report</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">วิเคราะห์ต้นทุนเวลาของพนักงาน — ดึงข้อมูลจาก Time Tracking</p>
      </div>

      {/* Filters */}
      <StaffCostFilters filters={filters} setFilters={setFilters} users={selectableUsers} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          {/* Stat Cards */}
          <StaffCostStatCards totalMinutes={totalMinutes} totalCost={totalCost} staffCount={staffCount} />

          {/* Staff Cost Table */}
          <StaffCostTable staffData={staffData} onExportCSV={handleExportCSV} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CostByServiceChart filteredEntries={filteredEntries} userCostMap={userCostMap} />
            <CostTimelineChart filteredEntries={filteredEntries} userCostMap={userCostMap} dateRange={dateRange} />
          </div>
        </>
      )}
    </div>
  );
}