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
import { Plus, Trash2 } from 'lucide-react';

const SERVICES = [
  { value: 'accounting', label: 'รับทำบัญชี' },
  { value: 'payroll', label: 'รับทำเงินเดือน' },
  { value: 'tax_consulting', label: 'ที่ปรึกษาภาษีรายเดือน' },
  { value: 'audit', label: 'งานตรวจสอบบัญชี' },
  { value: 'peak_licensing', label: 'Licensing Peak Account' },
];

const OBLIGATIONS = [
  { value: 'pnd1_monthly', label: 'ภงด.1 รายเดือน' },
  { value: 'pnd1k_yearly', label: 'ภงด.1ก สิ้นปี' },
  { value: 'pnd3_monthly', label: 'ภงด.3 รายเดือน' },
  { value: 'pnd53_monthly', label: 'ภงด.53 รายเดือน' },
  { value: 'pp30_monthly', label: 'ภ.พ.30 รายเดือน' },
  { value: 'sso_monthly', label: 'ประกันสังคม รายเดือน' },
  { value: 'pnd90_director', label: 'ภงด.90 กรรมการ' },
  { value: 'pnd91_director', label: 'ภงด.91 กรรมการ' },
  { value: 'pnd50_half', label: 'ภงด.50 ครึ่งปี' },
  { value: 'pnd50_annual', label: 'ภงด.50 ประจำปี' },
  { value: 'audit_annual', label: 'ตรวจสอบงบการเงิน' },
  { value: 'dbd_filing', label: 'ยื่นงบ กรมพัฒนาธุรกิจ' },
];

