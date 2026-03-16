import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Settings, CheckCircle, Clock, AlertTriangle, AlertOctagon, RefreshCw, MoreVertical } from 'lucide-react';
import { format, differenceInDays, parseISO, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';
import PeakLicenseForm from '../components/peak/PeakLicenseForm';
import PeakNotificationSettings from '../components/peak/PeakNotificationSettings';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const PKG_COLORS = { basic: 'bg-blue-50 text-blue-600 border-blue-200', pro: 'bg-purple-50 text-purple-600 border-purple-200', pro_plus: 'bg-amber-50 text-amber-600 border-amber-200' };
const PKG_LABELS = { basic: 'BASIC', pro: 'PRO', pro_plus: 'PRO Plus' };
const PAYER_LABELS = { customer_direct_peak: 'Client Pays', customer_via_acc: 'Client via ACC', acc_pay_for_customer: 'ACC Pays for Client' };

const STATUS_CONFIG = {
  active: { label: 'Active', dot: 'bg-green-500' },
  expiring_soon: { label: 'Expiring', dot: 'bg-yellow-500' },
  waiting_customer_confirm: { label: 'Waiting Confirm', dot: 'bg-blue-500' },
  waiting_acc_payment: { label: 'Waiting ACC', dot: 'bg-orange-500' },
  waiting_customer_reimburse: { label: 'Waiting Reimburse', dot: 'bg-orange-500' },
  invoiced_waiting_payment: { label: 'Invoice Pending', dot: 'bg-yellow-500' },
  renewed: { label: 'Renewed', dot: 'bg-green-500' },
  expired: { label: 'Expired', dot: 'bg-red-500' },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-400' },
};

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring ≤30d' },
  { key: 'expired', label: 'Expired' },
  { key: 'renewed', label: 'Renewed' },
  { key: 'all', label: 'All Records' },
];

