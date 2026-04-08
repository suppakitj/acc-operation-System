import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subMonths, isAfter, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Search, AlertTriangle, ChevronDown, ChevronRight, Filter,
  Calendar, Building2, ShieldAlert
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccessControl } from '../components/auth/useAccessControl';
import { useLanguage } from '../components/LanguageContext';
import FindingsCustomerRow from '../components/findings/FindingsCustomerRow';

const SEVERITY_CONFIG = {
  critical: { label: 'ร้ายแรง', emoji: '🔴', dotColor: '#dc2626' },
  medium:   { label: 'ปานกลาง', emoji: '🟡', dotColor: '#d97706' },
  low:      { label: 'เล็กน้อย', emoji: '🟢', dotColor: '#16a34a' },
};

const TIME_OPTIONS = [
  { value: '1', label: 'เดือนนี้' },
  { value: '3', label: '3 เดือน' },
  { value: '6', label: '6 เดือน' },
  { value: 'all', label: 'ทั้งหมด' },
];

const SEV_OPTIONS = [
  { value: 'all', label: 'ทุกระดับ' },
  { value: 'critical', label: '🔴 ร้ายแรงเท่านั้น' },
  { value: 'medium', label: '🟡 ปานกลางขึ้นไป' },
];

export default function FindingsDashboard() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const [timeFilter, setTimeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState({});

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
    staleTime: 3 * 60_000,
  });

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 60_000,
  });

  const customerMap = useMemo(() => {
    const map = {};
    allCustomers.forEach(c => { map[c.id] = c; });
    return map;
  }, [allCustomers]);

  // Filter tasks with findings
  const tasksWithFindings = useMemo(() => {
    let filtered = allTasks.filter(t => t.findings && t.findings.length > 0);
    if (timeFilter !== 'all') {
      const cutoff = subMonths(new Date(), parseInt(timeFilter));
      filtered = filtered.filter(t => {
        const d = t.completed_date || t.due_date || t.created_date;
        return d && isAfter(parseISO(d), cutoff);
      });
    }
    return filtered;
  }, [allTasks, timeFilter]);

  // Aggregate by customer
  const customerFindings = useMemo(() => {
    const map = {};
    tasksWithFindings.forEach(task => {
      const cid = task.customer_id;
      if (!cid) return;
      if (!map[cid]) {
        map[cid] = {
          customerId: cid,
          customerName: task.customer_name || customerMap[cid]?.company_name || 'ไม่ทราบชื่อ',
          critical: 0, medium: 0, low: 0, total: 0,
          lastVisitDate: null, tasks: [],
        };
      }
      const e = map[cid];
      task.findings.forEach(f => {
        const s = f.severity || 'medium';
        e[s] = (e[s] || 0) + 1;
        e.total++;
      });
      const d = task.completed_date || task.due_date || task.created_date;
      if (d && (!e.lastVisitDate || d > e.lastVisitDate)) e.lastVisitDate = d;
      e.tasks.push(task);
    });

    let results = Object.values(map);
    if (severityFilter === 'critical') results = results.filter(c => c.critical > 0);
    else if (severityFilter === 'medium') results = results.filter(c => c.critical > 0 || c.medium > 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(c => c.customerName.toLowerCase().includes(q));
    }
    results.sort((a, b) => b.critical - a.critical || b.medium - a.medium || b.total - a.total);
    return results;
  }, [tasksWithFindings, customerMap, severityFilter, searchQuery]);

  // Summary
  const summary = useMemo(() => {
    let totalCritical = 0, totalMedium = 0, totalLow = 0, worstCustomer = null, worstCritical = 0;
    customerFindings.forEach(c => {
      totalCritical += c.critical; totalMedium += c.medium; totalLow += c.low;
      if (c.critical > worstCritical) { worstCritical = c.critical; worstCustomer = c.customerName; }
    });
    return { totalCustomers: customerFindings.length, totalCritical, totalMedium, totalLow, worstCustomer, worstCritical };
  }, [customerFindings]);

  // Trend chart
  const trendData = useMemo(() => {
    const mm = {};
    tasksWithFindings.forEach(task => {
      const d = task.completed_date || task.due_date || task.created_date;
      if (!d) return;
      const mk = format(parseISO(d), 'yyyy-MM');
      if (!mm[mk]) mm[mk] = { month: mk, critical: 0, medium: 0, low: 0 };
      task.findings.forEach(f => { mm[mk][f.severity || 'medium']++; });
    });
    return Object.values(mm).sort((a, b) => a.month.localeCompare(b.month)).slice(-12)
      .map(d => ({ ...d, label: format(parseISO(d.month + '-01'), 'MMM yy', { locale: th }) }));
  }, [tasksWithFindings]);

  const toggleExpand = (id) => setExpandedCustomers(p => ({ ...p, [id]: !p[id] }));

  // Permission
  const canView = ac.canViewFindingsDashboard !== false;
  if (!canView && currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-muted-foreground">คุณไม่มีสิทธิ์ดูหน้า Findings Dashboard</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" /> Findings Dashboard
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">ภาพรวม Findings จากการตรวจสอบลูกค้าทุกราย</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Filter className="w-4 h-4 text-muted-foreground ml-1" />
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SEV_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Building2 className="w-4 h-4 text-blue-600" /><span className="text-[11px] text-muted-foreground font-medium">ลูกค้าที่มี Findings</span></div>
          <p className="text-2xl font-bold">{summary.totalCustomers}</p>
        </CardContent></Card>
        <Card className="border-red-200 bg-red-50/30"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><span className="text-sm">🔴</span><span className="text-[11px] text-muted-foreground font-medium">ร้ายแรง</span></div>
          <p className="text-2xl font-bold text-red-700">{summary.totalCritical}</p>
        </CardContent></Card>
        <Card className="border-yellow-200 bg-yellow-50/30"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><span className="text-sm">🟡</span><span className="text-[11px] text-muted-foreground font-medium">ปานกลาง</span></div>
          <p className="text-2xl font-bold text-yellow-700">{summary.totalMedium}</p>
        </CardContent></Card>
        <Card className="border-green-200 bg-green-50/30"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><span className="text-sm">🟢</span><span className="text-[11px] text-muted-foreground font-medium">เล็กน้อย</span></div>
          <p className="text-2xl font-bold text-green-700">{summary.totalLow}</p>
        </CardContent></Card>
        <Card className={summary.worstCritical >= 3 ? 'border-red-400 bg-red-50/50 ring-1 ring-red-300' : ''}><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-[11px] text-muted-foreground font-medium">Critical สูงสุด</span></div>
          {summary.worstCustomer ? (
            <div><p className="text-sm font-bold truncate">{summary.worstCustomer}</p><p className="text-xs text-red-600 font-medium">{summary.worstCritical} รายการ</p></div>
          ) : <p className="text-sm text-muted-foreground">-</p>}
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อลูกค้า..." className="pl-9 h-9 text-xs" />
      </div>

      {/* Customer Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Customer Findings Ranking
            <Badge variant="secondary" className="text-[10px] ml-auto">{customerFindings.length} ลูกค้า</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {customerFindings.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">ไม่พบ Findings ในช่วงเวลาที่เลือก</div>
          ) : (
            <div className="divide-y">
              <div className="hidden md:grid grid-cols-[2fr_80px_80px_80px_60px_100px_110px] gap-2 px-4 py-2 bg-muted/50 text-[11px] font-semibold text-muted-foreground">
                <span>ลูกค้า</span><span className="text-center">🔴 ร้ายแรง</span><span className="text-center">🟡 ปานกลาง</span><span className="text-center">🟢 เล็กน้อย</span><span className="text-center">รวม</span><span className="text-center">ครั้งล่าสุด</span><span className="text-center">สถานะ</span>
              </div>
              {customerFindings.map(c => (
                <FindingsCustomerRow
                  key={c.customerId}
                  data={c}
                  isExpanded={!!expandedCustomers[c.customerId]}
                  onToggle={() => toggleExpand(c.customerId)}
                  severityFilter={severityFilter}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">📊 Findings Trend (ต่อเดือน)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, name) => {
                    const l = { critical: '🔴 ร้ายแรง', medium: '🟡 ปานกลาง', low: '🟢 เล็กน้อย' };
                    return [v, l[name] || name];
                  }} />
                  <Legend formatter={v => { const l = { critical: '🔴 ร้ายแรง', medium: '🟡 ปานกลาง', low: '🟢 เล็กน้อย' }; return <span className="text-xs">{l[v] || v}</span>; }} />
                  <Bar dataKey="critical" fill="#dc2626" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="medium" fill="#d97706" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="low" fill="#16a34a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}