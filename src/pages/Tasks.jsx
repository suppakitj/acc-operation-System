import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useUserList } from '@/hooks/useUserList';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Download } from 'lucide-react';
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setEditingTask(null); },
  });

  const handleSubmit = (data) => {
    // Auto set completed_date when status changes to completed
    if (data.status === 'completed' && !data.completed_date) {
      data.completed_date = format(new Date(), 'yyyy-MM-dd');
    }
    // Clear completed_date if status is no longer completed
    if (data.status !== 'completed') {
      data.completed_date = null;
    }
    if (editingTask) updateMutation.mutate({ id: editingTask.id, data });
    else createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    let result = tasks.filter(t => t.status !== 'cancelled');
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
          />
          <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Task Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTask ? t('edit_task') : t('create_task')}</DialogTitle></DialogHeader>
          <TaskForm task={editingTask} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} permissions={ac} />
        </DialogContent>
      </Dialog>
    </div>
  );
}