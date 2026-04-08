import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useUserList } from '@/hooks/useUserList';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Download, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import TaskForm from '../components/tasks/TaskForm';
import TaskStatsRow from '../components/tasks/TaskStatsRow';
import TaskDeptTabs from '../components/tasks/TaskDeptTabs';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskTable from '../components/tasks/TaskTable';
import TablePagination, { paginateData } from '../components/shared/TablePagination';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';

export default function Tasks() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selected, setSelected] = useState([]);
  const [sortField, setSortField] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState({
    search: '', department: 'all', status: 'all', priority: 'all',
    owner: 'all', serviceType: 'all', client: 'all', taskType: 'all',
    dateFrom: '', dateTo: '', _count: 0, _total: 0,
  });
  const queryClient = useQueryClient();

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
  });
  // Apply department-based visibility
  const tasks = ac.filterByDepartment(allTasks);
  const { data: allCustomers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 500), staleTime: 60_000 });
  const customers = allCustomers.filter(c => c.status === 'active');
  const { data: users = [] } = useUserList();

  // ดึง LINE group ID สำหรับแจ้งเตือน
  const { data: lineConfigs = [] } = useQuery({
    queryKey: ['appConfig', 'line_accounting'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 300_000,
  });
  const getLineConfig = (key) => lineConfigs.find(c => c.key === key)?.value || '';

  // ส่ง LINE ไปกลุ่มบัญชี (non-blocking)
  const sendLineToAccounting = (message) => {
    try {
      const groupId = getLineConfig('line_group_dept_accounting');
      if (!groupId) return;
      base44.functions.invoke('lineSendMessage', {
        line_user_id: groupId,
        message,
        display_name: 'ACC Precision Hub',
        chat_type: 'group',
      }).catch(e => console.warn('LINE send failed:', e.message));
    } catch (e) { console.warn('LINE config error:', e.message); }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setEditingTask(null); },
  });

  const isReviewer = ['admin', 'management', 'manager', 'super_supervisor'].includes(currentUser?.role);
  const isStaff = currentUser?.role === 'staff';

  const handleApprove = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const checklist = task.checklist || [];
      const checkedCount = checklist.filter(item => item.checked).length;
      if (checklist.length > 0 && checkedCount !== checklist.length) {
        toast.error(`ไม่สามารถ Approve ได้ — checklist ยังไม่ครบ (${checkedCount}/${checklist.length}) กรุณาส่งกลับให้ staff ทำให้ครบก่อน`);
        return;
      }
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.Task.update(taskId, {
      status: 'completed',
      completed_date: today,
      review_status: 'approved',
      reviewer_email: currentUser.email,
      reviewer_name: currentUser.full_name || currentUser.email,
      reviewed_date: today,
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('✅ Approve เรียบร้อย — งานปิดแล้ว');

    // แจ้งเตือน staff ว่างาน approved
    try {
      const reviewerName = currentUser.full_name || currentUser.email;
      if (task?.assigned_to && task.assigned_to !== currentUser.email) {
        base44.entities.Notification.create({
          title: `✅ งาน Approved: ${task.title}`,
          message: `${reviewerName} approve งาน "${task.title}" เรียบร้อย`,
          type: 'task_completed',
          target_user: task.assigned_to,
          related_entity_type: 'Task',
          related_entity_id: taskId,
          customer_name: task.customer_name || '',
        }).catch(e => console.warn('Approve notification failed:', e.message));
      }
      sendLineToAccounting(
        `✅ งาน Approved\n━━━━━━━━━━━━━━━━\n📄 ${task?.title || ''}\n🏢 ${task?.customer_name || '-'}\n👤 ผู้รับผิดชอบ: ${task?.assigned_name || '-'}\n🔍 Approved โดย: ${reviewerName}\n━━━━━━━━━━━━━━━━`
      );
    } catch (e) { console.warn('Approve notification error:', e.message); }
  };

  const handleReject = async (taskId) => {
    const note = prompt('เหตุผลที่ส่งกลับ:');
    if (note === null) return;
    await base44.entities.Task.update(taskId, {
      status: 'in_progress',
      review_status: 'rejected',
      reviewer_email: currentUser.email,
      reviewer_name: currentUser.full_name || currentUser.email,
      reviewed_date: format(new Date(), 'yyyy-MM-dd'),
      review_note: note || '',
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('📤 ส่งกลับให้แก้ไขแล้ว');

    // แจ้งเตือน staff ที่ถูก reject
    try {
      const task = tasks.find(t => t.id === taskId);
      const reviewerName = currentUser.full_name || currentUser.email;
      if (task?.assigned_to) {
        base44.entities.Notification.create({
          title: `⚠️ งานถูกส่งกลับ: ${task.title}`,
          message: `${reviewerName} ส่งกลับงาน "${task.title}"${note ? ` — เหตุผล: ${note}` : ''} กรุณาแก้ไขแล้วส่งตรวจใหม่`,
          type: 'task_assigned',
          target_user: task.assigned_to,
          related_entity_type: 'Task',
          related_entity_id: taskId,
          customer_name: task.customer_name || '',
        }).catch(e => console.warn('Reject notification failed:', e.message));
      }
      sendLineToAccounting(
        `⚠️ งานถูกส่งกลับ\n━━━━━━━━━━━━━━━━\n📄 ${task?.title || ''}\n🏢 ${task?.customer_name || '-'}\n👤 ผู้รับผิดชอบ: ${task?.assigned_name || '-'}\n🔍 ส่งกลับโดย: ${reviewerName}\n📝 เหตุผล: ${note || '-'}\n━━━━━━━━━━━━━━━━\n💡 กรุณาแก้ไขแล้วส่งตรวจใหม่`
      );
    } catch (e) { console.warn('Reject notification error:', e.message); }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    if (submitting) return;
    setSubmitting(true);

    // Staff ห้ามกด completed
    if (isStaff && data.status === 'completed') {
      toast.error('ไม่สามารถปิดงานเองได้ — ต้องส่งตรวจให้หัวหน้า approve');
      setSubmitting(false);
      return;
    }

    // เช็ค checklist ก่อนส่งตรวจ
    if (data.status === 'review') {
      const checklist = data.checklist || [];
      const checkedCount = checklist.filter(item => item.checked).length;
      if (checklist.length > 0 && checkedCount !== checklist.length) {
        toast.error(`กรุณา check checklist ให้ครบก่อนส่งตรวจ (${checkedCount}/${checklist.length})`);
        setSubmitting(false);
        return;
      }
      data.review_status = 'pending_review';

      // แจ้งเตือน reviewer ว่ามีงานรอตรวจ
      try {
        const taskDept = data.department || editingTask?.department || '';
        const reviewers = users.filter(u =>
          ['admin', 'management', 'manager', 'super_supervisor'].includes(u.role) &&
          u.email !== currentUser.email &&
          (!taskDept || u.department === taskDept || u.role === 'admin' || u.role === 'management')
        );
        const staffName = currentUser.full_name || currentUser.email;
        const taskTitle = data.title || editingTask?.title || '';
        const customerName = data.customer_name || editingTask?.customer_name || '';
        for (const reviewer of reviewers.slice(0, 5)) {
          base44.entities.Notification.create({
            title: `📋 งานรอตรวจ: ${taskTitle}`,
            message: `${staffName} ส่งตรวจงาน "${taskTitle}"${customerName ? ` (${customerName})` : ''} — กรุณาตรวจสอบและ Approve`,
            type: 'task_assigned',
            target_user: reviewer.email,
            related_entity_type: 'Task',
            related_entity_id: editingTask?.id || '',
            customer_name: customerName,
          }).catch(e => console.warn('Notification failed:', e.message));
        }
        sendLineToAccounting(
          `📋 งานรอตรวจ\n━━━━━━━━━━━━━━━━\n📄 ${taskTitle}${customerName ? `\n🏢 ${customerName}` : ''}\n👤 ส่งโดย: ${staffName}\n📌 สถานะ: รอตรวจสอบ\n━━━━━━━━━━━━━━━━\n💡 เปิด ACC Precision Hub → Tasks เพื่อ Approve`
        );
      } catch (e) { console.warn('Review notification error:', e.message); }
    }

    // ถ้า reviewer ปิดงานตรง (ไม่ผ่าน review) → set reviewer info ด้วย
    if (data.status === 'completed' && isReviewer) {
      const checklist = data.checklist || editingTask?.checklist || [];
      const checkedCount = checklist.filter(item => item.checked).length;
      if (checklist.length > 0 && checkedCount !== checklist.length) {
        toast.error(`ไม่สามารถปิดงานได้ — checklist ยังไม่ครบ (${checkedCount}/${checklist.length})`);
        setSubmitting(false);
        return;
      }
      const today = format(new Date(), 'yyyy-MM-dd');
      data.completed_date = today;
      data.review_status = 'approved';
      data.reviewer_email = currentUser.email;
      data.reviewer_name = currentUser.full_name || currentUser.email;
      data.reviewed_date = today;
      if (!data.review_note) data.review_note = 'ปิดงานโดยหัวหน้างาน (ไม่ผ่าน review)';
    }

    // Auto set completed_date when status changes to completed
    if (data.status === 'completed' && !data.completed_date) {
      data.completed_date = format(new Date(), 'yyyy-MM-dd');
    }
    // Clear completed_date if status is no longer completed
    if (data.status !== 'completed') {
      data.completed_date = null;
    }

    // Auto time tracking on status change
    if (editingTask && currentUser && editingTask.status !== data.status) {
      autoTimeTrack(editingTask, data.status, currentUser);
    }

    // Track due date change history when editing
    const oldDueNorm = editingTask?.due_date?.split('T')[0] || '';
    const newDueNorm = data.due_date?.split('T')[0] || '';
    if (editingTask && newDueNorm && oldDueNorm && newDueNorm !== oldDueNorm) {
      const currentHistory = Array.isArray(editingTask.due_date_change_history) ? editingTask.due_date_change_history : [];
      const currentCount = editingTask.due_date_change_count || 0;
      data.due_date_change_count = currentCount + 1;
      data.due_date_change_history = [...currentHistory, {
        changed_at: new Date().toISOString(),
        changed_by: currentUser?.email || 'unknown',
        changed_by_name: currentUser?.full_name || currentUser?.email || 'unknown',
        changed_by_role: currentUser?.role || '',
        old_due_date: oldDueNorm,
        new_due_date: newDueNorm,
        reason: 'แก้ไขจากหน้า Task Control Center',
      }];
    }

    if (editingTask) updateMutation.mutate({ id: editingTask.id, data }, { onSettled: () => setSubmitting(false) });
    else createMutation.mutate(data, { onSettled: () => setSubmitting(false) });
  };

  // Clamp a Date to working hours (09:00–18:00) on the same day
  const clampToWorkHours = (date) => {
    const d = new Date(date);
    const h = d.getHours();
    if (h < 9) { d.setHours(9, 0, 0, 0); }
    if (h >= 18) { d.setHours(18, 0, 0, 0); }
    return d;
  };

  // Auto start/stop timer when status changes
  const autoTimeTrack = async (task, newStatus, user) => {
    try {
      const entries = await base44.entities.TimeEntry.filter({ task_id: task.id, is_running: true }, '-created_date', 10);
      const myRunning = entries.find(e => e.user_email === user.email);

      if (newStatus === 'in_progress' && !myRunning) {
        // Auto-start timer — clamp to working hours
        const startTime = clampToWorkHours(new Date());
        await base44.entities.TimeEntry.create({
          task_id: task.id, task_title: task.title,
          customer_id: task.customer_id || '', customer_name: task.customer_name || '',
          service_type: task.service_type || '', department: task.department || '',
          user_email: user.email, user_name: user.full_name || user.email,
          start_time: startTime.toISOString(), is_running: true,
          description: 'เริ่มอัตโนมัติ (status → In Progress)',
        });
      } else if ((newStatus === 'completed' || newStatus === 'review') && myRunning) {
        // Auto-stop timer — clamp both start & end to working hours
        const rawStart = new Date(myRunning.start_time);
        const rawEnd = new Date();
        const clampedStart = clampToWorkHours(rawStart);
        const clampedEnd = clampToWorkHours(rawEnd);
        const duration = Math.max(0, (clampedEnd - clampedStart) / 60000);
        await base44.entities.TimeEntry.update(myRunning.id, {
          end_time: clampedEnd.toISOString(),
          duration_minutes: Math.round(duration * 100) / 100,
          is_running: false,
          description: (myRunning.description || '') + ` (หยุดอัตโนมัติ: status → ${newStatus})`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    } catch (e) {
      console.warn('Auto time track failed:', e.message);
    }
  };

  const filtered = useMemo(() => {
    let result = filters.status === 'all'
      ? tasks.filter(t => t.status !== 'cancelled' && t.status !== 'completed')
      : tasks;
    const f = filters;
    if (f.search) {
      const s = f.search.toLowerCase();
      result = result.filter(t => t.title?.toLowerCase().includes(s) || t.customer_name?.toLowerCase().includes(s) || String(t.id).includes(s));
    }
    if (f.department !== 'all') result = result.filter(t => t.department === f.department);
    if (f.status !== 'all') result = result.filter(t => t.status === f.status);
    if (f.priority !== 'all') result = result.filter(t => t.priority === f.priority);
    if (f.owner !== 'all') result = result.filter(t => t.assigned_to === f.owner);
    if (f.serviceType !== 'all') result = result.filter(t => t.service_type === f.serviceType);
    if (f.client !== 'all') result = result.filter(t => t.customer_id === f.client);
    if (f.taskType !== 'all') {
      if (f.taskType === 'recurring') result = result.filter(t => t.is_recurring);
      else result = result.filter(t => !t.is_recurring);
    }
    if (f.dateFrom) result = result.filter(t => t.due_date && t.due_date >= f.dateFrom);
    if (f.dateTo) result = result.filter(t => t.due_date && t.due_date <= f.dateTo);

    // Sort
    result.sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (sortField === 'due_date' || sortField === 'updated_date') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, filters, sortField, sortDir]);

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [filters, sortField, sortDir]);

  const paged = paginateData(filtered, page, pageSize);

  // Update counts in filters for display
  const filtersWithCounts = { ...filters, _count: filtered.length, _total: tasks.length };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">Task Control Center</h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{tasks.length} tasks</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Daily operational workspace — monitor, assign, and resolve tasks across departments</p>
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-auto">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs hidden sm:flex"><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditingTask(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Task
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <TaskStatsRow tasks={tasks} />

      {/* Task Form passes permissions for field-level control */}

      {/* Dept Tabs */}
      <TaskDeptTabs tasks={tasks} />

      {/* Filters */}
      <TaskFilters filters={filtersWithCounts} setFilters={setFilters} customers={customers} users={users} />

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : (
        <>
          <TaskTable
           tasks={paged}
           selected={selected}
           setSelected={setSelected}
           onRowClick={(task) => { setEditingTask(task); setShowForm(true); }}
           sortField={sortField}
           sortDir={sortDir}
           onSort={(field, dir) => { setSortField(field); setSortDir(dir); }}
           users={users}
           isReviewer={isReviewer}
           onApprove={handleApprove}
           onReject={handleReject}
          />
          <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Task Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTask ? t('edit_task') : t('create_task')}</DialogTitle></DialogHeader>
          <TaskForm task={editingTask} onSubmit={handleSubmit} isLoading={submitting || createMutation.isPending || updateMutation.isPending} permissions={ac} currentUser={currentUser} />
        </DialogContent>
      </Dialog>
    </div>
  );
}