const DEPARTMENTS = [
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

const MONTHS = [
  { value: 1, label: 'ม.ค.' }, { value: 2, label: 'ก.พ.' }, { value: 3, label: 'มี.ค.' },
  { value: 4, label: 'เม.ย.' }, { value: 5, label: 'พ.ค.' }, { value: 6, label: 'มิ.ย.' },
  { value: 7, label: 'ก.ค.' }, { value: 8, label: 'ส.ค.' }, { value: 9, label: 'ก.ย.' },
  { value: 10, label: 'ต.ค.' }, { value: 11, label: 'พ.ย.' }, { value: 12, label: 'ธ.ค.' },
];

export default function TemplateFormDialog({ open, onOpenChange, template, onSubmit, isSaving }) {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list('-created_date', 200), staleTime: 2 * 60_000 });
  const [form, setForm] = useState({});
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        name: '', description: '', service_type: '', department: '',
        match_type: 'service', obligation_type: '',
        recurring_type: 'monthly', applicable_months: [],
        due_date_rule: 15, default_priority: 'medium', default_status: 'pending',
        default_owner_type: 'from_customer', default_owner: '', default_owner_name: '',
        default_checklist: [], estimated_days: '', status: 'active',
        ...template,
      });
      setNewItem('');
    }
  }, [open, template]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleMonth = (m) => {
    const list = form.applicable_months || [];
    update('applicable_months', list.includes(m) ? list.filter(v => v !== m) : [...list, m].sort((a, b) => a - b));
  };

  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    update('default_checklist', [...(form.default_checklist || []), { item: newItem, checked: false }]);
    setNewItem('');
  };

  const handleSubmit = () => {
    const matchType = form.match_type || 'service';
    if (!form.name || !form.recurring_type) return;
    if (matchType === 'service' && !form.service_type) return;
    if (matchType === 'obligation' && !form.obligation_type) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">ข้อมูลพื้นฐาน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {template?.template_code && (
                <div className="space-y-1"><Label>รหัส Template</Label><Input value={form.template_code || ''} disabled className="bg-muted" /></div>
              )}
              <div className={template?.template_code ? '' : 'md:col-span-2'}>
                <div className="space-y-1"><Label>ชื่อ Task *</Label><Input value={form.name || ''} onChange={e => update('name', e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>วิธีจับคู่ลูกค้า *</Label>
                <Select value={form.match_type || 'service'} onValueChange={v => update('match_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">ตาม Service (ประเภทบริการ)</SelectItem>
                    <SelectItem value="obligation">ตาม Obligation (ภาระผูกพัน)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.match_type || 'service') === 'service' && (
                <div className="space-y-1"><Label>ประเภทบริการ *</Label>
                  <Select value={form.service_type || ''} onValueChange={v => update('service_type', v)}>
                    <SelectTrigger><SelectValue placeholder="เลือกบริการ" /></SelectTrigger>
                    <SelectContent>{SERVICES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {form.match_type === 'obligation' && (
                <div className="space-y-1"><Label>ภาระผูกพัน *</Label>
                  <Select value={form.obligation_type || ''} onValueChange={v => update('obligation_type', v)}>
                    <SelectTrigger><SelectValue placeholder="เลือกภาระผูกพัน" /></SelectTrigger>
                    <SelectContent>
                      {OBLIGATIONS.map(ob => (
                        <SelectItem key={ob.value} value={ob.value}>{ob.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1"><Label>แผนก</Label>
                <Select value={form.department || '_none'} onValueChange={v => update('department', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— ไม่ระบุ —</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1"><Label>รายละเอียด</Label><Textarea value={form.description || ''} onChange={e => update('description', e.target.value)} rows={2} /></div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">กำหนดการ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label>ความถี่ *</Label>
                <Select value={form.recurring_type || 'monthly'} onValueChange={v => update('recurring_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">รายเดือน</SelectItem>
                    <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                    <SelectItem value="yearly">รายปี</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Due Date (วันที่ของเดือน)</Label>
                <Input type="number" min={1} max={28} value={form.due_date_rule || ''} onChange={e => update('due_date_rule', parseInt(e.target.value) || 15)} />
              </div>
              <div className="space-y-1"><Label>ระยะเวลาทำงาน (วัน)</Label>
                <Input type="number" min={1} value={form.estimated_days || ''} onChange={e => update('estimated_days', parseInt(e.target.value) || '')} />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Label>เดือนที่ใช้งาน (ไม่เลือก = ทุกเดือน)</Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {MONTHS.map(m => (
                  <div key={m.value} className="flex items-center gap-1.5 p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox checked={(form.applicable_months || []).includes(m.value)} onCheckedChange={() => toggleMonth(m.value)} />
                    <span className="text-xs">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Default Values */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">ค่าเริ่มต้น</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>สถานะเริ่มต้น</Label>
                <Select value={form.default_status || 'pending'} onValueChange={v => update('default_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="in_progress">กำลังทำ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>ความสำคัญ</Label>
                <Select value={form.default_priority || 'medium'} onValueChange={v => update('default_priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">ต่ำ</SelectItem>
                    <SelectItem value="medium">ปานกลาง</SelectItem>
                    <SelectItem value="high">สูง</SelectItem>
                    <SelectItem value="urgent">เร่งด่วน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>ผู้รับผิดชอบเริ่มต้น</Label>
                <Select value={form.default_owner_type || 'from_customer'} onValueChange={v => update('default_owner_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from_customer">จาก Customer Profile (เจ้าหน้าที่หลัก)</SelectItem>
                    <SelectItem value="specific_user">ระบุเอง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.default_owner_type === 'specific_user' && (
                <div className="space-y-1"><Label>เลือกผู้รับผิดชอบ</Label>
                  <Select value={form.default_owner || '_none'} onValueChange={v => {
                    const u = users.find(u => u.email === v);
                    setForm(p => ({ ...p, default_owner: v === '_none' ? '' : v, default_owner_name: u?.full_name || '' }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— ไม่ระบุ —</SelectItem>
                      {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1"><Label>สถานะ Template</Label>
                <Select value={form.status || 'active'} onValueChange={v => update('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Checklist เริ่มต้น</h3>
            <div className="space-y-2">
              {(form.default_checklist || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-xs">• {item.item}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => update('default_checklist', form.default_checklist.filter((_, idx) => idx !== i))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="เพิ่มรายการ..." value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistItem()} className="text-xs" />
                <Button variant="outline" size="icon" onClick={addChecklistItem}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={isSaving || !form.name || ((form.match_type || 'service') === 'service' ? !form.service_type : !form.obligation_type)} className="w-full">
            {isSaving ? 'กำลังบันทึก...' : (template ? 'อัปเดต Template' : 'สร้าง Template')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}