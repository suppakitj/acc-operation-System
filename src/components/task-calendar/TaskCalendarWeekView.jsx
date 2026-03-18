import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 border-red-400 text-red-700',
  high: 'bg-orange-100 border-orange-400 text-orange-700',
  medium: 'bg-blue-100 border-blue-400 text-blue-700',
  low: 'bg-gray-100 border-gray-400 text-gray-600',
};

const STATUS_LABELS = {
  pending: 'รอดำเนินการ', in_progress: 'กำลังทำ', review: 'รอตรวจสอบ',
  completed: 'เสร็จแล้ว', cancelled: 'ยกเลิก',
};

export default function TaskCalendarWeekView({ currentDate, tasksByDate, onDragEnd }) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day, i) => (
          <div key={i} className={cn(
            "py-2 text-center border-r last:border-r-0",
            i === 0 && "text-red-500", i === 6 && "text-blue-500"
          )}>
            <div className="text-[10px] text-muted-foreground">{format(day, 'EEE', { locale: th })}</div>
            <div className={cn(
              "text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full",
              isToday(day) && "bg-primary text-primary-foreground"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weekDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] || [];
          return (
            <Droppable key={dateKey} droppableId={dateKey}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "min-h-[300px] border-r border-b p-1.5 transition-colors",
                    snapshot.isDraggingOver && "bg-primary/10",
                    idx === 0 && "bg-red-50/50", idx === 6 && "bg-blue-50/50"
                  )}
                >
                  <div className="space-y-1">
                    {dayTasks.map((task, taskIdx) => (
                      <Draggable key={task.id} draggableId={task.id} index={taskIdx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "text-[11px] px-2 py-1.5 rounded border-l-2 cursor-grab active:cursor-grabbing transition-shadow",
                              PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium,
                              snapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
                            )}
                            title={`${task.title}\n${task.customer_name || ''}\n${STATUS_LABELS[task.status] || task.status}`}
                          >
                            <p className="font-medium truncate">{task.title}</p>
                            {task.customer_name && <p className="text-[10px] opacity-70 truncate">{task.customer_name}</p>}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}