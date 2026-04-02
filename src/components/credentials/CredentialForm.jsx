import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Save, Loader2 } from 'lucide-react';

export default function CredentialForm({ open, onOpenChange, credential, customers, services, onSave, saving }) {
  const [form, setForm] = useState({
    customer_id: '', customer_name: '', service_id: '', service_code: '', service_name: '',
    username: '', password: '', url: '', notes: '',
  });

  useEffect(() => {
    if (credential) {
      setForm({
        customer_id: credential.customer_id || '',
        customer_name: credential.customer_name || '',
        service_id: credential.service_id || '',
        service_code: credential.service_code || '',
        service_name: credential.service_name || '',
        username: '', password: '',
        url: credential.url || '',
        notes: credential.notes || '',
      });
    } else {
      setForm({ customer_id: '', customer_name: '', service_id: '', service_code: '', service_name: '', username: '', password: '', url: '', notes: '' });
    }
  }, [credential, open]);

  const customerOptions = (customers || []).map(c => ({ value: c.id, label: c.company_name }));
  const serviceOptions = (services || []).filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.name_th }));

  const handleCustomerChange = (val) => {
    const cust = customers.find(c => c.id === val);
    setForm(f => ({ ...f, customer_id: val, customer_name: cust?.company_name || '' }));
  };

  const handleServiceChange = (val) => {
    const svc = services.find(s => s.id === val);
    setForm(f => ({
      ...f,
      service_id: val,
      service_code: svc?.code || '',
      service_name: svc?.name_th || '',
      url: svc?.url || f.url,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, credential_id: credential?.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{credential ? 'แก้ไข Credential' : 'เพิ่ม Credential ใหม่'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">ลูกค้า *</Label>
            <SearchableSelect
              options={customerOptions}
              value={form.customer_id}
              onChange={handleCustomerChange}
              placeholder="เลือกลูกค้า"
            />
          </div>
          <div>
            <Label className="text-xs">ประเภทบริการ *</Label>
            <SearchableSelect
              options={serviceOptions}
              value={form.service_id}
              onChange={handleServiceChange}
              placeholder="เลือกบริการ"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Username *</Label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" autoComplete="off" />
            </div>
            <div>
              <Label className="text-xs">Password *</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" autoComplete="new-password" />
            </div>
          </div>
          <div>
            <Label className="text-xs">URL เว็บไซต์</Label>
            <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">หมายเหตุ</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={saving || !form.customer_id || !form.service_id || !form.username || !form.password}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึก
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}