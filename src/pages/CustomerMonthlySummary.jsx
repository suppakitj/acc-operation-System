import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '../components/auth/useAccessControl';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileBarChart, Search, ChevronLeft, ChevronRight,
  AlertTriangle, Clock, Building2, TrendingUp, ShieldAlert
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SummaryStatCards from '../components/customer-summary/SummaryStatCards';
import CustomerSummaryCard from '../components/customer-summary/CustomerSummaryCard';

const MONTH_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export default function CustomerMonthlySummary() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('issues');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'], queryFn: () => base44.auth.me(),
  });
  const ac = useAccessControl(currentUser);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-active'],
    queryFn: () => base44.entities.Customer.filter({ status: 'active' }, 'company_name', 500),
    staleTime: 2 * 60_000,
  });

  const { data: allTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks-summary'],
    queryFn: () => base44.entities.Task.list('-created_date', 3000),
    staleTime: 3 * 60_000,
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['timeEntries-summary'],
    queryFn: () => base44.entities.TimeEntry.list('-start_time', 3000),
    staleTime: 3 * 60_000,
  });

  const summaryData = useMemo(() => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const targetMonth = `${selectedYear}-${monthStr}`;
    const monthStart = `${targetMonth}-01`;
    const monthEnd = `${targetMonth}-31`;

    return customers.map(customer => {
      const customerTasks = allTasks.filter(t =>
        t.customer_id === customer.id &&
        t.due_date && t.due_date >= monthStart && t.due_date <= monthEnd
      );

      const completed = customerTasks.filter(t => t.status === 'completed');
      const inProgress = customerTasks.filter(t => t.status === 'in_progress' || t.status === 'review');
      const overdue = customerTasks.filter(t =>
        t.due_date && new Date(t.due_date) < new Date() &&
        !['completed', 'cancelled'].includes(t.status)
      );
      const pending = customerTasks.filter(t => t.status === 'pending');
      const onTime = completed.filter(t => t.completed_date && t.completed_date <= t.due_date);
      const onTimeRate = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : null;

      const customerObligations = customer.obligations || [];
      const obligationStatus = {};
      let obligationDone = 0;
      let obligationTotal = 0;

      customerObligations.forEach(ob => {
        const matchTask = customerTasks.find(t => t.service_type === ob);
        if (matchTask) {
          obligationStatus[ob] = matchTask.status === 'completed' ? 'done' : 'pending';
          if (matchTask.status === 'completed') obligationDone++;
        } else {
          obligationStatus[ob] = 'no_task';
        }
        obligationTotal++;
      });

      const customerTime = allTimeEntries.filter(te =>
        te.customer_id === customer.id &&
        te.start_time && te.start_time >= monthStart && te.start_time <= monthEnd + 'T23:59:59'
      );
      const totalMinutes = customerTime.reduce((s, te) => s + (te.duration_minutes || 0), 0);
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

      const assignees = {};
      customerTasks.forEach(t => {
        if (t.assigned_name) assignees[t.assigned_name] = (assignees[t.assigned_name] || 0) + 1;
      });
      const topAssignee = Object.entries(assignees).sort((a, b) => b[1] - a[1])[0]?.[0] || customer.primary_officer_name || '—';

      const issueCount = overdue.length + (obligationTotal - obligationDone);

      return {
        customer,
        tasks: { total: customerTasks.length, completed: completed.length, inProgress: inProgress.length, overdue: overdue.length, pending: pending.length, onTimeRate },
        obligations: { status: obligationStatus, done: obligationDone, total: obligationTotal },
        time: { totalMinutes, totalHours },
        topAssignee,
        issueCount,
        taskList: customerTasks,
      };
    }).filter(s => s.tasks.total > 0 || s.obligations.total > 0);
  }, [customers, allTasks, allTimeEntries, selectedMonth, selectedYear]);

  const overallStats = useMemo(() => {
    const totalCustomers = summaryData.length;
    const totalTasks = summaryData.reduce((s, d) => s + d.tasks.total, 0);
    const totalCompleted = summaryData.reduce((s, d) => s + d.tasks.completed, 0);
    const totalOverdue = summaryData.reduce((s, d) => s + d.tasks.overdue, 0);
    const customersWithIssues = summaryData.filter(d => d.issueCount > 0).length;
    const totalHours = Math.round(summaryData.reduce((s, d) => s + d.time.totalHours, 0) * 10) / 10;
    const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    return { totalCustomers, totalTasks, totalCompleted, totalOverdue, customersWithIssues, totalHours, completionRate };
  }, [summaryData]);

  const displayData = useMemo(() => {
    let data = summaryData;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(d => d.customer.company_name?.toLowerCase().includes(q));
    }
    if (sortBy === 'issues') data = [...data].sort((a, b) => b.issueCount - a.issueCount);
    else if (sortBy === 'tasks') data = [...data].sort((a, b) => b.tasks.total - a.tasks.total);
    else if (sortBy === 'name') data = [...data].sort((a, b) => (a.customer.company_name || '').localeCompare(b.customer.company_name || ''));
    else if (sortBy === 'hours') data = [...data].sort((a, b) => b.time.totalHours - a.time.totalHours);
    return data;
  }, [summaryData, search, sortBy]);

  if (!currentUser) return null;
  if (!ac.canViewCustomerSummary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  const chartData = summaryData
    .filter(d => d.time.totalHours > 0)
    .sort((a, b) => b.time.totalHours - a.time.totalHours)
    .slice(0, 10)
    .map(d => ({
      name: d.customer.company_name?.length > 15
        ? d.customer.company_name.slice(0, 15) + '...'
        : d.customer.company_name,
      hours: d.time.totalHours,
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-blue-600" />
          Customer Monthly Summary
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          สรุปผลงานรายลูกค้าประจำเดือน — สำหรับผู้บริหาร
        </p>
      </div>

      {/* Month navigator + search + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => {
              if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
              else setSelectedMonth(m => m - 1);
            }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {MONTH_FULL[selectedMonth - 1]} {selectedYear + 543}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => {
              if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
              else setSelectedMonth(m => m + 1);
            }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="issues">ปัญหามากที่สุด</SelectItem>
            <SelectItem value="tasks">งานมากที่สุด</SelectItem>
            <SelectItem value="name">ชื่อ ก-ฮ</SelectItem>
            <SelectItem value="hours">เวลามากที่สุด</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SummaryStatCards stats={overallStats} />

      {/* Top hours chart */}
      {chartData.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">เวลาที่ใช้ต่อลูกค้า (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v} ชม.`, 'เวลาที่ใช้']} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Customer cards */}
      {loadingTasks ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลด...</div>
      ) : displayData.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="p-8 text-center">
            <FileBarChart className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">ไม่มีข้อมูลงานในเดือนนี้</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {displayData.map(d => (
            <CustomerSummaryCard key={d.customer.id} data={d} />
          ))}
        </div>
      )}
    </div>
  );
}