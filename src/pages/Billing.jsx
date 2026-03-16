import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../components/shared/StatusBadge';
import ServiceBadge from '../components/shared/ServiceBadge';
import { useLanguage } from '../components/LanguageContext';

export default function Billing() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: billings = [] } = useQuery({ queryKey: ['billings'], queryFn: () => base44.entities.Billing.list('-created_date', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Billing.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['billings'] }); setShowForm(false); },
  });

  const filtered = billings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search && !b.customer_name?.toLowerCase().includes(search.toLowerCase()) && !b.invoice_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPaid = billings.filter(b => b.status === 'paid').reduce((s, b) => s + (b.total_amount || b.amount || 0), 0);
  const totalPending = billings.filter(b => b.status === 'sent' || b.status === 'overdue').reduce((s, b) => s + (b.total_amount || b.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('billing_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('billing_subtitle')}</p>
        </div>
        <Button onClick={() => { setForm({ status: 'draft', billing_date: format(new Date(), 'yyyy-MM-dd') }); setShowForm(true); }} className="gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> {t('create_invoice')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">{t('total_paid')}</p><p className="text-xl md:text-2xl font-bold text-green-600">฿{totalPaid.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">{t('total_pending')}</p><p className="text-xl md:text-2xl font-bold text-red-600">฿{totalPending.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">{t('total_invoices')}</p><p className="text-xl md:text-2xl font-bold">{billings.length}</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="draft">{t('status_draft')}</SelectItem>
            <SelectItem value="sent">{t('status_sent')}</SelectItem>
            <SelectItem value="paid">{t('status_paid')}</SelectItem>
            <SelectItem value="overdue">{t('status_overdue')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(b => (
          <Card key={b.id} className="hover:shadow-md transition-all">
            <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><CreditCard className="w-4 h-4 md:w-5 md:h-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-semibold text-sm truncate">{b.invoice_number || t('status_draft')}</p><StatusBadge status={b.status} /></div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.customer_name} {b.due_date && `· ${format(new Date(b.due_date), 'dd/MM/yyyy')}`}</p>
              </div>
              <span className="hidden sm:block">{b.service_type && <ServiceBadge service={b.service_type} />}</span>
              <p className="font-bold text-sm shrink-0">฿{(b.total_amount || b.amount || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">{t('no_data')}</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('create_invoice')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t('customer')} *</Label>
              <Select value={form.customer_id || ''} onValueChange={v => { const c = customers.find(c => c.id === v); setForm(p => ({ ...p, customer_id: v, customer_name: c?.company_name || '' })); }}>
                <SelectTrigger><SelectValue placeholder={t('select_customer')} /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('invoice_number')}</Label><Input value={form.invoice_number || ''} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{t('amount')}</Label><Input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="space-y-1.5"><Label>{t('due_payment')}</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>{t('service')}</Label>
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
            <div className="space-y-1.5"><Label>{t('notes')}</Label><Textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.customer_name || createMutation.isPending} className="w-full">
              {createMutation.isPending ? t('saving') : t('create_invoice')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}