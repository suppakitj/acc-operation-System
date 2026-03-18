import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TYPE_DOT_COLORS } from './ScheduleLegend';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function resolveName(email, users) {
  const u = users.find(u => u.email === email);
  return u?.initials || u?.nickname || email?.split('@')[0] || '';
}

function resolveNames(emails, users) {
  if (!Array.isArray(emails)) return emails ? [resolveName(emails, users)] : [];
  return emails.map(email => resolveName(email, users));
}

const TYPE_BG = {
  client_visit: 'bg-blue-50', office: 'bg-green-50', leave: 'bg-red-50',
  meeting: 'bg-purple-50', fieldwork: 'bg-orange-50', wfh: 'bg-teal-50', other: 'bg-gray-50',
};

const MAX_DISPLAY = 4;

export default function MonthView({ currentMonth, schedules, onSelectDate, selectedDate, onScheduleClick, users = [], holidaysByDate = {}, onDragEnd }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);
  const totalCells = paddingDays.length + days.length;
  const endPadding = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const endPaddingDays = Array(endPadding).fill(null);

  const getForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`py-2 text-center text-xs font-medium border-r last:border-r-0 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'}`}>
              {d}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {paddingDays.map((_, i) => (
            <div key={`ps-${i}`} className="min-h-[100px] border-r border-b bg-muted/20 last:border-r-0" />
          ))}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const list = getForDay(day);
            const holiday = holidaysByDate[dateKey];
            const today = isToday(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const isSat = day.getDay() === 6;
            const isSun = day.getDay() === 0;

            return (
              <Droppable key={dateKey} droppableId={dateKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => onSelectDate(day)}
                    className={`min-h-[100px] border-r border-b p-1.5 cursor-pointer transition-colors hover:bg-muted/30 ${selected ? 'bg-primary/5' : ''} ${snapshot.isDraggingOver ? 'bg-primary/10 ring-1 ring-primary/30' : ''} ${holiday ? 'bg-red-50/70' : today ? 'bg-blue-50/50' : isSun ? 'bg-red-50/40' : isSat ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`text-sm ${today ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center font-bold' : ''} ${isSat ? 'text-blue-600' : ''} ${isSun ? 'text-red-500' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {holiday && (
                        <span className="text-[9px] text-red-600 font-medium truncate" title={holiday.name_th}>
                          {holiday.name_th}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {list.slice(0, MAX_DISPLAY).map((s, idx) => {
                        const dotColor = TYPE_DOT_COLORS[s.type] || TYPE_DOT_COLORS.other;
                        const bgColor = TYPE_BG[s.type] || TYPE_BG.other;
                        return (
                          <Draggable key={s.id} draggableId={s.id} index={idx}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={(e) => { e.stopPropagation(); onScheduleClick?.(s); }}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate ${bgColor} hover:ring-1 hover:ring-primary/40 cursor-grab active:cursor-grabbing ${dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 opacity-90' : ''}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                <span className="truncate">{(s.assigned_to ? resolveNames(s.assigned_to, users).join(', ') : '') || s.title}</span>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {list.length > MAX_DISPLAY && (
                        <div className="text-[10px] text-muted-foreground px-1.5">+{list.length - MAX_DISPLAY} more</div>
                      )}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
          {endPaddingDays.map((_, i) => (
            <div key={`pe-${i}`} className="min-h-[100px] border-r border-b bg-muted/20 last:border-r-0" />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}