import React from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TYPE_BG_COLORS } from './ScheduleLegend';

function resolveName(email, users) {
  const u = users.find(u => u.email === email);
  return u?.initials || u?.nickname || email?.split('@')[0] || '';
}

function resolveNames(emails, users) {
  if (!Array.isArray(emails)) return emails ? [resolveName(emails, users)] : [];
  return emails.map(email => resolveName(email, users));
}

export default function WeekView({ currentMonth, schedules, onSelectDate, selectedDate, onScheduleClick, users = [], holidaysByDate = {}, onDragEnd }) {
  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div>
        {/* Header */}
        <div className="grid grid-cols-8 border-b">
          <div className="py-2 text-center text-xs text-muted-foreground border-r" />
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const holiday = holidaysByDate[dateKey];
            const isSun = day.getDay() === 0;
            const isSat = day.getDay() === 6;
            return (
              <div key={day.toISOString()} className={`py-2 text-center border-r last:border-r-0 ${holiday ? 'bg-red-50/70' : isToday(day) ? 'bg-primary/5' : isSun ? 'bg-red-50/40' : isSat ? 'bg-blue-50/40' : ''}`}>
                <div className={`text-[10px] ${isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-muted-foreground'}`}>{format(day, 'EEE').toUpperCase()}</div>
                <div className={`text-sm font-medium ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
                  {format(day, 'd')}
                </div>
                {holiday && (
                  <div className="text-[8px] text-red-600 font-medium truncate px-1" title={holiday.name_th}>
                    {holiday.name_th}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* All-day / schedule rows */}
        <div className="grid grid-cols-8">
          <div className="border-r border-b p-1 text-[10px] text-muted-foreground flex items-start justify-end pr-2 pt-2">All day</div>
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const list = getForDay(day);
            const wHoliday = holidaysByDate[dateKey];
            const wIsSun = day.getDay() === 0;
            const wIsSat = day.getDay() === 6;
            return (
              <Droppable key={dateKey} droppableId={dateKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => onSelectDate(day)}
                    className={`border-r border-b p-1 min-h-[80px] cursor-pointer hover:bg-muted/20 transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10 ring-1 ring-primary/30' : ''} ${wHoliday ? 'bg-red-50/50' : wIsSun ? 'bg-red-50/40' : wIsSat ? 'bg-blue-50/40' : ''}`}
                  >
                    {list.map((s, idx) => {
                      const bg = TYPE_BG_COLORS[s.type] || TYPE_BG_COLORS.other;
                      return (
                        <Draggable key={s.id} draggableId={s.id} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={(e) => { e.stopPropagation(); onScheduleClick?.(s); }}
                              className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate ${bg} hover:ring-1 hover:ring-primary/40 cursor-grab active:cursor-grabbing ${dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 opacity-90' : ''}`}
                            >
                              {(s.assigned_to ? resolveNames(s.assigned_to, users).join(', ') : '') || s.title}
                              {s.start_time && <span className="text-muted-foreground ml-1">{s.start_time}</span>}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}