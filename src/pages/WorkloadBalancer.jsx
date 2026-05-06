import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { Scale, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import WorkloadCard from '@/components/workload/WorkloadCard';
import WorkloadSummaryBar from '@/components/workload/WorkloadSummaryBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TaskForm from '@/components/tasks/TaskForm';
import { format } from 'date-fns';

export default function WorkloadBalancer() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: users = [] } = useUserList();
  const [deptFilter, setDeptFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
    staleTime: 60_000,
  });

  const activeTasks = useMemo(() =>
    allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'review'),
    [allTasks]
  );

  const today = format(new Date(), 'yyyy-MM-dd');

  // Build people data
  const people = useMemo(() => {
    const activeUsers = users.filter(u => u.user_status !== 'inactive');
    return activeUsers
      .filter(u => deptFilter === 'all' || u.department === deptFilter || u.departments?.includes(deptFilter))
      .map(u => {
        const myTasks = activeTasks.filter(t => t.assigned_to === u.email);
        const overdueTasks = myTasks.filter(t => t.due_date && t.due_date < today).length;
        return {
          email: u.email,
          name: u.full_name || u.nickname || u.email.split('@')[0],
          department: u.department,
          position: u.position,
          maxTasks: u.max_tasks || 50,
          activeTasks: myTasks,
          overdueTasks,
        };
      })
      .sort((a, b) => {
        // Sort: overloaded first, then by utilization desc
        const aUtil = a.maxTasks > 0 ? a.activeTasks.length / a.maxTasks : 0;
        const bUtil = b.maxTasks > 0 ? b.activeTasks.length / b.maxTasks : 0;
        return bUtil - aUtil;
      });
  }, [users, activeTasks, deptFilter, today]);

  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: ({ taskId, newEmail }) => {
      const targetUser = users.find(u => u.email === newEmail);
      return base44.entities.Task.update(taskId, {
        assigned_to: newEmail,
        assigned_name: targetUser?.full_name || newEmail.split('@')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('ย้ายงานสำเร็จ');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
    },
  });

  const handleReassign = (task, newEmail) => {
    if (task.assigned_to === newEmail) return;
    reassignMutation.mutate({ taskId: task.id, newEmail });
  };

  // Capacity edit — only admin/management/manager
  const canEditCapacity = ['admin', 'management', 'manager'].includes(ac.role);

  const capacityMutation = useMutation({
    mutationFn: async ({ email, maxTasks }) => {
      const targetUser = users.find(u => u.email === email);
      if (!targetUser) throw new Error('User not found');
      const res = await base44.functions.invoke('updateUser', { userId: targetUser.id, data: { max_tasks: maxTasks } });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('อัปเดต Capacity สำเร็จ');
    },
    onError: (err) => toast.error('อัปเดตไม่สำเร็จ: ' + err.message),
  });

  const handleTaskSubmit = (data) => {
    if (editingTask) updateMutation.mutate({ id: editingTask.id, data });
  };

  // Unassigned tasks
  const unassigned = activeTasks.filter(t => !t.assigned_to);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Scale className="w-5 h-5" /> Workload Balancer
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">ดู capacity แต่ละคน — ลากงานเพื่อ assign ให้สมดุล</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกแผนก</SelectItem>
              <SelectItem value="management">Management</SelectItem>
              <SelectItem value="accounting">บัญชี</SelectItem>
              <SelectItem value="consulting">ที่ปรึกษา</SelectItem>
              <SelectItem value="audit">Audit</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="it">IT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <WorkloadSummaryBar people={people} />

      {/* Unassigned tasks alert */}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-2">⚠️ งานที่ยังไม่มีคนรับ ({unassigned.length} งาน) — ลากไปวางที่คนที่ต้องการ assign</p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.slice(0, 12).map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('task', JSON.stringify(task))}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded border text-[11px] cursor-grab hover:shadow-sm active:cursor-grabbing"
                title={task.title}
              >
                <span className="truncate max-w-[140px]">{task.title}</span>
                {task.customer_name && <span className="text-muted-foreground truncate max-w-[80px]">· {task.customer_name}</span>}
              </div>
            ))}
            {unassigned.length > 12 && (
              <span className="text-[10px] text-amber-600 self-center">+{unassigned.length - 12} งานอื่น</span>
            )}
          </div>
        </div>
      )}

      {/* Workload grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {people.map(person => (
          <WorkloadCard
            key={person.email}
            person={person}
            onTaskClick={(task) => setEditingTask(task)}
            onReassign={handleReassign}
            canEditCapacity={canEditCapacity}
            onCapacityChange={(email, val) => capacityMutation.mutate({ email, maxTasks: val })}
          />
        ))}
      </div>

      {people.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">ไม่พบพนักงานในแผนกนี้</div>
      )}

      {/* Task edit dialog */}
      <Dialog open={!!editingTask} onOpenChange={(v) => !v && setEditingTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>แก้ไขงาน</DialogTitle></DialogHeader>
          <TaskForm task={editingTask} onSubmit={handleTaskSubmit} isLoading={updateMutation.isPending} permissions={ac} currentUser={currentUser} />
        </DialogContent>
      </Dialog>
    </div>
  );
}