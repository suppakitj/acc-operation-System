import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

const SERVICES = [
  { value: 'accounting', label: 'ทำบัญชี' },
  { value: 'payroll', label: 'เงินเดือน' },
  { value: 'tax_consulting', label: 'ที่ปรึกษาภาษี' },
  { value: 'audit', label: 'ตรวจสอบบัญชี' },
  { value: 'peak_licensing', label: 'Peak Account' },
];

const DEPARTMENTS = [
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

export default function TaskForm({ task, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    title: '', description: '', customer_id: '', customer_name: '',
    service_type: '', assigned_to: '', assigned_name: '', department: '',
    priority: 'medium', status: 'pending', due_date: '', start_date: '',
    checklist: [], is_recurring: false, recurring_type: '',
    ...task,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const [newCheckItem, setNewCheckItem] = useState('');

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    update('checklist', [...(form.checklist || []), { item: newCheckItem, checked: false }]);
    setNewCheckItem('');
  };

  const removeChecklistItem = (idx) => {
    update('checklist', form.checklist.filter((_, i) => i !== idx));
  };

  const toggleChecklistItem = (idx) => {
    const updated = [...form.checklist];
    updated[idx] = { ...updated[idx], checked: !updated[idx].checked };
    update('checklist', updated);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label>ชื่องาน *</Label>
          <Input value={form.title} onChange={e => update('title', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>ลูกค้า</Label>
          <Select value={form.customer_id} onValueChange={v => {
            const c = customers.find(c => c.id === v);
            setForm(prev => ({ ...prev, customer_id: v, customer_name: c?.company_name || '' }));
          }}>
            <SelectTrigger><SelectValue placeholder="เลือกลูกค้า" /></SelectTrigger>
            <SelectContent>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>ประเภทบริการ</Label>
          <Select value={form.service_type} onValueChange={v => update('service_type', v)}>
            <SelectTrigger><SelectValue placeholder="เลือกบริการ" /></SelectTrigger>
            <SelectContent>
              {SERVICES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>ผู้รับผิดชอบ</Label>
          <Select value={form.assigned_to} onValueChange={v => {
            const u = users.find(u => u.email === v);
            setForm(prev => ({ ...prev, assigned_to: v, assigned_name: u?.full_name || '' }));
          }}>
            <SelectTrigger><SelectValue placeholder="เลือกผู้รับผิดชอบ" /></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>แผนก</Label>
          <Select value={form.department} onValueChange={v => update('department', v)}>
            <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>ความสำคัญ</Label>
          <Select value={form.priority} onValueChange={v => update('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">ต่ำ</SelectItem>
              <SelectItem value="medium">ปานกลาง</SelectItem>
              <SelectItem value="high">สูง</SelectItem>
              <SelectItem value="urgent">เร่งด่วน</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>สถานะ</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">รอดำเนินการ</SelectItem>
              <SelectItem value="in_progress">กำลังทำ</SelectItem>
              <SelectItem value="review">รอตรวจสอบ</SelectItem>
              <SelectItem value="completed">เสร็จแล้ว</SelectItem>
              <SelectItem value="cancelled">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>วันเริ่มงาน</Label>
          <Input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>กำหนดส่ง</Label>
          <Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label>รายละเอียด</Label>
          <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        <Label>Checklist</Label>
        <div className="space-y-2">
          {form.checklist?.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox checked={item.checked} onCheckedChange={() => toggleChecklistItem(i)} />
              <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>{item.item}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeChecklistItem(i)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="เพิ่มรายการ..." value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addChecklistItem()} />
            <Button variant="outline" size="icon" onClick={addChecklistItem}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <Button onClick={() => onSubmit(form)} disabled={isLoading || !form.title} className="w-full">
        {isLoading ? 'กำลังบันทึก...' : (task ? 'อัปเดต' : 'สร้างงาน')}
      </Button>
    </div>
  );
}