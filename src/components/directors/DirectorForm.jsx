import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Loader2 } from 'lucide-react';

export default function DirectorForm({ open, onOpenChange, director, decryptedData, customers, onSave, saving }) {
  const [form, setForm] = useState({
    customer_id: '', full_name: '', id_card: '', address: '', phone: '',
    position: 'กรรมการผู้จัดการ', tax_filing_type: 'pnd91', notes: '',
  });

  useEffect(() => {
    if (open) {
      if (director && decryptedData) {
        setForm({
          customer_id: director.customer_id || '',
          full_name: decryptedData.full_name || '',
          id_card: decryptedData.id_card || '',
          address: decryptedData.address || '',
          phone: decryptedData.phone || '',
          position: director.position || 'กรรมการผู้จัดการ',
          tax_filing_type: director.tax_filing_type || 'pnd91',
          notes: director.notes || '',
        });
      } else if (!director) {
        setForm({
          customer_id: '', full_name: '', id_card: '', address: '', phone: '',
          position: 'กรรมการผู้จัดการ', tax_filing_type: 'pnd91', notes: '',
        });
      }
    }
  }, [open, director, decryptedData]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.customer_id || !form.full_name.trim()) return;
    onSave({ ...form, director_id: director?.id });
  };

  const customerOptions = customers
    .filter(c => c.status === 'active')
    .map(c => ({ value: c.id, label: c.company_name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{director ? 'แก้ไขข้อมูลกรรมการ' : 'เพิ่มกรรมการ'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">บริษัท *</Label>
            <SearchableSelect
              value={form.customer_id || '_none'}
              onValueChange={v => update('customer_id', v === '_none' ? '' : v)}
              options={[{ value: '_none', label: '— เลือกบริษัท —' }, ...customerOptions]}
              placeholder="เลือกบริษัท"
              disabled={!!director}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ชื่อ-นามสกุล *</Label>
            <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="ชื่อ-นามสกุล กรรมการ" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">เลขบัตรประชาชน</Label>
            <Input value={form.id_card} onChange={e => update('id_card', e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="เลขบัตร 13 หลัก" maxLength={13} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ที่อยู่ตามบัตร</Label>
            <Textarea value={form.address} onChange={e => update('address', e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">เบอร์โทร</Label>
            <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="0xx-xxx-xxxx" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ตำแหน่ง</Label>
              <Input value={form.position} onChange={e => update('position', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ประเภท ภงด.</Label>
              <Select value={form.tax_filing_type} onValueChange={v => update('tax_filing_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pnd90">ภงด.90 (มีรายได้อื่น)</SelectItem>
                  <SelectItem value="pnd91">ภงด.91 (เงินเดือนอย่างเดียว)</SelectItem>
                  <SelectItem value="both">ทั้ง 90 และ 91</SelectItem>
                  <SelectItem value="none">ไม่ต้องยื่น</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">หมายเหตุ</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !form.customer_id || !form.full_name.trim()} className="w-full">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังบันทึก...</> : 'บันทึก'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}