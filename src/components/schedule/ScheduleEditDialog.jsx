import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import MultiUserSelect from '@/components/ui/MultiUserSelect';
import { Trash2 } from 'lucide-react';

const TYPE_LABELS = {
  client_visit: 'Client Visit',
  office: 'Office',
  leave: 'Leave',
  meeting: 'Meeting',
  fieldwork: 'Fieldwork',
  wfh: 'Work from Home',
  other: 'Other',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ScheduleEditDialog({ schedule, open, onOpenChange, onSave, onDelete, users, customers, canEdit, canEditAssignee }) {
  const [form, setForm] = useState(() => ({
    title: schedule?.title || '',
    description: schedule?.description || '',
    date: schedule?.date || '',
    start_time: schedule?.start_time || '',
    end_time: schedule?.end_time || '',
    type: schedule?.type || 'meeting',
    status: schedule?.status || 'scheduled',
    assigned_to: schedule?.assigned_to || '',
    assigned_name: schedule?.assigned_name || '',
    customer_id: schedule?.customer_id || '',
    customer_name: schedule?.customer_name || '',
    department: schedule?.department || '',
    location: schedule?.location || '',
  }));
  const [isSaving, setIsSaving] = useState(false);

  const handleUsersChange = (emails) => {
    const names = emails.map(email => {
      const u = users.find(u => u.email === email);
      return u?.full_name || email;
    });
    setForm(p => ({ ...p, assigned_to: emails, assigned_name: names }));
  };

  const handleCustomerSelect = (id) => {
    if (id === 'none') {
      setForm(p => ({ ...p, customer_id: '', customer_name: '' }));
      return;
    }
    const c = customers.find(c => c.id === id);
    setForm(p => ({ ...p, customer_id: id, customer_name: c?.company_name || '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(schedule.id, form);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('ต้องการลบ Schedule นี้?')) return;
    setIsSaving(true);
    await onDelete(schedule.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{canEdit ? 'แก้ไข Schedule' : 'รายละเอียด Schedule'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">หัวข้อ *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} disabled={!canEdit} className="text-xs h-8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">วันที่</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} disabled={!canEdit} className="text-xs h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานะ</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ประเภท</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานที่</Label>
              <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} disabled={!canEdit} className="text-xs h-8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">เวลาเริ่ม</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} disabled={!canEdit} className="text-xs h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">เวลาสิ้นสุด</Label>
              <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} disabled={!canEdit} className="text-xs h-8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ผู้รับผิดชอบ</Label>
              <MultiUserSelect
                values={Array.isArray(form.assigned_to) ? form.assigned_to : (form.assigned_to ? [form.assigned_to] : [])}
                onValuesChange={handleUsersChange}
                options={users.map(u => ({ value: u.email, label: u.full_name || u.email }))}
                placeholder="เลือกผู้รับผิดชอบ"
                disabled={!canEdit || !canEditAssignee}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ลูกค้า</Label>
              <SearchableSelect
                value={form.customer_id || 'none'}
                onValueChange={handleCustomerSelect}
                options={[{ value: 'none', label: '-' }, ...customers.map(c => ({ value: c.id, label: c.company_name }))]}
                placeholder="เลือกลูกค้า"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">รายละเอียด</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} disabled={!canEdit} className="text-xs" />
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={!form.title || isSaving} className="flex-1 text-xs">
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isSaving} className="shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}