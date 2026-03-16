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

export default function Billing() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: billings = [], isLoading } = useQuery({
    queryKey: ['billings'],
    queryFn: () => base44.entities.Billing.list('-created_date', 200),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Payment</h1>
          <p className="text-sm text-muted-foreground mt-1">จัดการใบแจ้งหนี้และการชำระเงิน</p>
        </div>
        <Button onClick={() => { setForm({ status: 'draft', billing_date: format(new Date(), 'yyyy-MM-dd') }); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> สร้างใบแจ้งหนี้
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">ชำระแล้วทั้งหมด</p><p className="text-2xl font-bold text-green-600">฿{totalPaid.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">ค้างชำระ</p><p className="text-2xl font-bold text-red-600">฿{totalPending.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">จำนวนใบแจ้งหนี้</p><p className="text-2xl font-bold">{billings.length}</p></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="draft">ร่าง</SelectItem>
            <SelectItem value="sent">ส่งแล้ว</SelectItem>
            <SelectItem value="paid">ชำระแล้ว</SelectItem>
            <SelectItem value="overdue">เกินกำหนด</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map(b => (
          <Card key={b.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{b.invoice_number || 'ร่าง'}</p>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {b.customer_name} {b.due_date && `· กำหนด ${format(new Date(b.due_date), 'dd/MM/yyyy')}`}
                </p>
              </div>
              {b.service_type && <ServiceBadge service={b.service_type} />}
              <p className="font-bold text-sm">฿{(b.total_amount || b.amount || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">ไม่พบข้อมูล</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>สร้างใบแจ้งหนี้</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ลูกค้า *</Label>
              <Select value={form.customer_id || ''} onValueChange={v => {
                const c = customers.find(c => c.id === v);
                setForm(p => ({ ...p, customer_id: v, customer_name: c?.company_name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="เลือกลูกค้า" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>เลขที่ใบแจ้งหนี้</Label><Input value={form.invoice_number || ''} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>จำนวนเงิน</Label><Input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="space-y-1.5"><Label>กำหนดชำระ</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>บริการ</Label>
              <Select value={form.service_type || ''} onValueChange={v => setForm(p => ({ ...p, service_type: v }))}>
                <SelectTrigger><SelectValue placeholder="เลือกบริการ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accounting">ทำบัญชี</SelectItem>
                  <SelectItem value="payroll">เงินเดือน</SelectItem>
                  <SelectItem value="tax_consulting">ที่ปรึกษาภาษี</SelectItem>
                  <SelectItem value="audit">ตรวจสอบบัญชี</SelectItem>
                  <SelectItem value="peak_licensing">Peak Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>หมายเหตุ</Label><Textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.customer_name || createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'กำลังบันทึก...' : 'สร้างใบแจ้งหนี้'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}