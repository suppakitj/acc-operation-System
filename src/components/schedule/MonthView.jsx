import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, isSameMonth } from 'date-fns';
import { TYPE_DOT_COLORS } from './ScheduleLegend';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function MonthView({ currentMonth, schedules, onSelectDate, selectedDate, onScheduleClick }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  // Pad end to fill last row
  const totalCells = paddingDays.length + days.length;
  const endPadding = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const endPaddingDays = Array(endPadding).fill(null);

  const getForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  };

  const MAX_DISPLAY = 4;

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
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
          const list = getForDay(day);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const isSat = day.getDay() === 6;
          const isSun = day.getDay() === 0;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`min-h-[100px] border-r border-b p-1.5 cursor-pointer transition-colors hover:bg-muted/30 ${selected ? 'bg-primary/5' : ''} ${today ? 'bg-blue-50/50' : ''}`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className={`text-sm ${today ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center font-bold' : ''} ${isSat ? 'text-blue-600' : ''} ${isSun ? 'text-red-500' : ''}`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-0.5">
                {list.slice(0, MAX_DISPLAY).map(s => {
                  const dotColor = TYPE_DOT_COLORS[s.type] || TYPE_DOT_COLORS.other;
                  const bgColor = s.type === 'client_visit' ? 'bg-blue-50' :
                    s.type === 'office' ? 'bg-green-50' :
                    s.type === 'leave' ? 'bg-red-50' :
                    s.type === 'meeting' ? 'bg-purple-50' :
                    s.type === 'fieldwork' ? 'bg-orange-50' :
                    s.type === 'wfh' ? 'bg-teal-50' : 'bg-gray-50';
                  return (
                    <div key={s.id}
                      onClick={(e) => { e.stopPropagation(); onScheduleClick?.(s); }}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate ${bgColor} hover:ring-1 hover:ring-primary/40 cursor-pointer`}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                      <span className="truncate">{s.assigned_name || s.title}</span>
                    </div>
                  );
                })}
                {list.length > MAX_DISPLAY && (
                  <div className="text-[10px] text-muted-foreground px-1.5">+{list.length - MAX_DISPLAY} more</div>
                )}
              </div>
            </div>
          );
        })}
        {endPaddingDays.map((_, i) => (
          <div key={`pe-${i}`} className="min-h-[100px] border-r border-b bg-muted/20 last:border-r-0" />
        ))}
      </div>
    </div>
  );
}