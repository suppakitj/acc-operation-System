import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '../components/auth/useAccessControl';
import { useLanguage } from '../components/LanguageContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ClipboardCheck, Search, CheckCircle2, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, ShieldAlert
} from 'lucide-react';

const OBLIGATIONS = [
  { value: 'pnd1_monthly', label: 'ภงด.1', freq: 'monthly', dueDay: 15 },
  { value: 'pnd1k_yearly', label: 'ภงด.1ก', freq: 'yearly', dueMonth: 2 },
  { value: 'pnd3_monthly', label: 'ภงด.3', freq: 'monthly', dueDay: 15 },
  { value: 'pnd53_monthly', label: 'ภงด.53', freq: 'monthly', dueDay: 15 },
  { value: 'pnd54_monthly', label: 'ภงด.54', freq: 'monthly', dueDay: 15 },
  { value: 'pp30_monthly', label: 'ภ.พ.30', freq: 'monthly', dueDay: 23 },
  { value: 'pp36_monthly', label: 'ภ.พ.36', freq: 'monthly', dueDay: 15 },
  { value: 'sso_monthly', label: 'ประกันสังคม', freq: 'monthly', dueDay: 25 },
  { value: 'pnd90_director', label: 'ภงด.90', freq: 'yearly', dueMonth: 3 },
  { value: 'pnd91_director', label: 'ภงด.91', freq: 'yearly', dueMonth: 3 },
  { value: 'pnd50_half', label: 'ภงด.50(ครึ่งปี)', freq: 'yearly', dueMonth: 8 },
  { value: 'pnd51_half', label: 'ภงด.51(ครึ่งปี)', freq: 'yearly', dueMonth: 8 },
  { value: 'pnd50_annual', label: 'ภงด.50(ปี)', freq: 'yearly', dueMonth: 5 },
  { value: 'audit_annual', label: 'ตรวจสอบงบ', freq: 'yearly', dueMonth: 5 },
  { value: 'dbd_filing', label: 'ยื่นงบDBD', freq: 'yearly', dueMonth: 5 },
  { value: 'disclosure_form', label: 'Disclosure Form', freq: 'yearly', dueMonth: 5 },
  { value: 'boj5_annual', label: 'บอจ.5', freq: 'yearly', dueMonth: 5 },
];

const CELL_CONFIG = {
  done:        { icon: '✅', bg: 'bg-green-50', title: 'เสร็จแล้ว' },
  in_progress: { icon: '🔄', bg: 'bg-blue-50', title: 'กำลังทำ' },
  overdue:     { icon: '🔴', bg: 'bg-red-50', title: 'เกินกำหนด' },
  missing:     { icon: '❌', bg: 'bg-red-100', title: 'ไม่มี task (เลยกำหนด)' },
  no_task:     { icon: '⏳', bg: 'bg-amber-50', title: 'ยังไม่มี task' },
  na:          { icon: '—', bg: '', title: 'ไม่มีภาระนี้' },
};

