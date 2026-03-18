import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, isToday } from 'date-fns';
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

const PRIORITY_LABELS = { urgent: 'เร่งด่วน', high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' };

export default function TaskCalendarDayView({ currentDate, tasksByDate, onDragEnd }) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const dayTasks = tasksByDate[dateKey] || [];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-full",
            isToday(currentDate) && "bg-primary text-primary-foreground"
          )}>
            {format(currentDate, 'd')}
          </div>
          <div>
            <p className="text-lg font-semibold">{format(currentDate, 'EEEE', { locale: th })}</p>
            <p className="text-sm text-muted-foreground">{format(currentDate, 'd MMMM yyyy', { locale: th })}</p>
          </div>
          <span className="ml-auto text-sm text-muted-foreground">{dayTasks.length} งาน</span>
        </div>

        <Droppable droppableId={dateKey}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "min-h-[200px] rounded-lg border border-dashed p-2 transition-colors",
                snapshot.isDraggingOver && "bg-primary/10 border-primary"
              )}
            >
              {dayTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">ไม่มีงานในวันนี้</p>
              ) : (
                <div className="space-y-2">
                  {dayTasks.map((task, taskIdx) => (
                    <Draggable key={task.id} draggableId={task.id} index={taskIdx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 cursor-grab active:cursor-grabbing transition-shadow",
                            PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium,
                            snapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.customer_name && <span className="text-xs text-muted-foreground truncate">{task.customer_name}</span>}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/60">{STATUS_LABELS[task.status] || task.status}</span>
                            </div>
                          </div>
                          <span className="text-[10px] shrink-0">{PRIORITY_LABELS[task.priority] || 'ปานกลาง'}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}