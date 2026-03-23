import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReferrerForm({ referrer, onSave, isSaving }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', line_id: '',
    bank_account: '', bank_name: '', status: 'active', notes: '',
  });

  useEffect(() => {
    if (referrer) setForm({ name: '', phone: '', email: '', line_id: '', bank_account: '', bank_name: '', status: 'active', notes: '', ...referrer });
    else setForm({ name: '', phone: '', email: '', line_id: '', bank_account: '', bank_name: '', status: 'active', notes: '' });
  }, [referrer]);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">ชื่อผู้แนะนำ *</Label>
        <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="ชื่อ-นามสกุล" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">เบอร์โทร</Label>
          <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="08x-xxx-xxxx" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">อีเมล</Label>
          <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Line ID</Label>
        <Input value={form.line_id} onChange={e => update('line_id', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">ธนาคาร</Label>
          <Input value={form.bank_name} onChange={e => update('bank_name', e.target.value)} placeholder="เช่น กสิกร, ไทยพาณิชย์" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">เลขบัญชี</Label>
          <Input value={form.bank_account} onChange={e => update('bank_account', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">สถานะ</Label>
        <Select value={form.status} onValueChange={v => update('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">หมายเหตุ</Label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} />
      </div>
      <Button onClick={() => onSave(form)} disabled={isSaving || !form.name.trim()} className="w-full">
        {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
      </Button>
    </div>
  );
}