export default function ObligationDashboard() {
  const { t } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const ac = useAccessControl(currentUser);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'active' }, 'company_name', 500),
    staleTime: 120_000,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks-obligation'],
    queryFn: () => base44.entities.Task.list('-created_date', 2000),
    staleTime: 3 * 60_000,
  });

  // Build obligation matrix
  const matrix = useMemo(() => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const targetMonth = `${selectedYear}-${monthStr}`;

    const relevantObligations = OBLIGATIONS.filter(ob => {
      if (ob.freq === 'monthly') return true;
      if (ob.freq === 'yearly') return ob.dueMonth === selectedMonth;
      return false;
    });

    const rows = customers
      .filter(c => c.obligations && c.obligations.length > 0)
      .map(customer => {
        const customerObligations = customer.obligations || [];
        const customerTasks = tasks.filter(t =>
          t.customer_id === customer.id &&
          t.due_date && t.due_date.startsWith(targetMonth)
        );

        const cells = {};
        let doneCount = 0;
        let pendingCount = 0;
        let overdueCount = 0;

        relevantObligations.forEach(ob => {
          if (!customerObligations.includes(ob.value)) {
            cells[ob.value] = 'na';
            return;
          }

          const matchTask = customerTasks.find(t => t.service_type === ob.value);

          if (!matchTask) {
            const today = new Date();
            const dueDate = new Date(`${targetMonth}-${String(ob.dueDay || 15).padStart(2, '0')}`);
            if (dueDate < today) {
              cells[ob.value] = 'missing';
              overdueCount++;
            } else {
              cells[ob.value] = 'no_task';
              pendingCount++;
            }
            return;
          }

          if (matchTask.status === 'completed') {
            cells[ob.value] = 'done';
            doneCount++;
          } else if (matchTask.status === 'cancelled') {
            cells[ob.value] = 'na';
          } else {
            const today = new Date();
            const dueDate = new Date(matchTask.due_date);
            if (dueDate < today) {
              cells[ob.value] = 'overdue';
              overdueCount++;
            } else {
              cells[ob.value] = 'in_progress';
              pendingCount++;
            }
          }
        });

        return {
          customer,
          cells,
          doneCount,
          pendingCount,
          overdueCount,
          totalRelevant: relevantObligations.filter(ob => customerObligations.includes(ob.value)).length,
        };
      })
      .filter(row => row.totalRelevant > 0);

    return { rows, relevantObligations };
  }, [customers, tasks, selectedMonth, selectedYear]);

  // Stats
  const stats = useMemo(() => {
    const totalCustomers = matrix.rows.length;
    const allDone = matrix.rows.filter(r => r.overdueCount === 0 && r.pendingCount === 0).length;
    const hasOverdue = matrix.rows.filter(r => r.overdueCount > 0).length;
    const totalObligations = matrix.rows.reduce((s, r) => s + r.totalRelevant, 0);
    const totalDone = matrix.rows.reduce((s, r) => s + r.doneCount, 0);
    const completionRate = totalObligations > 0 ? Math.round((totalDone / totalObligations) * 100) : 0;
    return { totalCustomers, allDone, hasOverdue, completionRate };
  }, [matrix]);

  // Filter rows
  const filteredRows = useMemo(() => {
    let rows = matrix.rows;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.customer.company_name?.toLowerCase().includes(q));
    }
    if (statusFilter === 'overdue') rows = rows.filter(r => r.overdueCount > 0);
    if (statusFilter === 'pending') rows = rows.filter(r => r.pendingCount > 0);
    if (statusFilter === 'done') rows = rows.filter(r => r.overdueCount === 0 && r.pendingCount === 0);

    return rows.sort((a, b) => {
      if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
      if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
      return (a.customer.company_name || '').localeCompare(b.customer.company_name || '');
    });
  }, [matrix, search, statusFilter]);

  // Permission
  if (!currentUser) return null;
  if (!ac.canViewObligationDashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  const isLoading = loadingCustomers || loadingTasks;

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const completionColor = stats.completionRate >= 80 ? 'text-green-600' : stats.completionRate >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-blue-600" />
          {t('obligation_dashboard_title')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{t('obligation_dashboard_subtitle')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><ClipboardCheck className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-lg font-bold">{stats.totalCustomers}</p><p className="text-[10px] text-muted-foreground">{t('obligation_customers_with')}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-lg font-bold text-green-600">{stats.allDone}</p><p className="text-[10px] text-muted-foreground">{t('obligation_all_done')}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-lg font-bold text-red-600">{stats.hasOverdue}</p><p className="text-[10px] text-muted-foreground">{t('obligation_has_overdue')}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className={`text-lg font-bold ${completionColor}`}>{stats.completionRate}%</p><p className="text-[10px] text-muted-foreground">{t('obligation_completion')}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: th })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="overdue">มีเกินกำหนด</SelectItem>
            <SelectItem value="pending">ยังไม่เสร็จ</SelectItem>
            <SelectItem value="done">เสร็จครบ</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground ml-auto hidden sm:block">{filteredRows.length} / {matrix.rows.length} ราย</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">✅ {t('obligation_status_done')}</span>
        <span className="flex items-center gap-1">🔄 {t('obligation_status_progress')}</span>
        <span className="flex items-center gap-1">⏳ {t('obligation_status_no_task')}</span>
        <span className="flex items-center gap-1">🔴 {t('obligation_status_overdue')}</span>
        <span className="flex items-center gap-1">❌ {t('obligation_status_missing')}</span>
        <span className="flex items-center gap-1">— {t('obligation_status_na')}</span>
      </div>

      {/* Matrix Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลด...</div>
      ) : matrix.rows.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t('obligation_empty')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('obligation_empty_hint')}</p>
          </CardContent>
        </Card>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">ไม่พบลูกค้าที่ตรงกับเงื่อนไข</div>
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground sticky left-0 bg-muted/20 z-10 min-w-[180px]">
                  ลูกค้า
                </th>
                {matrix.relevantObligations.map(ob => (
                  <th key={ob.value} className="px-2 py-2.5 text-[10px] font-semibold text-muted-foreground text-center min-w-[70px]">
                    {ob.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center min-w-[60px]">
                  สรุป
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={row.customer.id} className={`border-b last:border-b-0 hover:bg-muted/5 ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                  <td className="px-3 py-2 sticky left-0 bg-card z-10">
                    <p className="text-xs font-medium truncate max-w-[180px]">{row.customer.company_name}</p>
                  </td>
                  {matrix.relevantObligations.map(ob => {
                    const status = row.cells[ob.value] || 'na';
                    const config = CELL_CONFIG[status];
                    return (
                      <td key={ob.value} className={`px-2 py-2 text-center ${config.bg}`} title={config.title}>
                        <span className="text-sm">{config.icon}</span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-bold ${
                      row.overdueCount > 0 ? 'text-red-600' :
                      row.pendingCount > 0 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {row.doneCount}/{row.totalRelevant}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}