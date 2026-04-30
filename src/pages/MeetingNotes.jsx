import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '../components/auth/useAccessControl';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Search, Pencil, Trash2, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useUserList } from '../hooks/useUserList';
import StaffMultiSelect from '../components/meeting/StaffMultiSelect';
import SearchableSelect from '../components/ui/SearchableSelect';
import ActionItemCard from '../components/meeting/ActionItemCard';
import PostponeDialog from '../components/meeting/PostponeDialog';
import PostponeHistoryDialog from '../components/meeting/PostponeHistoryDialog';
import RejectPostponeDialog from '../components/meeting/RejectPostponeDialog';
import { normalizeNote, generateId, getNoteBorderClass, getItemPermissions } from '../components/meeting/meetingNoteUtils';

export default function MeetingNotes() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: users = [] } = useUserList();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Dialog states
  const [postponeTarget, setPostponeTarget] = useState(null); // { note, item }
  const [historyTarget, setHistoryTarget] = useState(null); // item
  const [rejectTarget, setRejectTarget] = useState(null); // { note, item }
  const [actionPending, setActionPending] = useState(false);

  const { data: rawNotes = [], isLoading } = useQuery({
    queryKey: ['meetingNotes'],
    queryFn: () => base44.entities.MeetingNote.list('-meeting_date', 200),
    staleTime: 30_000,
  });

  // Normalize all notes (lazy backfill)
  const allNotes = useMemo(() => rawNotes.map(normalizeNote), [rawNotes]);

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 60_000,
  });
  const activeCustomers = useMemo(() => allCustomers.filter(c => c.status === 'active'), [allCustomers]);

  const { data: appConfigs = [] } = useQuery({
    queryKey: ['appConfig', 'line_meeting'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 300_000,
  });
  const getConfig = (key) => appConfigs.find(c => c.key === key)?.value || '';

  const myNotes = useMemo(() => {
    if (!currentUser) return [];
    const role = currentUser.role || '';
    if (role === 'admin' || role === 'management') return allNotes;
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

  // ─── Form state ───
  const emptyForm = {
    title: '', meeting_date: format(new Date(), 'yyyy-MM-dd'),
    staff_emails: [], staff_names: [], notes: '', customer_name: '',
    follow_up_date: '', action_items: [], status: 'open',
  };
  const [form, setForm] = useState(emptyForm);
  const [newActionText, setNewActionText] = useState('');
  const [newActionDue, setNewActionDue] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: (data) => {
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
      sendCreateNotifications(variables);
    },
    onError: (err) => toast.error('สร้างไม่สำเร็จ: ' + (err.message || '')),
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
    onError: (err) => toast.error('อัปเดตไม่สำเร็จ: ' + (err.message || '')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
      toast.success('ลบเรียบร้อย');
    },
  });

  const sendCreateNotifications = (variables) => {
    try {
      const managerName = currentUser.full_name || currentUser.email;
      const actionCount = (variables.action_items || []).length;
      const actionList = (variables.action_items || []).map((a, i) => `${i + 1}. ${a.text}${a.due_date ? ` (กำหนด ${a.due_date})` : ''}`).join('\n');
      const staffEmails = variables.staff_emails || [];
      const staffNamesArr = variables.staff_names || [];

      staffEmails.forEach(email => {
        base44.entities.Notification.create({
          title: `📝 สั่งงานใหม่: ${variables.title}`,
          message: `${managerName} สั่งงาน "${variables.title}"${actionCount > 0 ? ` — ${actionCount} action items` : ''}`,
          type: 'task_assigned',
          target_user: email,
          customer_name: variables.customer_name || '',
        }).catch(() => {});
      });

      const groupId = getConfig('line_group_dept_accounting') || getConfig('line_group_id');
      if (groupId) {
        const lineMsg = `📝 Meeting Note ใหม่\n━━━━━━━━━━━━━━━━\n📄 ${variables.title}\n👤 หัวหน้า: ${managerName}\n👥 พนักงาน: ${staffNamesArr.join(', ') || ''}${variables.customer_name ? `\n🏢 ${variables.customer_name}` : ''}${actionCount > 0 ? `\n\n📋 Action Items (${actionCount}):\n${actionList}` : ''}${variables.follow_up_date ? `\n\n🔔 Follow-up: ${variables.follow_up_date}` : ''}\n━━━━━━━━━━━━━━━━`;
        base44.functions.invoke('lineSendMessage', {
          line_user_id: groupId, message: lineMsg,
          display_name: 'ACC Precision Hub', chat_type: 'group',
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Meeting notification error:', e.message);
    }
  };

  // ─── Action item helpers ───

  /** Persist updated action_items back to note, auto-close/open */
  const persistItems = useCallback(async (noteId, items) => {
    const allDone = items.length > 0 && items.every(i => i.done);
    await base44.entities.MeetingNote.update(noteId, {
      action_items: items,
      status: allDone ? 'closed' : 'open',
    });
    queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
  }, [queryClient]);

  /** Toggle done/undone on an action item */
  const toggleAction = useCallback(async (noteId, itemId) => {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;
    const items = (note.action_items || []).map(item => {
      if (item.id !== itemId) return item;
      const nowDone = !item.done;
      return {
        ...item,
        done: nowDone,
        closed_at: nowDone ? new Date().toISOString() : '',
        closed_by: nowDone ? currentUser.email : '',
        closed_by_name: nowDone ? (currentUser.full_name || currentUser.email) : '',
      };
    });
    await persistItems(noteId, items);
  }, [allNotes, currentUser, persistItems]);

  /** Handle postpone submit */
  const handlePostponeSubmit = useCallback(async ({ newDueDate, reason }) => {
    if (!postponeTarget) return;
    const { note, item } = postponeTarget;
    const perms = getItemPermissions(note, item, currentUser);
    setActionPending(true);

    try {
      const now = new Date().toISOString();
      const requesterRole = perms.isAdmin ? 'admin' : perms.isManager ? 'manager' : 'assignee';
      const items = (note.action_items || []).map(a => {
        if (a.id !== item.id) return a;

        if (perms.isAutoApprover) {
          // Auto-approve: apply immediately
          const evt = {
            requested_at: now, requested_by: currentUser.email,
            requested_by_name: currentUser.full_name || currentUser.email,
            requested_by_role: requesterRole,
            old_due_date: a.due_date, new_due_date: newDueDate, reason,
            decision: 'auto_approved', decided_at: now,
            decided_by: currentUser.email, decided_by_name: currentUser.full_name || currentUser.email,
            decision_note: '',
          };
          return {
            ...a,
            due_date: newDueDate,
            postpone_count: (a.postpone_count || 0) + 1,
            postpone_history: [...(a.postpone_history || []), evt],
            pending_postpone: null,
          };
        } else {
          // Assignee: set pending
          return {
            ...a,
            pending_postpone: {
              requested_at: now, requested_by: currentUser.email,
              requested_by_name: currentUser.full_name || currentUser.email,
              old_due_date: a.due_date, new_due_date: newDueDate, reason,
            },
          };
        }
      });

      await persistItems(note.id, items);

      // Notifications
      if (perms.isAutoApprover) {
        // Notify assignee if different person
        const targetItem = items.find(a => a.id === item.id);
        const assigneeEmail = targetItem?.assignee_email;
        if (assigneeEmail && assigneeEmail !== currentUser.email) {
          base44.entities.Notification.create({
            title: '📅 Due date ถูกเลื่อน',
            message: `${currentUser.full_name || currentUser.email} เลื่อน due date ของ "${item.text}" เป็น ${newDueDate} (เหตุผล: ${reason})`,
            type: 'system', target_user: assigneeEmail,
          }).catch(() => {});
        }
        toast.success('เลื่อน due date เรียบร้อย');
      } else {
        // Notify manager
        if (note.manager_email && note.manager_email !== currentUser.email) {
          base44.entities.Notification.create({
            title: '⏳ คำขอเลื่อน due date',
            message: `${currentUser.full_name || currentUser.email} ขอเลื่อน "${item.text}" เป็น ${newDueDate} (เหตุผล: ${reason})`,
            type: 'system', target_user: note.manager_email,
          }).catch(() => {});
        }
        toast.success('ส่งคำขอเลื่อนเรียบร้อย');
      }
      setPostponeTarget(null);
    } finally {
      setActionPending(false);
    }
  }, [postponeTarget, currentUser, persistItems]);

  /** Handle approve */
  const handleApprove = useCallback(async (note, item) => {
    setActionPending(true);
    try {
      const pending = item.pending_postpone;
      if (!pending) return;
      const now = new Date().toISOString();
      const evt = {
        requested_at: pending.requested_at, requested_by: pending.requested_by,
        requested_by_name: pending.requested_by_name, requested_by_role: 'assignee',
        old_due_date: pending.old_due_date, new_due_date: pending.new_due_date,
        reason: pending.reason, decision: 'approved', decided_at: now,
        decided_by: currentUser.email, decided_by_name: currentUser.full_name || currentUser.email,
        decision_note: '',
      };
      const items = (note.action_items || []).map(a => {
        if (a.id !== item.id) return a;
        return {
          ...a,
          due_date: pending.new_due_date,
          postpone_count: (a.postpone_count || 0) + 1,
          postpone_history: [...(a.postpone_history || []), evt],
          pending_postpone: null,
        };
      });
      await persistItems(note.id, items);
      // Notify requester
      if (pending.requested_by && pending.requested_by !== currentUser.email) {
        base44.entities.Notification.create({
          title: '✅ คำขอเลื่อนได้รับอนุมัติ',
          message: `${currentUser.full_name || currentUser.email} อนุมัติเลื่อน "${item.text}" เป็น ${pending.new_due_date}`,
          type: 'system', target_user: pending.requested_by,
        }).catch(() => {});
      }
      toast.success('อนุมัติเรียบร้อย');
    } finally {
      setActionPending(false);
    }
  }, [currentUser, persistItems]);

  /** Handle reject */
  const handleReject = useCallback(async (decisionNote) => {
    if (!rejectTarget) return;
    const { note, item } = rejectTarget;
    setActionPending(true);
    try {
      const pending = item.pending_postpone;
      if (!pending) return;
      const now = new Date().toISOString();
      const evt = {
        requested_at: pending.requested_at, requested_by: pending.requested_by,
        requested_by_name: pending.requested_by_name, requested_by_role: 'assignee',
        old_due_date: pending.old_due_date, new_due_date: pending.new_due_date,
        reason: pending.reason, decision: 'rejected', decided_at: now,
        decided_by: currentUser.email, decided_by_name: currentUser.full_name || currentUser.email,
        decision_note: decisionNote || '',
      };
      const items = (note.action_items || []).map(a => {
        if (a.id !== item.id) return a;
        return {
          ...a,
          postpone_history: [...(a.postpone_history || []), evt],
          pending_postpone: null,
        };
      });
      await persistItems(note.id, items);
      // Notify requester
      if (pending.requested_by && pending.requested_by !== currentUser.email) {
        base44.entities.Notification.create({
          title: '❌ คำขอเลื่อนถูกปฏิเสธ',
          message: `${currentUser.full_name || currentUser.email} ปฏิเสธเลื่อน "${item.text}"${decisionNote ? ` (${decisionNote})` : ''}`,
          type: 'system', target_user: pending.requested_by,
        }).catch(() => {});
      }
      toast.success('ปฏิเสธเรียบร้อย');
      setRejectTarget(null);
    } finally {
      setActionPending(false);
    }
  }, [rejectTarget, currentUser, persistItems]);

  // ─── Form handlers ───
  const handleStaffChange = (emails) => {
    const names = emails.map(e => users.find(u => u.email === e)?.full_name || e);
    setForm(prev => ({ ...prev, staff_emails: emails, staff_names: names }));
  };

  const addActionItem = () => {
    if (!newActionText.trim()) return;
    const assigneeUser = users.find(u => u.email === newActionAssignee);
    setForm(prev => ({
      ...prev,
      action_items: [...prev.action_items, {
        id: generateId(),
        text: newActionText.trim(),
        done: false,
        due_date: newActionDue || '',
        original_due_date: newActionDue || '',
        assignee_email: newActionAssignee || '',
        assignee_name: assigneeUser?.full_name || newActionAssignee || '',
        postpone_count: 0,
        postpone_history: [],
        pending_postpone: null,
      }],
    }));
    setNewActionText(''); setNewActionDue(''); setNewActionAssignee('');
  };

  const removeActionItem = (idx) => {
    setForm(prev => ({ ...prev, action_items: prev.action_items.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('กรุณากรอกหัวข้อ'); return; }
    if ((form.staff_emails || []).length === 0) { toast.error('กรุณาเลือกพนักงานอย่างน้อย 1 คน'); return; }
    const cleanedForm = {
      ...form,
      action_items: (form.action_items || []).map(item => ({
        ...item,
        id: item.id || generateId(),
        text: String(item.text || ''),
        done: !!item.done,
        due_date: String(item.due_date || ''),
        original_due_date: String(item.original_due_date || item.due_date || ''),
      })),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: cleanedForm });
    } else {
      createMutation.mutate(cleanedForm);
    }
  };

  const handleEdit = (note) => {
    setEditing(note);
    const staffEmails = note.staff_emails?.length ? note.staff_emails : (note.staff_email ? [note.staff_email] : []);
    const staffNames = note.staff_names?.length ? note.staff_names : (note.staff_name ? [note.staff_name] : []);
    setForm({
      title: note.title || '', meeting_date: note.meeting_date || '',
      staff_emails: staffEmails, staff_names: staffNames,
      notes: note.notes || '', customer_name: note.customer_name || '',
      follow_up_date: note.follow_up_date || '',
      action_items: note.action_items || [], status: note.status || 'open',
    });
    setNewActionText(''); setNewActionDue(''); setNewActionAssignee('');
    setShowForm(true);
  };

  // Assignee options for form — from selected staff_emails
  const assigneeOptions = useMemo(() => {
    return (form.staff_emails || []).map(email => {
      const u = users.find(u => u.email === email);
      return { value: email, label: u?.full_name || email };
    });
  }, [form.staff_emails, users]);

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
        <Button size="sm" className="gap-1.5 self-start" onClick={() => { setEditing(null); setForm(emptyForm); setNewActionText(''); setNewActionDue(''); setNewActionAssignee(''); setShowForm(true); }}>
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

            return (
              <Card key={note.id} className={`shadow-sm border ${getNoteBorderClass(note)}`}>
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
                      {(isManager || currentUser?.role === 'admin' || currentUser?.role === 'management') && (
                        <>
                          {note.status === 'open' ? (
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="ปิดงาน"
                              onClick={() => { updateMutation.mutate({ id: note.id, data: { status: 'closed' } }); }}>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="เปิดงานอีกครั้ง"
                              onClick={() => { updateMutation.mutate({ id: note.id, data: { status: 'open' } }); }}>
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            </Button>
                          )}
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

                  {/* Action items */}
                  {actionItems.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground">Action Items ({doneCount}/{actionItems.length})</p>
                      {actionItems.map(item => (
                        <ActionItemCard
                          key={item.id}
                          note={note}
                          item={item}
                          currentUser={currentUser}
                          onToggleDone={() => toggleAction(note.id, item.id)}
                          onPostpone={() => setPostponeTarget({ note, item })}
                          onApprove={() => handleApprove(note, item)}
                          onReject={() => setRejectTarget({ note, item })}
                          onShowHistory={() => setHistoryTarget(item)}
                        />
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

      {/* ═══ Dialogs ═══ */}

      {/* Postpone Dialog */}
      {postponeTarget && (
        <PostponeDialog
          open={!!postponeTarget}
          onOpenChange={v => { if (!v) setPostponeTarget(null); }}
          item={postponeTarget.item}
          isAutoApprover={getItemPermissions(postponeTarget.note, postponeTarget.item, currentUser).isAutoApprover}
          onSubmit={handlePostponeSubmit}
          isPending={actionPending}
        />
      )}

      {/* History Dialog */}
      {historyTarget && (
        <PostponeHistoryDialog
          open={!!historyTarget}
          onOpenChange={v => { if (!v) setHistoryTarget(null); }}
          item={historyTarget}
        />
      )}

      {/* Reject Dialog */}
      {rejectTarget && (
        <RejectPostponeDialog
          open={!!rejectTarget}
          onOpenChange={v => { if (!v) setRejectTarget(null); }}
          onReject={handleReject}
          isPending={actionPending}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขบันทึก' : 'สร้างบันทึกใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
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
              <SearchableSelect
                value={form.customer_name}
                onValueChange={v => setForm(p => ({ ...p, customer_name: v }))}
                options={activeCustomers.map(c => ({ value: c.company_name, label: c.company_name }))}
                placeholder="พิมพ์ค้นหาชื่อลูกค้า..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>เนื้อหาที่คุย/สั่งงาน</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="จดบันทึกสิ่งที่คุย..." rows={3} />
            </div>

            {/* Action Items */}
            <div className="space-y-2">
              <Label>Action Items — สิ่งที่ต้องทำ</Label>
              {form.action_items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs">{item.text}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.due_date && <span className="text-[10px] text-muted-foreground">📅 {item.due_date}</span>}
                      {item.assignee_name && <span className="text-[10px] text-muted-foreground">👤 {item.assignee_name}</span>}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeActionItem(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="space-y-1.5 bg-muted/30 rounded-lg p-2">
                <div className="flex gap-2">
                  <Input value={newActionText} onChange={e => setNewActionText(e.target.value)} placeholder="เพิ่มสิ่งที่ต้องทำ..."
                    className="text-xs h-8 flex-1"
                    onKeyDown={e => e.key === 'Enter' && addActionItem()} />
                  <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={addActionItem}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input type="date" value={newActionDue} onChange={e => setNewActionDue(e.target.value)} className="text-xs h-7 flex-1" placeholder="กำหนด" />
                  <Select value={newActionAssignee} onValueChange={setNewActionAssignee}>
                    <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="ผู้รับผิดชอบ" /></SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>วัน Follow-up (optional)</Label>
              <Input type="date" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t mt-2 shrink-0">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>ยกเลิก</Button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              disabled={createMutation.isPending || updateMutation.isPending}
              onPointerDown={(e) => { e.preventDefault(); handleSave(); }}
            >
              {editing ? 'บันทึก' : 'สร้าง'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}