export default function PeakAccount() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'management';
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [pkgFilter, setPkgFilter] = useState('all');
  const [payerFilter, setPayerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [checkFilters, setCheckFilters] = useState({
    acc_prepaid: false,
    customer_paid_back: false,
    invoice_issued: false,
    invoice_paid: false,
    wht_received: false,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['peakLicenses'],
    queryFn: () => base44.entities.PeakLicense.list('-created_date', 500),
  });

  if (!ac.canViewPeakAccount) {
    return <div className="text-center py-12 text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (data.payment_date && !data.expiry_date) {
        data.expiry_date = format(addDays(parseISO(data.payment_date), 365), 'yyyy-MM-dd');
      }
      return base44.entities.PeakLicense.create(data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['peakLicenses'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PeakLicense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['peakLicenses'] }); setShowForm(false); setEditingLicense(null); },
  });

  const handleSubmit = (data) => {
    if (editingLicense) updateMutation.mutate({ id: editingLicense.id, data });
    else createMutation.mutate(data);
  };

  const today = new Date();
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);

  // Compute days left for each license
  const enriched = useMemo(() => licenses.map(l => {
    const daysLeft = l.expiry_date ? differenceInDays(parseISO(l.expiry_date), today) : null;
    return { ...l, daysLeft };
  }), [licenses]);

  // Stats
  const stats = useMemo(() => ({
    activeGt30: enriched.filter(l => (l.license_status === 'active' || l.license_status === 'renewed') && (l.daysLeft === null || l.daysLeft > 30)).length,
    expiring30: enriched.filter(l => l.daysLeft !== null && l.daysLeft > 15 && l.daysLeft <= 30).length,
    expiring15: enriched.filter(l => l.daysLeft !== null && l.daysLeft > 7 && l.daysLeft <= 15).length,
    expiring7: enriched.filter(l => l.daysLeft !== null && l.daysLeft >= 0 && l.daysLeft <= 7).length,
    expired: enriched.filter(l => l.license_status === 'expired' || (l.daysLeft !== null && l.daysLeft < 0)).length,
    renewedThisMonth: enriched.filter(l => {
      if (l.license_status !== 'renewed') return false;
      if (!l.updated_date) return false;
      const d = parseISO(l.updated_date);
      return d >= thisMonthStart && d <= thisMonthEnd;
    }).length,
  }), [enriched]);

  // Tab filtering
  const tabFiltered = useMemo(() => {
    return enriched.filter(l => {
      if (activeTab === 'active') return (l.license_status === 'active' || l.license_status === 'renewed') && (l.daysLeft === null || l.daysLeft > 0);
      if (activeTab === 'expiring') return l.daysLeft !== null && l.daysLeft >= 0 && l.daysLeft <= 30;
      if (activeTab === 'expired') return l.license_status === 'expired' || (l.daysLeft !== null && l.daysLeft < 0);
      if (activeTab === 'renewed') return l.license_status === 'renewed';
      return true;
    });
  }, [enriched, activeTab]);

  // Additional filters
  const filtered = useMemo(() => {
    return tabFiltered.filter(l => {
      if (search) {
        const s = search.toLowerCase();
        if (!l.customer_name?.toLowerCase().includes(s)) return false;
      }
      if (pkgFilter !== 'all' && l.package_type !== pkgFilter) return false;
      if (payerFilter !== 'all' && l.payer_type !== payerFilter) return false;
      if (statusFilter !== 'all' && l.license_status !== statusFilter) return false;
      if (staffFilter !== 'all' && l.created_by !== staffFilter) return false;
      if (checkFilters.acc_prepaid && !l.acc_prepaid) return false;
      if (checkFilters.customer_paid_back && !l.customer_paid_back) return false;
      if (checkFilters.invoice_issued && !l.invoice_issued) return false;
      if (checkFilters.invoice_paid && !l.invoice_paid) return false;
      if (checkFilters.wht_received && !l.wht_received) return false;
      return true;
    });
  }, [tabFiltered, search, pkgFilter, payerFilter, statusFilter, staffFilter, checkFilters]);

  // Unique staff from licenses
  const staffList = useMemo(() => {
    const emails = [...new Set(licenses.map(l => l.created_by).filter(Boolean))];
    return emails.map(email => {
      const u = users.find(u => u.email === email);
      return { email, name: u?.full_name || email };
    });
  }, [licenses, users]);

  const getStaffName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.full_name?.split(' ')[0] || email?.split('@')[0] || '—';
  };

  const getLastReminder = (l) => {
    if (!l.notification_history?.length) return '—';
    const last = l.notification_history[l.notification_history.length - 1];
    return last.date || '—';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Licensing Peak Account</h1>
          <p className="text-xs text-muted-foreground">จัดการ Peak Account License ของลูกค้า</p>
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-auto">
          {isAdmin && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowNotifSettings(true)}>
              <Settings className="w-3.5 h-3.5" /> ตั้งค่าแจ้งเตือน
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditingLicense(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> สมัคร / ต่ออายุ
          </Button>
        </div>
      </div>

      {/* Stat Cards - matching reference image */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard label="ACTIVE (>30D)" value={stats.activeGt30} icon={<CheckCircle className="w-4 h-4" />} borderColor="border-green-400" iconColor="text-green-500" />
        <StatCard label="EXPIRING 30D" value={stats.expiring30} icon={<Clock className="w-4 h-4" />} borderColor="border-red-400" iconColor="text-red-500" />
        <StatCard label="EXPIRING 15D" value={stats.expiring15} icon={<Clock className="w-4 h-4" />} borderColor="border-gray-200" iconColor="text-blue-500" />
        <StatCard label="EXPIRING 7D" value={stats.expiring7} icon={<AlertTriangle className="w-4 h-4" />} borderColor="border-gray-200" iconColor="text-yellow-500" />
        <StatCard label="EXPIRED" value={stats.expired} icon={<AlertOctagon className="w-4 h-4" />} borderColor="border-gray-200" iconColor="text-red-500" />
        <StatCard label="RENEWED THIS M..." value={stats.renewedThisMonth} icon={<RefreshCw className="w-4 h-4" />} borderColor="border-gray-200" iconColor="text-gray-500" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search client, invoice..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-xs" />
          </div>
          <Select value={pkgFilter} onValueChange={setPkgFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs"><SelectValue placeholder="All Packages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Packages</SelectItem>
              {Object.entries(PKG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={payerFilter} onValueChange={setPayerFilter}>
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs"><SelectValue placeholder="All Payment Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Types</SelectItem>
              {Object.entries(PAYER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="All Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map(s => <SelectItem key={s.email} value={s.email}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">{filtered.length} of {licenses.length} records</p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">ไม่มีข้อมูล</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Package</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Payment Type</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Payment Date</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Expiry Date</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Days Left</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Staff</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Invoice</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Last Reminder</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-2 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const isExpiring = l.daysLeft !== null && l.daysLeft >= 0 && l.daysLeft <= 30;
                const isExpired = l.daysLeft !== null && l.daysLeft < 0;
                const sc = STATUS_CONFIG[l.license_status] || STATUS_CONFIG.active;

                return (
                  <tr key={l.id}
                    className="border-b last:border-b-0 hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => { setEditingLicense(l); setShowForm(true); }}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{l.customer_name}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 rounded ${PKG_COLORS[l.package_type]}`}>
                        {PKG_LABELS[l.package_type]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{PAYER_LABELS[l.payer_type] || '—'}</span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{l.payment_date ? format(parseISO(l.payment_date), 'dd MMM yyyy') : '—'}</span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-foreground'}`}>
                        {l.expiry_date ? format(parseISO(l.expiry_date), 'dd MMM yyyy') : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {l.daysLeft !== null ? (
                        <span className={`text-xs font-semibold ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-green-600'}`}>
                          {isExpired ? `-${Math.abs(l.daysLeft)}d` : `${l.daysLeft}d`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{getStaffName(l.created_by)}</span>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">{l.invoice_issued ? (l.invoice_paid ? 'Paid' : 'Issued') : '—'}</span>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">{getLastReminder(l)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className="text-xs font-medium">{sc.label}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingLicense(l); setShowForm(true); }}>แก้ไข</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            updateMutation.mutate({ id: l.id, data: { license_status: 'renewed' } });
                          }}>ต่ออายุ</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            updateMutation.mutate({ id: l.id, data: { license_status: 'cancelled' } });
                          }} className="text-red-600">ยกเลิก</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t">
            <span className="text-[11px] text-muted-foreground">{filtered.length} records</span>
          </div>
        </div>
      )}

      <PeakLicenseForm
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingLicense(null); }}
        license={editingLicense}
        onSubmit={handleSubmit}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
      <PeakNotificationSettings open={showNotifSettings} onOpenChange={setShowNotifSettings} />
    </div>
  );
}

function StatCard({ label, value, icon, borderColor, iconColor }) {
  return (
    <div className={`flex items-center justify-between p-3 bg-card rounded-lg border-l-4 ${borderColor} border border-l-4 shadow-sm`}>
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
      <div className={`${iconColor} opacity-60`}>{icon}</div>
    </div>
  );
}