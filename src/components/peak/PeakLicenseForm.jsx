import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { addDays, format, parseISO } from 'date-fns';

const PACKAGES = [
  { value: 'trial', label: 'TRIAL' },
  { value: 'basic', label: 'BASIC' },
  { value: 'pro', label: 'PRO' },
  { value: 'pro_plus', label: 'PRO Plus' },
];

const PAYER_TYPES = [
  { value: 'customer_direct_peak', label: 'ลูกค้าชำระโดยตรงไปยัง Peak' },
  { value: 'customer_via_acc', label: 'ลูกค้าชำระเงินมายัง ACC' },
  { value: 'acc_pay_for_customer', label: 'ACC ชำระแทนลูกค้า' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'ใช้งานอยู่' },
  { value: 'expiring_soon', label: 'ใกล้หมดอายุ' },
  { value: 'waiting_customer_confirm', label: 'รอการยืนยันจากลูกค้า' },
  { value: 'waiting_acc_payment', label: 'รอการชำระเงินจาก ACC' },
  { value: 'waiting_customer_reimburse', label: 'รอการคืนเงินจากลูกค้า' },
  { value: 'invoiced_waiting_payment', label: 'ออกใบแจ้งหนี้แล้ว รอชำระ' },
  { value: 'renewed', label: 'ต่ออายุแล้ว' },
  { value: 'expired', label: 'หมดอายุ' },
  { value: 'cancelled', label: 'ยกเลิก' },
];

export default function PeakLicenseForm({ open, onOpenChange, license, onSubmit, isSaving }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const peakCustomers = customers.filter(c => (c.services || []).includes('peak_licensing'));
  const [form, setForm] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        customer_id: '', customer_name: '', package_type: 'basic',
        payer_type: 'customer_direct_peak', payment_date: '', expiry_date: '',
        renewal_year: new Date().getFullYear(), license_status: 'active',
        acc_prepaid: false, customer_paid_back: false,
        invoice_issued: false, invoice_paid: false, wht_received: false,
        notes: '',
        ...license,
      });
    }
  }, [open, license]);

  const calcExpiry = (paymentDate, packageType) => {
    if (!paymentDate) return '';
    const days = packageType === 'trial' ? 30 : 365;
    return format(addDays(parseISO(paymentDate), days), 'yyyy-MM-dd');
  };

  const update = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'payment_date' && value) {
        next.expiry_date = calcExpiry(value, next.package_type);
      }
      if (key === 'package_type' && next.payment_date) {
        next.expiry_date = calcExpiry(next.payment_date, value);
      }
      return next;
    });
  };

  const handleCustomerSelect = (id) => {
    const c = customers.find(c => c.id === id);
    setForm(prev => ({
      ...prev,
      customer_id: id,
      customer_name: c?.company_name || '',
      package_type: c?.peak_package && c.peak_package !== 'none' ? c.peak_package : prev.package_type,
    }));
  };

  const toggleBool = (key) => update(key, !form[key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{license ? 'แก้ไข Peak License' : 'สมัคร / ต่ออายุ Peak License'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Customer & Package */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">ข้อมูลการสมัคร</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ลูกค้า *</Label>
                <Select value={form.customer_id || ''} onValueChange={handleCustomerSelect}>
                  <SelectTrigger><SelectValue placeholder="เลือกลูกค้า" /></SelectTrigger>
                  <SelectContent>
                    {peakCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>ประเภทแพ็กเกจ *</Label>
                <Select value={form.package_type || 'basic'} onValueChange={v => update('package_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PACKAGES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">การชำระเงิน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ประเภทการชำระเงิน</Label>
                <Select value={form.payer_type || 'customer_direct_peak'} onValueChange={v => update('payer_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYER_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>วันที่ชำระเงิน *</Label>
                <Input type="date" value={form.payment_date || ''} onChange={e => update('payment_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>วันหมดอายุ (อัตโนมัติ +365 วัน)</Label>
                <Input type="date" value={form.expiry_date || ''} onChange={e => update('expiry_date', e.target.value)} className="bg-muted/50" />
              </div>
              <div className="space-y-1">
                <Label>ปีที่ต่ออายุ</Label>
                <Input type="number" value={form.renewal_year ?? ''} onChange={e => {
                  const val = e.target.value;
                  update('renewal_year', val === '' ? null : parseInt(val));
                }} />
              </div>
            </div>
          </div>

          {/* Status Tracking */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">สถานะและการติดตาม</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>สถานะ License</Label>
                <Select value={form.license_status || 'active'} onValueChange={v => update('license_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {[
                { key: 'acc_prepaid', label: 'ACC ชำระเงินล่วงหน้าแล้ว' },
                { key: 'customer_paid_back', label: 'ลูกค้าชำระเงินคืน ACC แล้ว' },
                { key: 'invoice_issued', label: 'ออกใบแจ้งหนี้แล้ว' },
                { key: 'invoice_paid', label: 'ชำระใบแจ้งหนี้แล้ว' },
                { key: 'wht_received', label: 'ได้รับ WHT แล้ว' },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox checked={!!form[item.key]} onCheckedChange={() => toggleBool(item.key)} />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Textarea value={form.notes || ''} onChange={e => update('notes', e.target.value)} rows={2} />
          </div>

          {/* Notification History (read-only) */}
          {license?.notification_history?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">ประวัติการแจ้งเตือน</h3>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
                {license.notification_history.map((n, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground">{n.date}</span>
                    <span className="font-medium">{n.channel}</span>
                    <span className="text-muted-foreground">— {n.message || `แจ้งเตือน ${n.days_before} วันก่อนหมดอายุ`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => {
            const cleaned = { ...form };
            if (cleaned.renewal_year === null || cleaned.renewal_year === '') delete cleaned.renewal_year;
            onSubmit(cleaned);
          }} disabled={isSaving || !form.customer_id || !form.payment_date} className="w-full">
            {isSaving ? 'กำลังบันทึก...' : (license ? 'อัปเดต License' : 'สร้าง License')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}