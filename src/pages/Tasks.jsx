import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, CheckCircle2 } from 'lucide-react';
import StatusBadge from '../components/shared/StatusBadge';
import ServiceBadge from '../components/shared/ServiceBadge';
import TaskForm from '../components/tasks/TaskForm';
import { format } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';

export default function Tasks() {
  const { t } = useLanguage();
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

  const filtered = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (search && !task.title?.toLowerCase().includes(search.toLowerCase()) && !task.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = (data) => {
    if (editingTask) updateMutation.mutate({ id: editingTask.id, data });
    else createMutation.mutate(data);
  };

  const PRIORITY_COLORS = { low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-600', high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600' };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('tasks_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('tasks_subtitle')}</p>
        </div>
        <Button onClick={() => { setEditingTask(null); setShowForm(true); }} className="gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> {t('create_task')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('search_tasks')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder={t('status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="pending">{t('status_pending')}</SelectItem>
            <SelectItem value="in_progress">{t('status_in_progress')}</SelectItem>
            <SelectItem value="review">{t('status_review')}</SelectItem>
            <SelectItem value="completed">{t('status_completed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('no_data')}</div>
        ) : (
          filtered.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
              onClick={() => { setEditingTask(task); setShowForm(true); }}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start gap-3">
                  <button className="shrink-0 mt-0.5" onClick={(e) => {
                    e.stopPropagation();
                    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                    updateMutation.mutate({ id: task.id, data: { ...task, status: newStatus, completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null } });
                  }}>
                    <CheckCircle2 className={`w-5 h-5 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-muted-foreground/25 hover:text-green-400'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                      <StatusBadge status={task.status} />
                      {task.priority && <Badge variant="secondary" className={PRIORITY_COLORS[task.priority]}>{t(`priority_${task.priority}`)}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {task.customer_name && <span>{task.customer_name}</span>}
                      {task.assigned_name && <span className="hidden sm:inline">· {task.assigned_name}</span>}
                      {task.due_date && <span>· {format(new Date(task.due_date), 'dd/MM/yyyy')}</span>}
                      {task.service_type && <span className="hidden md:inline"><ServiceBadge service={task.service_type} /></span>}
                    </div>
                  </div>
                  {task.checklist?.length > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block bg-muted px-2 py-1 rounded-full">
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
          <DialogHeader><DialogTitle>{editingTask ? t('edit_task') : t('create_task')}</DialogTitle></DialogHeader>
          <TaskForm task={editingTask} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}