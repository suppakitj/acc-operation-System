import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, CheckCircle2 } from 'lucide-react';
import StatusBadge from '../components/shared/StatusBadge';
import ServiceBadge from '../components/shared/ServiceBadge';
import TaskForm from '../components/tasks/TaskForm';
import { format } from 'date-fns';

const PRIORITY_LABELS = { low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง', urgent: 'เร่งด่วน' };
const PRIORITY_COLORS = { low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-600', high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600' };

export default function Tasks() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setEditingTask(null); },
  });

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase()) && !t.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = (data) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">Task Management</p>
        </div>
        <Button onClick={() => { setEditingTask(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> สร้างงานใหม่
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหางาน..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="pending">รอดำเนินการ</SelectItem>
            <SelectItem value="in_progress">กำลังทำ</SelectItem>
            <SelectItem value="review">รอตรวจสอบ</SelectItem>
            <SelectItem value="completed">เสร็จแล้ว</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">ไม่พบข้อมูล</div>
        ) : (
          filtered.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setEditingTask(task); setShowForm(true); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <button
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                      updateMutation.mutate({ id: task.id, data: { ...task, status: newStatus, completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null } });
                    }}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${task.status === 'completed' ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                      <StatusBadge status={task.status} />
                      {task.priority && <Badge variant="secondary" className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.customer_name && <span>{task.customer_name}</span>}
                      {task.assigned_name && <span>· {task.assigned_name}</span>}
                      {task.due_date && <span>· กำหนด {format(new Date(task.due_date), 'dd/MM/yyyy')}</span>}
                      {task.service_type && <ServiceBadge service={task.service_type} />}
                    </div>
                  </div>
                  {task.checklist?.length > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {task.checklist.filter(c => c.checked).length}/{task.checklist.length}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</DialogTitle>
          </DialogHeader>
          <TaskForm task={editingTask} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}