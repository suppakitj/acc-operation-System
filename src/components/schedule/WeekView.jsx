import React from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { TYPE_DOT_COLORS, TYPE_BG_COLORS } from './ScheduleLegend';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7:00 - 19:00

export default function WeekView({ currentMonth, schedules, onSelectDate, selectedDate }) {
  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  };

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-8 border-b">
        <div className="py-2 text-center text-xs text-muted-foreground border-r" />
        {days.map(day => (
          <div key={day.toISOString()} className={`py-2 text-center border-r last:border-r-0 ${isToday(day) ? 'bg-primary/5' : ''}`}>
            <div className="text-[10px] text-muted-foreground">{format(day, 'EEE').toUpperCase()}</div>
            <div className={`text-sm font-medium ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      {/* All-day / schedule rows */}
      <div className="grid grid-cols-8">
        <div className="border-r border-b p-1 text-[10px] text-muted-foreground flex items-start justify-end pr-2 pt-2">All day</div>
        {days.map(day => {
          const list = getForDay(day);
          return (
            <div key={day.toISOString()} className="border-r border-b p-1 min-h-[80px] cursor-pointer hover:bg-muted/20" onClick={() => onSelectDate(day)}>
              {list.map(s => {
                const bg = TYPE_BG_COLORS[s.type] || TYPE_BG_COLORS.other;
                return (
                  <div key={s.id} className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate ${bg}`}>
                    {s.assigned_name || s.title}
                    {s.start_time && <span className="text-muted-foreground ml-1">{s.start_time}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}