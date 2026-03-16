import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ServiceBadge from '../components/shared/ServiceBadge';

export default function TaskTemplates() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [newItem, setNewItem] = useState('');
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['taskTemplates'],
    queryFn: () => base44.entities.TaskTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taskTemplates'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskTemplates'] }),
  });

  const addChecklist = () => {
    if (!newItem.trim()) return;
    setForm(p => ({ ...p, default_checklist: [...(p.default_checklist || []), { item: newItem, checked: false }] }));
    setNewItem('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">เทมเพลตงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">Task Template & Recurring Task Planner</p>
        </div>
        <Button onClick={() => { setForm({ recurring_type: 'none', default_priority: 'medium' }); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> สร้างเทมเพลต
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.service_type && <ServiceBadge service={t.service_type} />}
                {t.recurring_type && t.recurring_type !== 'none' && (
                  <Badge variant="outline">{t.recurring_type}</Badge>
                )}
              </div>
              {t.default_checklist?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Checklist: {t.default_checklist.length} รายการ</p>
              )}
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">ยังไม่มีเทมเพลต</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>สร้างเทมเพลตงาน</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>ชื่อ *</Label><Input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>รายละเอียด</Label><Textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ประเภทบริการ</Label>
                <Select value={form.service_type || ''} onValueChange={v => setForm(p => ({ ...p, service_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accounting">ทำบัญชี</SelectItem>
                    <SelectItem value="payroll">เงินเดือน</SelectItem>
                    <SelectItem value="tax_consulting">ที่ปรึกษาภาษี</SelectItem>
                    <SelectItem value="audit">ตรวจสอบบัญชี</SelectItem>
                    <SelectItem value="peak_licensing">Peak Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>งานประจำ</Label>
                <Select value={form.recurring_type || 'none'} onValueChange={v => setForm(p => ({ ...p, recurring_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ไม่ประจำ</SelectItem>
                    <SelectItem value="monthly">รายเดือน</SelectItem>
                    <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                    <SelectItem value="yearly">รายปี</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Checklist</Label>
              {(form.default_checklist || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">• {item.item}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setForm(p => ({ ...p, default_checklist: p.default_checklist.filter((_, idx) => idx !== i) }))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="เพิ่มรายการ..." value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} />
                <Button variant="outline" size="icon" onClick={addChecklist}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'กำลังบันทึก...' : 'สร้างเทมเพลต'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}