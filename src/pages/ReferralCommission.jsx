import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '../components/auth/useAccessControl';
import ReferrerForm from '../components/referral/ReferrerForm';
import ReferrerList from '../components/referral/ReferrerList';
import CommissionSummary from '../components/referral/CommissionSummary';
import CommissionTable from '../components/referral/CommissionTable';
import MonthlyCommissionSummary from '../components/referral/MonthlyCommissionSummary';

export default function ReferralCommission() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const [activeTab, setActiveTab] = useState('commission');
  const [showForm, setShowForm] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');

  const { data: referrers = [] } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => base44.entities.Referrer.list('-created_date', 500),
    staleTime: 60_000,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 60_000,
  });
  const { data: billings = [] } = useQuery({
    queryKey: ['billings'],
    queryFn: () => base44.entities.Billing.list('-created_date', 1000),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Referrer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['referrers'] }); setShowForm(false); toast.success('เพิ่มผู้แนะนำแล้ว'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Referrer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['referrers'] }); setShowForm(false); setEditingRef(null); toast.success('บันทึกแล้ว'); },
  });

  const handleSave = (formData) => {
    if (editingRef) updateMutation.mutate({ id: editingRef.id, data: formData });
    else createMutation.mutate(formData);
  };

  // Commission data: link billing → customer → referrer
  const commissionData = useMemo(() => {
    const refCustomers = customers.filter(c => c.referrer_id && c.referral_commission_pct > 0);
    if (refCustomers.length === 0) return [];

    const paidBillings = billings.filter(b => b.referral_commission === true && b.status !== 'cancelled');

    return refCustomers.flatMap(cust => {
      const custBillings = paidBillings.filter(b => b.customer_id === cust.id);
      const ref = referrers.find(r => r.id === cust.referrer_id);
      return custBillings.map(b => {
        const serviceAmt = b.service_amount ?? b.amount ?? 0;
        return {
          billing_id: b.id,
          invoice_number: b.invoice_number,
          period_month: b.period_month,
          billing_date: b.billing_date,
          payment_date: b.payment_date,
          customer_id: cust.id,
          customer_name: cust.company_name,
          referrer_id: cust.referrer_id,
          referrer_name: ref?.name || cust.referrer_name || '—',
          billing_amount: b.amount || 0,
          service_amount: serviceAmt,
          commission_pct: cust.referral_commission_pct,
          commission_amount: Math.round(serviceAmt * (cust.referral_commission_pct / 100) * 100) / 100,
        };
      });
    });
  }, [customers, billings, referrers]);

  // Filter
  const filteredCommission = useMemo(() => {
    return commissionData.filter(c => {
      if (search) {
        const s = search.toLowerCase();
        if (!c.customer_name?.toLowerCase().includes(s) && !c.referrer_name?.toLowerCase().includes(s) && !c.invoice_number?.toLowerCase().includes(s)) return false;
      }
      if (periodFilter !== 'all' && c.period_month !== periodFilter) return false;
      return true;
    });
  }, [commissionData, search, periodFilter]);

  // Unique periods
  const periods = useMemo(() => [...new Set(commissionData.map(c => c.period_month).filter(Boolean))].sort().reverse(), [commissionData]);

  if (!ac.canViewReferral) {
    return <div className="text-center py-12 text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">ค่าแนะนำ (Referral)</h1>
          <p className="text-xs text-muted-foreground">จัดการผู้แนะนำ และสรุปค่าแนะนำจาก Billing</p>
        </div>
        {ac.canEditReferral && (
          <Button size="sm" className="gap-1.5 text-xs shrink-0" onClick={() => { setEditingRef(null); setShowForm(true); }}>
            <UserPlus className="w-3.5 h-3.5" /> เพิ่มผู้แนะนำ
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="commission" className="text-xs gap-1.5">สรุปค่าแนะนำ</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs gap-1.5">สรุปรายเดือน</TabsTrigger>
          <TabsTrigger value="referrers" className="text-xs gap-1.5">รายชื่อผู้แนะนำ</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'commission' && (
        <>
          <CommissionSummary data={filteredCommission} referrers={referrers} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ค้นหาลูกค้า, ผู้แนะนำ, Invoice..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-xs" />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="ทุกเดือน" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกเดือน</SelectItem>
                {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{filteredCommission.length} รายการ</span>
          </div>
          <CommissionTable data={filteredCommission} />
        </>
      )}

      {activeTab === 'referrers' && (
        <ReferrerList
          referrers={referrers}
          customers={customers}
          onEdit={(r) => { setEditingRef(r); setShowForm(true); }}
        />
      )}

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditingRef(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRef ? 'แก้ไขผู้แนะนำ' : 'เพิ่มผู้แนะนำใหม่'}</DialogTitle>
          </DialogHeader>
          <ReferrerForm
            referrer={editingRef}
            onSave={handleSave}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}