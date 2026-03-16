import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const SERVICES = [
  { value: 'accounting', label: 'รับทำบัญชี' },
  { value: 'payroll', label: 'รับทำเงินเดือน' },
  { value: 'tax_consulting', label: 'ที่ปรึกษาภาษีรายเดือน' },
  { value: 'audit', label: 'งานตรวจสอบบัญชี' },
  { value: 'peak_licensing', label: 'Licensing Peak Account' },
];

export default function CustomerForm({ customer, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    company_name: '', company_name_en: '', tax_id: '', address: '',
    contact_person: '', contact_email: '', contact_phone: '', line_id: '',
    services: [], peak_package: 'none', peak_license_start: '', peak_license_end: '',
    status: 'active', notes: '',
    ...customer,
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleService = (service) => {
    const services = form.services || [];
    if (services.includes(service)) {
      update('services', services.filter(s => s !== service));
    } else {
      update('services', [...services, service]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>ชื่อบริษัท (ไทย) *</Label>
          <Input value={form.company_name} onChange={e => update('company_name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>ชื่อบริษัท (อังกฤษ)</Label>
          <Input value={form.company_name_en} onChange={e => update('company_name_en', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>เลขผู้เสียภาษี</Label>
          <Input value={form.tax_id} onChange={e => update('tax_id', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>สถานะ</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">ใช้งาน</SelectItem>
              <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
              <SelectItem value="suspended">ระงับ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>ที่อยู่</Label>
          <Textarea value={form.address} onChange={e => update('address', e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>ผู้ติดต่อ</Label>
          <Input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>อีเมล</Label>
          <Input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>เบอร์โทร</Label>
          <Input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Line ID</Label>
          <Input value={form.line_id} onChange={e => update('line_id', e.target.value)} />
        </div>
      </div>

      {/* Services */}
      <div className="space-y-3">
        <Label>บริการที่ใช้</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SERVICES.map(s => (
            <div key={s.value} className="flex items-center gap-2">
              <Checkbox checked={(form.services || []).includes(s.value)} onCheckedChange={() => toggleService(s.value)} />
              <span className="text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Account */}
      {(form.services || []).includes('peak_licensing') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1.5">
            <Label>Peak Package</Label>
            <Select value={form.peak_package} onValueChange={v => update('peak_package', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่มี</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="pro_plus">Pro Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>เริ่มต้น License</Label>
            <Input type="date" value={form.peak_license_start} onChange={e => update('peak_license_start', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>หมดอายุ License</Label>
            <Input type="date" value={form.peak_license_end} onChange={e => update('peak_license_end', e.target.value)} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>หมายเหตุ</Label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} />
      </div>

      <Button onClick={() => onSubmit(form)} disabled={isLoading || !form.company_name} className="w-full">
        {isLoading ? 'กำลังบันทึก...' : (customer ? 'อัปเดต' : 'เพิ่มลูกค้า')}
      </Button>
    </div>
  );
}