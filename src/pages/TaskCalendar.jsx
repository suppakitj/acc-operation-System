import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, GripVertical, Calendar, LayoutGrid, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TaskCalendarWeekView from '../components/task-calendar/TaskCalendarWeekView';
import TaskCalendarDayView from '../components/task-calendar/TaskCalendarDayView';
import TaskDetailPopup from '../components/task-calendar/TaskDetailPopup';
import DayTaskListPopup from '../components/task-calendar/DayTaskListPopup';

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 border-red-400 text-red-700',
  high: 'bg-orange-100 border-orange-400 text-orange-700',
  medium: 'bg-blue-100 border-blue-400 text-blue-700',
  low: 'bg-gray-100 border-gray-400 text-gray-600',
};

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังทำ',
  review: 'รอตรวจสอบ',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

const SERVICE_LABELS = {
  accounting: 'บัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ภาษี',
  audit: 'ตรวจสอบ',
  peak_licensing: 'Peak',
};

export default function TaskCalendar() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [filters, setFilters] = useState({ search: '', status: 'active', service: 'all' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [dayListDate, setDayListDate] = useState(null);
  const [dayListTasks, setDayListTasks] = useState([]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
    staleTime: 60_000,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.HolidayMaster.filter({ status: 'active' }),
    staleTime: 5 * 60_000, // holidays rarely change
  });

  // Build holiday lookup by date
  const holidaysByDate = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      if (h.date) map[h.date] = h;
    });
    return map;
  }, [holidays]);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('อัปเดต Due Date เรียบร้อย');
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาด');
    },
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!task.title?.toLowerCase().includes(q) && 
            !task.customer_name?.toLowerCase().includes(q)) return false;
      }
      if (filters.status === 'active' && ['completed', 'cancelled'].includes(task.status)) return false;
      if (filters.status !== 'all' && filters.status !== 'active' && task.status !== filters.status) return false;
      if (filters.service !== 'all' && task.service_type !== filters.service) return false;
      return true;
    });
  }, [tasks, filters]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Group tasks by due_date
  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach(task => {
      if (!task.due_date) return;
      const key = task.due_date.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    // Sort tasks within each date by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
    });
    return map;
  }, [filteredTasks]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newDueDate = destination.droppableId;
    const oldDueDate = source.droppableId;
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Optimistic update
    queryClient.setQueryData(['tasks'], (old) =>
      old.map(t => t.id === draggableId ? { ...t, due_date: newDueDate } : t)
    );

    // Build history entry before updating so automation dedup can work
    const currentUser = await base44.auth.me();
    const currentHistory = Array.isArray(task.due_date_change_history) ? task.due_date_change_history : [];
    const currentCount = task.due_date_change_count || 0;
    const entry = {
      changed_at: new Date().toISOString(),
      changed_by: currentUser?.email || 'unknown',
      changed_by_name: currentUser?.full_name || 'unknown',
      changed_by_role: currentUser?.role || '',
      old_due_date: oldDueDate,
      new_due_date: newDueDate,
      reason: 'ลากเปลี่ยนจาก Task Calendar',
    };

    updateTaskMutation.mutate({
      id: draggableId,
      data: {
        due_date: newDueDate,
        due_date_change_count: currentCount + 1,
        due_date_change_history: [...currentHistory, entry],
      },
    });
  };

  const navigate = (dir) => {
    if (view === 'month') {
      setCurrentMonth(dir === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
    } else if (view === 'week') {
      setCurrentMonth(dir === 'next' ? addWeeks(currentMonth, 1) : subWeeks(currentMonth, 1));
    } else {
      setCurrentMonth(dir === 'next' ? addDays(currentMonth, 1) : addDays(currentMonth, -1));
    }
  };

  const getHeaderLabel = () => {
    if (view === 'month') return format(currentMonth, 'MMMM yyyy', { locale: th });
    if (view === 'week') {
      const ws = startOfWeek(currentMonth, { weekStartsOn: 0 });
      const we = endOfWeek(currentMonth, { weekStartsOn: 0 });
      return `${format(ws, 'd MMM', { locale: th })} - ${format(we, 'd MMM yyyy', { locale: th })}`;
    }
    return format(currentMonth, 'EEEE d MMMM yyyy', { locale: th });
  };

  const viewButtons = [
    { key: 'month', icon: Calendar, label: 'Month' },
    { key: 'week', icon: LayoutGrid, label: 'Week' },
    { key: 'day', icon: CalendarDays, label: 'Day' },
  ];

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Task Calendar</h1>
            <p className="text-sm text-muted-foreground">ลากวางงานเพื่อเปลี่ยน Due Date</p>
          </div>
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
            {viewButtons.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  view === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {getHeaderLabel()}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navigate('next')}>
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            วันนี้
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหางาน..."
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v }))}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="active">งานที่ยังไม่เสร็จ</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="in_progress">กำลังทำ</SelectItem>
                <SelectItem value="review">รอตรวจสอบ</SelectItem>
                <SelectItem value="completed">เสร็จแล้ว</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.service} onValueChange={v => setFilters(p => ({ ...p, service: v }))}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบริการ</SelectItem>
                {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredTasks.length} งาน
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          {view === 'month' && (
            <DragDropContext onDragEnd={handleDragEnd}>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b">
                {dayNames.map((name, i) => (
                  <div key={i} className={cn(
                    "py-2 text-center text-sm font-medium border-r last:border-r-0",
                    i === 0 && "text-red-500",
                    i === 6 && "text-blue-500"
                  )}>
                    {name}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasksByDate[dateKey] || [];
                  const holiday = holidaysByDate[dateKey];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isCurrentDay = isToday(day);

                  return (
                   <Droppable key={dateKey} droppableId={dateKey}>
                     {(provided, snapshot) => (
                       <div
                         ref={provided.innerRef}
                         {...provided.droppableProps}
                         className={cn(
                           "min-h-[120px] border-r border-b last:border-r-0 p-1 transition-colors",
                           !isCurrentMonth && "bg-muted/30",
                           snapshot.isDraggingOver && "bg-primary/10",
                           holiday && "bg-red-50/70",
                           !holiday && idx % 7 === 0 && "bg-red-50/50",
                           !holiday && idx % 7 === 6 && "bg-blue-50/50"
                         )}
                       >
                         <div className="flex items-center gap-1 mb-1">
                           <div className={cn(
                             "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                             isCurrentDay && "bg-primary text-primary-foreground",
                             !isCurrentMonth && "text-muted-foreground"
                           )}>
                             {format(day, 'd')}
                           </div>
                           {holiday && (
                             <span className="text-[9px] text-red-600 font-medium truncate" title={holiday.name_th}>
                               {holiday.name_th}
                             </span>
                           )}
                         </div>

                          <div className="space-y-1">
                            {dayTasks.slice(0, 4).map((task, taskIdx) => (
                              <Draggable key={task.id} draggableId={task.id} index={taskIdx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "text-[10px] px-1.5 py-1 rounded border-l-2 truncate cursor-grab active:cursor-grabbing transition-shadow",
                                      PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium,
                                      snapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
                                    )}
                                    title={`${task.title}\n${task.customer_name || ''}\n${STATUS_LABELS[task.status] || task.status}`}
                                    onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                  >
                                    <span className="font-medium">{task.title}</span>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {dayTasks.length > 4 && (
                              <div
                                className="text-[10px] text-primary font-medium text-center cursor-pointer hover:underline"
                                onClick={() => { setDayListDate(dateKey); setDayListTasks(dayTasks); }}
                              >
                                +{dayTasks.length - 4} งาน
                              </div>
                            )}
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </DragDropContext>
          )}
          {view === 'week' && (
            <TaskCalendarWeekView currentDate={currentMonth} tasksByDate={tasksByDate} holidaysByDate={holidaysByDate} onDragEnd={handleDragEnd} />
          )}
          {view === 'day' && (
            <TaskCalendarDayView currentDate={currentMonth} tasksByDate={tasksByDate} holidaysByDate={holidaysByDate} onDragEnd={handleDragEnd} />
          )}
        </CardContent>
      </Card>

      {/* Task Detail Popup */}
      <TaskDetailPopup task={selectedTask} open={!!selectedTask} onOpenChange={(v) => { if (!v) setSelectedTask(null); }} />

      {/* Day Task List Popup */}
      <DayTaskListPopup
        date={dayListDate}
        tasks={dayListTasks}
        open={!!dayListDate}
        onOpenChange={(v) => { if (!v) setDayListDate(null); }}
        onTaskClick={(task) => { setDayListDate(null); setSelectedTask(task); }}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">ความสำคัญ:</span>
        {Object.entries({ urgent: 'เร่งด่วน', high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded border-l-2", PRIORITY_COLORS[k])} />
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}