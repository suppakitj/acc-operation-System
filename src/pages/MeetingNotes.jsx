import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '../components/auth/useAccessControl';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText, Plus, Search, Pencil, Trash2, CalendarDays,
  CheckCircle2, Circle, X, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserList } from '../hooks/useUserList';
import StaffMultiSelect from '../components/meeting/StaffMultiSelect';

export default function MeetingNotes() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: users = [] } = useUserList();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // ดึง meeting notes — manager เห็นที่ตัวเองสร้าง + staff เห็นที่ถูกสั่ง
  const { data: allNotes = [], isLoading } = useQuery({
    queryKey: ['meetingNotes'],
    queryFn: () => base44.entities.MeetingNote.list('-meeting_date', 200),
    staleTime: 30_000,
  });
  
  const { data: appConfigs = [] } = useQuery({
    queryKey: ['appConfig', 'line_meeting'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 300_000,
  });
  const getConfig = (key) => appConfigs.find(c => c.key === key)?.value || '';

  const myNotes = useMemo(() => {
    if (!currentUser) return [];
    return allNotes.filter(n =>
      n.manager_email === currentUser.email ||
      n.staff_email === currentUser.email ||
      (n.staff_emails || []).includes(currentUser.email)
    );
  }, [allNotes, currentUser]);

  const filteredNotes = useMemo(() => {
    let notes = myNotes;
    if (statusFilter !== 'all') notes = notes.filter(n => n.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      notes = notes.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.staff_name?.toLowerCase().includes(q) ||
        n.customer_name?.toLowerCase().includes(q) ||
        n.notes?.toLowerCase().includes(q)
      );
    }
    return notes;
  }, [myNotes, statusFilter, search]);

  const emptyForm = {
    title: '', meeting_date: format(new Date(), 'yyyy-MM-dd'),
    staff_emails: [], staff_names: [], notes: '', customer_name: '',
    follow_up_date: '', action_items: [], status: 'open',
  };
  const [form, setForm] = useState(emptyForm);
  const [newActionText, setNewActionText] = useState('');
  const [newActionDue, setNewActionDue] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => {
      // backward compat: set staff_email/staff_name from first item
      const staffEmails = data.staff_emails || [];
      const staffNames = data.staff_names || [];
      return base44.entities.MeetingNote.create({
        ...data,
        staff_email: staffEmails[0] || '',
        staff_name: staffNames[0] || '',
        manager_email: currentUser.email,
        manager_name: currentUser.full_name || currentUser.email,
      });
    },
    onSuccess: (created, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
      setShowForm(false); setEditing(null); setForm(emptyForm);
      toast.success('บันทึกเรียบร้อย');

      // ── แจ้งเตือน staff ──
      try {
        const managerName = currentUser.full_name || currentUser.email;
        const actionCount = (variables.action_items || []).length;
        const actionList = (variables.action_items || []).map((a, i) => `${i + 1}. ${a.text}${a.due_date ? ` (กำหนด ${a.due_date})` : ''}`).join('\n');
        const staffEmails = variables.staff_emails || [];
        const staffNamesArr = variables.staff_names || [];

        // Notification ในระบบ — ส่งให้ทุกคน
        staffEmails.forEach(email => {
          base44.entities.Notification.create({
            title: `📝 สั่งงานใหม่: ${variables.title}`,
            message: `${managerName} สั่งงาน "${variables.title}"${actionCount > 0 ? ` — ${actionCount} action items` : ''}`,
            type: 'task_assigned',
            target_user: email,
            customer_name: variables.customer_name || '',
          }).catch(e => console.warn('Notification failed:', e.message));
        });

        // LINE กลุ่มบัญชี
        const groupId = getConfig('line_group_dept_accounting') || getConfig('line_group_id');
        if (groupId) {
          const lineMsg = `📝 Meeting Note ใหม่\n━━━━━━━━━━━━━━━━\n📄 ${variables.title}\n👤 หัวหน้า: ${managerName}\n👥 พนักงาน: ${staffNamesArr.join(', ') || ''}${variables.customer_name ? `\n🏢 ${variables.customer_name}` : ''}${actionCount > 0 ? `\n\n📋 Action Items (${actionCount}):\n${actionList}` : ''}${variables.follow_up_date ? `\n\n🔔 Follow-up: ${variables.follow_up_date}` : ''}\n━━━━━━━━━━━━━━━━`;
          base44.functions.invoke('lineSendMessage', {
            line_user_id: groupId,
            message: lineMsg,
            display_name: 'ACC Precision Hub',
            chat_type: 'group',
          }).catch(e => console.warn('LINE send failed:', e.message));
        }
      } catch (e) {
        console.warn('Meeting notification error:', e.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const staffEmails = data.staff_emails || [];
      const staffNames = data.staff_names || [];
      return base44.entities.MeetingNote.update(id, {
        ...data,
        staff_email: staffEmails[0] || '',
        staff_name: staffNames[0] || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
      setShowForm(false); setEditing(null); setForm(emptyForm);
      toast.success('อัปเดตเรียบร้อย');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
      toast.success('ลบเรียบร้อย');
    },
  });

  // Toggle action item done
  const toggleAction = async (noteId, actionIdx) => {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;
    const items = [...(note.action_items || [])];
    items[actionIdx] = { ...items[actionIdx], done: !items[actionIdx].done };
    // ถ้า action items ครบหมด → auto close
    const allDone = items.every(i => i.done);
    await base44.entities.MeetingNote.update(noteId, {
      action_items: items,
      status: allDone ? 'closed' : 'open',
    });
    queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
  };

  // Add action item
  const addActionItem = () => {
    if (!newActionText.trim()) return;
    setForm(prev => ({
      ...prev,
      action_items: [...prev.action_items, { text: newActionText.trim(), done: false, due_date: newActionDue || '' }],
    }));
    setNewActionText(''); setNewActionDue('');
  };

  // Remove action item
  const removeActionItem = (idx) => {
    setForm(prev => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== idx),
    }));
  };

  // Select staff helper — multi
  const handleStaffChange = (emails) => {
    const names = emails.map(e => users.find(u => u.email === e)?.full_name || e);
    setForm(prev => ({ ...prev, staff_emails: emails, staff_names: names }));
  };

  const handleSave = () => {
    if (!form.title.trim() || (form.staff_emails || []).length === 0) {
      toast.error('กรุณากรอกหัวข้อและเลือกพนักงานอย่างน้อย 1 คน');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (note) => {
    setEditing(note);
    // backward compat: migrate old single staff to arrays
    const staffEmails = note.staff_emails?.length ? note.staff_emails : (note.staff_email ? [note.staff_email] : []);
    const staffNames = note.staff_names?.length ? note.staff_names : (note.staff_name ? [note.staff_name] : []);
    setForm({
      title: note.title || '', meeting_date: note.meeting_date || '',
      staff_emails: staffEmails, staff_names: staffNames,
      notes: note.notes || '', customer_name: note.customer_name || '',
      follow_up_date: note.follow_up_date || '',
      action_items: note.action_items || [], status: note.status || 'open',
    });
    setShowForm(true);
  };

  // Permission: ทุก role เข้าถึงได้ (เห็นเฉพาะของตัวเอง)
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Meeting Notes
          </h1>
          <p className="text-xs text-muted-foreground mt-1">บันทึกการสั่งงาน/ประชุม 1-on-1 — กันลืมเวลาสั่งงานปากเปล่า</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> สร้างบันทึกใหม่
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="open">ยังไม่ปิด</SelectItem>
            <SelectItem value="closed">ปิดแล้ว</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">{filteredNotes.length} รายการ</span>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลด...</div>
      ) : filteredNotes.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">ยังไม่มีบันทึก — กด "สร้างบันทึกใหม่" เพื่อเริ่ม</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => {
            const isManager = note.manager_email === currentUser?.email;
            const actionItems = note.action_items || [];
            const doneCount = actionItems.filter(a => a.done).length;
            const hasOverdue = actionItems.some(a => !a.done && a.due_date && new Date(a.due_date) < new Date());

            return (
              <Card key={note.id} className={`shadow-sm border ${note.status === 'closed' ? 'opacity-60' : hasOverdue ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-indigo-400'}`}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold">{note.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          📅 {note.meeting_date ? format(new Date(note.meeting_date), 'd MMM yy', { locale: th }) : '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          👤 {isManager
                            ? (note.staff_names?.length ? note.staff_names.join(', ') : note.staff_name)
                            : note.manager_name}
                        </span>
                        {note.customer_name && <span className="text-[10px] text-muted-foreground">🏢 {note.customer_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[9px] ${note.status === 'closed' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {note.status === 'closed' ? '✅ ปิดแล้ว' : '📝 เปิดอยู่'}
                      </Badge>
                      {isManager && (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(note)}>
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (confirm('ลบบันทึกนี้?')) deleteMutation.mutate(note.id); }}>
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes content */}
                  {note.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-2 whitespace-pre-wrap">{note.notes}</p>
                  )}

                  {/* Action items — ทั้ง manager และ staff กด check ได้ */}
                  {actionItems.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground">Action Items ({doneCount}/{actionItems.length})</p>
                      {actionItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 py-0.5">
                          <Checkbox
                            checked={item.done}
                            onCheckedChange={() => toggleAction(note.id, idx)}
                            disabled={note.status === 'closed'}
                          />
                          <span className={`text-xs flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.text}</span>
                          {item.due_date && (
                            <span className={`text-[10px] ${!item.done && new Date(item.due_date) < new Date() ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(item.due_date), 'd MMM', { locale: th })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-up */}
                  {note.follow_up_date && (
                    <p className="text-[10px] text-muted-foreground">
                      🔔 Follow-up: {format(new Date(note.follow_up_date), 'd MMM yy', { locale: th })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขบันทึก' : 'สร้างบันทึกใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>หัวข้อ *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="เช่น สั่งงาน สมชาย เรื่อง ปิดงบ ABC" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>วันที่ประชุม</Label>
                <Input type="date" value={form.meeting_date} onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>พนักงาน *</Label>
                <StaffMultiSelect
                  users={users}
                  selected={form.staff_emails || []}
                  onChange={handleStaffChange}
                  excludeEmail={currentUser?.email}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ลูกค้าที่เกี่ยวข้อง (optional)</Label>
              <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="ชื่อลูกค้า" />
            </div>

            <div className="space-y-1.5">
              <Label>เนื้อหาที่คุย/สั่งงาน</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="จดบันทึกสิ่งที่คุย..." rows={3} />
            </div>

            {/* Action Items */}
            <div className="space-y-2">
              <Label>Action Items — สิ่งที่ต้องทำ</Label>
              {form.action_items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5">
                  <span className="text-xs flex-1">{item.text}</span>
                  {item.due_date && <span className="text-[10px] text-muted-foreground">{item.due_date}</span>}
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeActionItem(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newActionText} onChange={e => setNewActionText(e.target.value)} placeholder="เพิ่มสิ่งที่ต้องทำ..."
                  className="text-xs h-8 flex-1"
                  onKeyDown={e => e.key === 'Enter' && addActionItem()} />
                <Input type="date" value={newActionDue} onChange={e => setNewActionDue(e.target.value)} className="text-xs h-8 w-[140px]" />
                <Button variant="outline" size="sm" className="h-8" onClick={addActionItem}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>วัน Follow-up (optional)</Label>
              <Input type="date" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>ยกเลิก</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'บันทึก' : 'สร้าง'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}