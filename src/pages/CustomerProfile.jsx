import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, ClipboardList, Clock, BarChart3 } from 'lucide-react';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { usePermissionMatrix, getPerm } from '@/hooks/usePermissionMatrix';
import CustomerProfileStats from '@/components/customer-profile/CustomerProfileStats';
import CustomerTaskList from '@/components/customer-profile/CustomerTaskList';
import CustomerTimeBreakdown from '@/components/customer-profile/CustomerTimeBreakdown';

export default function CustomerProfile() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const matrix = usePermissionMatrix();
  const role = currentUser?.role || 'staff';
  const canView = getPerm(matrix, 'customer_profile', role) !== 'no';

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [search, setSearch] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'active' }, 'company_name', 1000),
    staleTime: 2 * 60_000,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => base44.entities.Task.list('-created_date', 5000),
    staleTime: 60_000,
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 5000),
    staleTime: 60_000,
  });

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const s = search.toLowerCase();
    return customers.filter(c =>
      c.company_name?.toLowerCase().includes(s) ||
      c.company_name_en?.toLowerCase().includes(s) ||
      c.customer_code?.toLowerCase().includes(s)
    );
  }, [customers, search]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const customerTasks = useMemo(() => {
    if (!selectedCustomerId) return [];
    return allTasks
      .filter(t => t.customer_id === selectedCustomerId)
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
  }, [allTasks, selectedCustomerId]);

  const customerTimeEntries = useMemo(() => {
    if (!selectedCustomerId) return [];
    return allTimeEntries.filter(e => e.customer_id === selectedCustomerId && !e.is_running && e.duration_minutes);
  }, [allTimeEntries, selectedCustomerId]);

  if (!canView) {
    return <div className="text-center py-12 text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  // Status summary for the overview table
  const customerOverview = useMemo(() => {
    return filteredCustomers.map(c => {
      const tasks = allTasks.filter(t => t.customer_id === c.id);
      const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const overdue = tasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        return t.due_date && new Date(t.due_date) < new Date();
      }).length;
      const mins = allTimeEntries
        .filter(e => e.customer_id === c.id && !e.is_running && e.duration_minutes)
        .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
      return { ...c, totalTasks: tasks.length, active, completed, overdue, totalMinutes: mins };
    }).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [filteredCustomers, allTasks, allTimeEntries]);

  const formatHours = (mins) => {
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Customer Profile Dashboard
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">สรุปข้อมูลรายลูกค้า — Task, เวลา, สถานะงาน</p>
      </div>

      {/* Search & Select */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาลูกค้า..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Overview Table */}
      {!selectedCustomerId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ภาพรวมลูกค้าทั้งหมด ({customerOverview.length} ราย)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">ลูกค้า</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center">งานทั้งหมด</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center hidden sm:table-cell">กำลังทำ</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center hidden sm:table-cell">เสร็จ</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center">เกินกำหนด</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center hidden md:table-cell">เวลารวม</th>
                  </tr>
                </thead>
                <tbody>
                  {customerOverview.map(c => (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedCustomerId(c.id)}
                    >
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium truncate max-w-[200px]">{c.company_name}</p>
                        {c.customer_code && <p className="text-[10px] text-muted-foreground">{c.customer_code}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold">{c.totalTasks}</td>
                      <td className="px-3 py-2.5 text-center text-xs hidden sm:table-cell">
                        {c.active > 0 ? <Badge variant="secondary" className="text-[9px] bg-blue-50 text-blue-700">{c.active}</Badge> : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs hidden sm:table-cell">
                        {c.completed > 0 ? <Badge variant="secondary" className="text-[9px] bg-emerald-50 text-emerald-700">{c.completed}</Badge> : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs">
                        {c.overdue > 0 ? <Badge variant="destructive" className="text-[9px]">{c.overdue}</Badge> : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground hidden md:table-cell">{formatHours(c.totalMinutes)}</td>
                    </tr>
                  ))}
                  {customerOverview.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">ไม่พบลูกค้า</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Detail View */}
      {selectedCustomerId && selectedCustomer && (
        <div className="space-y-4">
          {/* Back + Customer Info */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCustomerId('')} className="text-xs text-primary hover:underline">← กลับ</button>
            <div>
              <h2 className="text-lg font-bold">{selectedCustomer.company_name}</h2>
              <div className="flex flex-wrap gap-2 mt-0.5">
                {selectedCustomer.customer_code && <Badge variant="outline" className="text-[10px]">{selectedCustomer.customer_code}</Badge>}
                {selectedCustomer.supervisor_name && <span className="text-[10px] text-muted-foreground">หัวหน้าดูแล: {selectedCustomer.supervisor_name}</span>}
                {selectedCustomer.primary_officer_name && <span className="text-[10px] text-muted-foreground">เจ้าหน้าที่: {selectedCustomer.primary_officer_name}</span>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <CustomerProfileStats tasks={customerTasks} timeEntries={customerTimeEntries} />

          {/* Tabs */}
          <Tabs defaultValue="tasks" className="space-y-3">
            <TabsList>
              <TabsTrigger value="tasks" className="gap-1.5 text-xs"><ClipboardList className="w-3.5 h-3.5" /> Task ทั้งหมด ({customerTasks.length})</TabsTrigger>
              <TabsTrigger value="time" className="gap-1.5 text-xs"><Clock className="w-3.5 h-3.5" /> เวลาที่ใช้</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks">
              <Card>
                <CardContent className="p-0">
                  <CustomerTaskList tasks={customerTasks} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="time">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">สรุปเวลาที่ใช้ — แยกตามบริการ & พนักงาน</CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerTimeBreakdown timeEntries={customerTimeEntries} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}