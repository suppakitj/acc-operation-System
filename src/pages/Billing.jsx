import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';
import BillingStatCards from '../components/billing/BillingStatCards';
import BillingTable from '../components/billing/BillingTable';
import { toast } from 'sonner';

const TABS = [
  { key: 'all', label: 'All Records' },
  { key: 'action', label: 'Action Required' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'missing_docs', label: 'Missing Docs' },
  { key: 'completed', label: 'Completed' },
];

const DEPT_OPTIONS = [
  { value: 'accounting', label: 'Accounting' },
  { value: 'audit', label: 'Audit' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'billing', label: 'Billing' },
  { value: 'management', label: 'Management' },
  { value: 'it', label: 'IT' },
];

export default function Billing() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: allBillings = [] } = useQuery({ queryKey: ['billings'], queryFn: () => base44.entities.Billing.list('-created_date', 500) });

  const billings = (ac.canViewBilling || ac.canViewBillingDept) ? allBillings : [];

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [receiptFilter, setReceiptFilter] = useState('all');
  const [whtFilter, setWhtFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [form, setForm] = useState({});

  const today = new Date();

  // Stats
  const stats = useMemo(() => {
    const notInvoiced = billings.filter(b => b.status === 'not_invoiced' || b.status === 'draft');
    const invoicedUnpaid = billings.filter(b => b.status === 'sent');
    const overdue = billings.filter(b => b.status === 'overdue' || (b.due_date && differenceInDays(today, parseISO(b.due_date)) > 0 && b.status !== 'paid' && b.status !== 'cancelled'));
    const paid = billings.filter(b => b.status === 'paid');
    const missingReceipt = billings.filter(b => b.status === 'paid' && !b.receipt_received);
    const missingWht = billings.filter(b => b.status === 'paid' && !b.wht_received && b.wht_amount > 0);
    return {
      not_invoiced: { count: notInvoiced.length },
      invoiced_unpaid: { count: invoicedUnpaid.length, amount: invoicedUnpaid.reduce((s, b) => s + (b.amount || 0), 0) },
      overdue: { count: overdue.length, amount: overdue.reduce((s, b) => s + (b.amount || 0), 0) },
      paid: { count: paid.length },
      missing_receipt: { count: missingReceipt.length },
      missing_wht: { count: missingWht.length },
    };
  }, [billings]);

  // Tab + filters
  const filtered = useMemo(() => {
    return billings.filter(b => {
      // Tab filter
      const isOverdue = b.due_date && differenceInDays(today, parseISO(b.due_date)) > 0 && b.status !== 'paid' && b.status !== 'cancelled';
      if (activeTab === 'action') {
        if (b.status !== 'overdue' && !isOverdue && b.status !== 'sent') return false;
      }
      if (activeTab === 'unpaid') {
        if (b.status === 'paid' || b.status === 'cancelled') return false;
      }
      if (activeTab === 'missing_docs') {
        const missingR = b.status === 'paid' && !b.receipt_received;
        const missingW = b.status === 'paid' && !b.wht_received && b.wht_amount > 0;
        if (!missingR && !missingW) return false;
      }
      if (activeTab === 'completed') {
        if (b.status !== 'paid') return false;
      }

      // Search
      if (search) {
        const s = search.toLowerCase();
        if (!b.customer_name?.toLowerCase().includes(s) && !b.invoice_number?.toLowerCase().includes(s)) return false;
      }

      // Dropdown filters
      if (clientFilter !== 'all' && b.customer_id !== clientFilter) return false;
      if (deptFilter !== 'all' && b.department !== deptFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (receiptFilter !== 'all') {
        if (receiptFilter === 'yes' && !b.receipt_received) return false;
        if (receiptFilter === 'no' && b.receipt_received) return false;
      }
      if (whtFilter !== 'all') {
        if (whtFilter === 'yes' && !b.wht_received) return false;
        if (whtFilter === 'no' && b.wht_received) return false;
      }
      if (ownerFilter !== 'all' && b.owner_email !== ownerFilter) return false;
      if (dateFilter && b.due_date && b.due_date < dateFilter) return false;
      if (overdueOnly && !isOverdue) return false;

      return true;
    });
  }, [billings, activeTab, search, clientFilter, deptFilter, statusFilter, receiptFilter, whtFilter, ownerFilter, dateFilter, overdueOnly]);

  // Unique owners
  const ownerList = useMemo(() => {
    const emails = [...new Set(billings.map(b => b.owner_email).filter(Boolean))];
    return emails.map(e => {
      const u = users.find(u => u.email === e);
      return { email: e, name: u?.full_name || b?.owner || e };
    });
  }, [billings, users]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Billing.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['billings'] }); setShowForm(false); setEditingBill(null); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Billing.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['billings'] }),
  });

  const handleToggleReceipt = (b) => {
    const newVal = !b.receipt_received;
    updateMutation.mutate({ id: b.id, data: { receipt_received: newVal, receipt_date: newVal ? format(today, 'yyyy-MM-dd') : '' } });
  };
  const handleToggleWht = (b) => {
    const newVal = !b.wht_received;
    updateMutation.mutate({ id: b.id, data: { wht_received: newVal, wht_date: newVal ? format(today, 'yyyy-MM-dd') : '' } });
  };

  const handleEdit = (b) => {
    setEditingBill(b);
    setForm({ ...b });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data: form });
      setShowForm(false);
      setEditingBill(null);
    } else {
      createMutation.mutate(form);
    }
  };

  const openNew = () => {
    setEditingBill(null);
    setForm({ status: 'draft', billing_date: format(today, 'yyyy-MM-dd') });
    setShowForm(true);
  };

  if (!ac.canViewBilling && !ac.canViewBillingDept) {
    return <div className="text-center py-12 text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('billing_title')}</h1>
          <p className="text-xs text-muted-foreground">{t('billing_subtitle')}</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs shrink-0 self-start sm:self-auto" onClick={openNew}>
          <Plus className="w-3.5 h-3.5" /> {t('create_invoice')}
        </Button>
      </div>

      {/* Stat Cards */}
      <BillingStatCards stats={stats} />

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
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Invoice # or client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-xs" />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs"><SelectValue placeholder="All Depts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {DEPT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_invoiced">Not Invoiced</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Invoiced</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={receiptFilter} onValueChange={setReceiptFilter}>
            <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs"><SelectValue placeholder="All Receipt" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Receipt</SelectItem>
              <SelectItem value="yes">Received</SelectItem>
              <SelectItem value="no">Missing</SelectItem>
            </SelectContent>
          </Select>
          <Select value={whtFilter} onValueChange={setWhtFilter}>
            <SelectTrigger className="w-full sm:w-[110px] h-9 text-xs"><SelectValue placeholder="All WHT" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All WHT</SelectItem>
              <SelectItem value="yes">Received</SelectItem>
              <SelectItem value="no">Missing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-9 text-xs w-full sm:w-[170px]" placeholder="Due date from..." />
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="All Owners" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {ownerList.map(o => <SelectItem key={o.email} value={o.email}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={overdueOnly ? 'default' : 'outline'}
            className="h-9 text-xs"
            onClick={() => setOverdueOnly(!overdueOnly)}
          >
            Overdue Only
          </Button>
          <span className="text-[11px] text-muted-foreground self-center ml-auto">{filtered.length} records</span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t('no_data')}</div>
      ) : (
        <BillingTable
          billings={filtered}
          onToggleReceipt={handleToggleReceipt}
          onToggleWht={handleToggleWht}
          onEdit={handleEdit}
        />
      )}

      {/* Create / Edit Form */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setEditingBill(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingBill ? 'แก้ไขใบแจ้งหนี้' : t('create_invoice')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('customer')} *</Label>
              <Select value={form.customer_id || ''} onValueChange={v => { const c = customers.find(c => c.id === v); setForm(p => ({ ...p, customer_id: v, customer_name: c?.company_name || '' })); }}>
                <SelectTrigger><SelectValue placeholder={t('select_customer')} /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t('invoice_number')}</Label><Input value={form.invoice_number || ''} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Period (เดือน)</Label><Input value={form.period_month || ''} onChange={e => setForm(p => ({ ...p, period_month: e.target.value }))} placeholder="2026-02" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t('amount')}</Label><Input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="space-y-1.5"><Label>WHT Amount</Label><Input type="number" value={form.wht_amount || ''} onChange={e => setForm(p => ({ ...p, wht_amount: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Inv Date</Label><Input type="date" value={form.billing_date || ''} onChange={e => setForm(p => ({ ...p, billing_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{t('due_payment')}</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('service')}</Label>
                <Select value={form.service_type || ''} onValueChange={v => setForm(p => ({ ...p, service_type: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('select_service')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accounting">{t('service_accounting')}</SelectItem>
                    <SelectItem value="payroll">{t('service_payroll')}</SelectItem>
                    <SelectItem value="tax_consulting">{t('service_tax')}</SelectItem>
                    <SelectItem value="audit">{t('service_audit')}</SelectItem>
                    <SelectItem value="peak_licensing">{t('service_peak')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department || ''} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
                  <SelectContent>
                    {DEPT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status || 'draft'} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_invoiced">Not Invoiced</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Invoiced</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={form.owner_email || ''} onValueChange={v => { const u = users.find(u => u.email === v); setForm(p => ({ ...p, owner_email: v, owner: u?.full_name || v })); }}>
                  <SelectTrigger><SelectValue placeholder="เลือก Owner" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>{t('notes')}</Label><Textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={handleSubmit} disabled={!form.customer_name || createMutation.isPending || updateMutation.isPending} className="w-full">
              {(createMutation.isPending || updateMutation.isPending) ? t('saving') : (editingBill ? 'อัปเดต' : t('create_invoice'))}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}