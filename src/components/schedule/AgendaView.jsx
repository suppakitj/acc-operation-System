import React from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { TYPE_DOT_COLORS, TYPE_BG_COLORS } from './ScheduleLegend';
import { Clock, MapPin, User } from 'lucide-react';

function resolveNames(emails, users) {
  if (!Array.isArray(emails)) return emails;
  return emails.map(email => {
    const u = users.find(u => u.email === email);
    return u?.initials || u?.nickname || email.split('@')[0];
  });
}

export default function AgendaView({ currentMonth, schedules, onScheduleClick, users = [], holidaysByDate = {} }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const filtered = schedules
    .filter(s => s.date >= format(monthStart, 'yyyy-MM-dd') && s.date <= format(monthEnd, 'yyyy-MM-dd'))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''));

  // Group by date
  const grouped = {};
  filtered.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return <div className="py-12 text-center text-muted-foreground text-sm">No entries this month</div>;
  }

  return (
    <div className="divide-y">
      {dates.map(date => {
        const holiday = holidaysByDate[date];
        return (
        <div key={date} className={`flex gap-4 py-3 ${holiday ? 'bg-red-50/50' : ''}`}>
          <div className="w-20 shrink-0 text-right">
            <div className="text-sm font-semibold">{format(parseISO(date), 'MMM d')}</div>
            <div className="text-[10px] text-muted-foreground">{format(parseISO(date), 'EEE')}</div>
            {holiday && (
              <div className="text-[9px] text-red-600 font-medium mt-0.5">{holiday.name_th}</div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            {grouped[date].map(s => {
              const bg = TYPE_BG_COLORS[s.type] || TYPE_BG_COLORS.other;
              const dot = TYPE_DOT_COLORS[s.type] || TYPE_DOT_COLORS.other;
              return (
                <div key={s.id} onClick={() => onScheduleClick?.(s)} className={`rounded-lg p-3 ${bg} hover:ring-1 hover:ring-primary/40 cursor-pointer`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-sm font-medium">{s.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {s.start_time && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.start_time}{s.end_time ? ` - ${s.end_time}` : ''}</span>
                    )}
                    {s.assigned_name && (Array.isArray(s.assigned_name) ? s.assigned_name.length > 0 : true) && (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{Array.isArray(s.assigned_to) ? resolveNames(s.assigned_to, users).join(', ') : s.assigned_name}</span>
                    )}
                    {s.customer_name && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.customer_name}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}