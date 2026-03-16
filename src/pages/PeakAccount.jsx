import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Key, Settings, Check, X, AlertTriangle, Clock } from 'lucide-react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';
import PeakLicenseForm from '../components/peak/PeakLicenseForm';
import PeakNotificationSettings from '../components/peak/PeakNotificationSettings';

const PKG_COLORS = { basic: 'bg-blue-100 text-blue-700', pro: 'bg-purple-100 text-purple-700', pro_plus: 'bg-yellow-100 text-yellow-700' };
const PKG_LABELS = { basic: 'BASIC', pro: 'PRO', pro_plus: 'PRO Plus' };

const STATUS_CONFIG = {
  active: { label: 'ใช้งานอยู่', color: 'bg-green-100 text-green-700' },
  expiring_soon: { label: 'ใกล้หมดอายุ', color: 'bg-yellow-100 text-yellow-700' },
  waiting_customer_confirm: { label: 'รอยืนยันจากลูกค้า', color: 'bg-blue-100 text-blue-700' },
  waiting_acc_payment: { label: 'รอ ACC ชำระ', color: 'bg-orange-100 text-orange-700' },
  waiting_customer_reimburse: { label: 'รอลูกค้าคืนเงิน', color: 'bg-orange-100 text-orange-700' },
  invoiced_waiting_payment: { label: 'รอชำระใบแจ้งหนี้', color: 'bg-yellow-100 text-yellow-700' },
  renewed: { label: 'ต่ออายุแล้ว', color: 'bg-green-100 text-green-700' },
  expired: { label: 'หมดอายุ', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-500' },
};

const BoolIcon = ({ value }) => value
  ? <Check className="w-3.5 h-3.5 text-green-600" />
  : <X className="w-3.5 h-3.5 text-red-400" />;

export default function PeakAccount() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'management';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pkgFilter, setPkgFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  if (!ac.canViewPeakAccount) {
    return <div className="text-center py-12 text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['peakLicenses'],
    queryFn: () => base44.entities.PeakLicense.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Auto-calc expiry
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

  const filtered = useMemo(() => {
    return licenses.filter(l => {
      if (search) {
        const s = search.toLowerCase();
        if (!l.customer_name?.toLowerCase().includes(s)) return false;
      }
      if (statusFilter !== 'all' && l.license_status !== statusFilter) return false;
      if (pkgFilter !== 'all' && l.package_type !== pkgFilter) return false;
      return true;
    });
  }, [licenses, search, statusFilter, pkgFilter]);

  // Stats
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.license_status === 'active' || l.license_status === 'renewed').length,
    expiring: licenses.filter(l => {
      if (!l.expiry_date) return false;
      const d = differenceInDays(parseISO(l.expiry_date), today);
      return d >= 0 && d <= 30;
    }).length,
    expired: licenses.filter(l => l.license_status === 'expired').length,
    basic: licenses.filter(l => l.package_type === 'basic').length,
    pro: licenses.filter(l => l.package_type === 'pro').length,
    pro_plus: licenses.filter(l => l.package_type === 'pro_plus').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Licensing Peak Account</h1>
          <p className="text-xs md:text-sm text-muted-foreground">จัดการ Peak Account License ของลูกค้า</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'ทั้งหมด', value: stats.total, cls: '' },
          { label: 'Active', value: stats.active, cls: 'text-green-600' },
          { label: 'ใกล้หมดอายุ', value: stats.expiring, cls: 'text-yellow-600' },
          { label: 'หมดอายุ', value: stats.expired, cls: 'text-red-600' },
          { label: 'BASIC', value: stats.basic, cls: 'text-blue-600' },
          { label: 'PRO', value: stats.pro, cls: 'text-purple-600' },
          { label: 'PRO Plus', value: stats.pro_plus, cls: 'text-yellow-600' },
        ].map((s, i) => (
          <Card key={i} className="p-2.5 text-center">
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อลูกค้า..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pkgFilter} onValueChange={setPkgFilter}>
          <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs"><SelectValue placeholder="แพ็กเกจ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแพ็กเกจ</SelectItem>
            {Object.entries(PKG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto">{filtered.length} of {licenses.length}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">ไม่มีข้อมูล Peak License</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">ลูกค้า</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">แพ็กเกจ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">การชำระ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">ชำระเมื่อ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">หมดอายุ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">เหลือ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden xl:table-cell">ACC จ่ายแทน</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden xl:table-cell">ลค.คืนเงิน</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden xl:table-cell">ใบแจ้งหนี้</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden xl:table-cell">WHT</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const daysLeft = l.expiry_date ? differenceInDays(parseISO(l.expiry_date), today) : null;
                const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const payerLabel = l.payer_type === 'customer_direct_peak' ? 'ลค.→Peak' : l.payer_type === 'customer_via_acc' ? 'ลค.→ACC' : 'ACC แทน';

                return (
                  <tr key={l.id}
                    className={`border-b last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}
                    onClick={() => { setEditingLicense(l); setShowForm(true); }}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium truncate max-w-[160px]">{l.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className={`text-[10px] ${PKG_COLORS[l.package_type]}`}>{PKG_LABELS[l.package_type]}</Badge>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className="text-[10px] text-muted-foreground">{payerLabel}</span>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground">
                      {l.payment_date ? format(parseISO(l.payment_date), 'dd/MM/yy') : '-'}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground">
                      {l.expiry_date ? format(parseISO(l.expiry_date), 'dd/MM/yy') : '-'}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      {daysLeft !== null && (
                        <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-green-600'}`}>
                          {isExpired ? `เกิน ${Math.abs(daysLeft)} วัน` : `${daysLeft} วัน`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden xl:table-cell text-center"><BoolIcon value={l.acc_prepaid} /></td>
                    <td className="px-3 py-2 hidden xl:table-cell text-center"><BoolIcon value={l.customer_paid_back} /></td>
                    <td className="px-3 py-2 hidden xl:table-cell text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <BoolIcon value={l.invoice_issued} />
                        {l.invoice_issued && <BoolIcon value={l.invoice_paid} />}
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden xl:table-cell text-center"><BoolIcon value={l.wht_received} /></td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className={`text-[9px] px-1.5 ${STATUS_CONFIG[l.license_status]?.color || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_CONFIG[l.license_status]?.label || l.license_status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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