import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { ClipboardPlus } from 'lucide-react';
import { parseUTCDate } from '@/lib/dateUtils';

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

export default function CreateTaskFromChat({ open, onOpenChange, message, chatDisplayName }) {
  const queryClient = useQueryClient();
  const { data: users = [] } = useUserList();
  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 60_000,
  });
  const customers = allCustomers.filter(c => c.status === 'active');

  // Try to auto-match customer by chat display name
  const autoCustomer = useMemo(() => {
    if (!chatDisplayName) return null;
    const name = chatDisplayName.toLowerCase();
    return customers.find(c =>
      c.company_name?.toLowerCase().includes(name) ||
      name.includes(c.company_name?.toLowerCase())
    );
  }, [chatDisplayName, customers]);

  const [form, setForm] = useState({
    title: '',
    description: message?.content || '',
    customer_id: autoCustomer?.id || '',
    customer_name: autoCustomer?.company_name || '',
    service_type: '',
    assigned_to: '',
    assigned_name: '',
    department: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
  });

  // Reset form when message changes
  React.useEffect(() => {
    if (open && message) {
      const matched = customers.find(c =>
        c.company_name?.toLowerCase().includes((chatDisplayName || '').toLowerCase()) ||
        (chatDisplayName || '').toLowerCase().includes(c.company_name?.toLowerCase())
      );
      const descParts = [];
      if (message.content) descParts.push(message.content);
      if (message.file_url) descParts.push(`\nไฟล์แนบจาก LINE: ${message.file_url}`);
      setForm({
        title: '',
        description: descParts.join(''),
        customer_id: matched?.id || '',
        customer_name: matched?.company_name || '',
        service_type: '',
        assigned_to: '',
        assigned_name: '',
        department: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
        attachments: message.file_url ? [message.file_url] : [],
      });
    }
  }, [open, message?.id]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const task = await base44.entities.Task.create(data);
      // Link back: update source LineMessage triage status
      if (message?.id) {
        try {
          await base44.entities.LineMessage.update(message.id, {
            triage_status: 'task_created',
            task_id: task.id,
          });
        } catch (e) {
          console.warn('Failed to update triage status:', e.message);
        }
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['triageCount'] });
      toast.success('สร้างงานจากข้อความ LINE สำเร็จ');
      onOpenChange(false);
    },
    onError: (err) => toast.error('สร้างงานไม่สำเร็จ: ' + err.message),
  });

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('กรุณาใส่ชื่องาน');
      return;
    }
    const payload = {
      ...form,
      source_channel: 'line',
      source_message_id: message?.id || '',
      source_line_user_id: message?.line_user_id || '',
    };
    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPlus className="w-5 h-5 text-primary" />
            สร้างงานจากข้อความ LINE
          </DialogTitle>
          <DialogDescription>
            สร้าง Task จากข้อความที่ลูกค้าส่งมาทาง LINE OA
          </DialogDescription>
        </DialogHeader>

        {/* Original message preview */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium">ข้อความต้นฉบับ:</p>
          {message?.message_type === 'image' && message?.file_url && (
            <img src={message.file_url} alt="รูปภาพ" className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
          )}
          {message?.message_type === 'file' && message?.file_url && (
            <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📎 {message.content || 'ไฟล์แนบ'}</a>
          )}
          {message?.content && <p className="whitespace-pre-wrap">{message.content}</p>}
          <p className="text-[10px] text-muted-foreground">
            จาก: {message?.sender_name || chatDisplayName} · {message?.created_date && parseUTCDate(message.created_date).toLocaleString('th-TH')}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>ชื่องาน *</Label>
            <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="ใส่ชื่องาน..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ลูกค้า</Label>
              <SearchableSelect
                value={form.customer_id}
                onValueChange={v => {
                  const c = customers.find(c => c.id === v);
                  setForm(p => ({ ...p, customer_id: v, customer_name: c?.company_name || '' }));
                }}
                options={customers.map(c => ({ value: c.id, label: c.company_name }))}
                placeholder="เลือกลูกค้า"
              />
            </div>

            <div className="space-y-1.5">
              <Label>ผู้รับผิดชอบ</Label>
              <SearchableSelect
                value={form.assigned_to}
                onValueChange={v => {
                  const u = users.find(u => u.email === v);
                  setForm(p => ({ ...p, assigned_to: v, assigned_name: u?.full_name || '' }));
                }}
                options={users.map(u => ({ value: u.email, label: u.full_name || u.email }))}
                placeholder="เลือกผู้รับผิดชอบ"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label>แผนก</Label>
              <Select value={form.department} onValueChange={v => update('department', v)}>
                <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label>กำหนดส่ง</Label>
              <Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>รายละเอียด</Label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} />
          </div>

          <Button onClick={handleSubmit} disabled={createMutation.isPending || !form.title.trim()} className="w-full">
            {createMutation.isPending ? 'กำลังสร้าง...' : 'สร้างงาน'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}