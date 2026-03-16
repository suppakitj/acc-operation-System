import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { th, enUS } from 'date-fns/locale';
import { useLanguage } from '../components/LanguageContext';

const TYPE_COLORS = { meeting: 'bg-blue-100 text-blue-700', deadline: 'bg-red-100 text-red-700', appointment: 'bg-green-100 text-green-700', reminder: 'bg-yellow-100 text-yellow-700', other: 'bg-gray-100 text-gray-700' };

export default function Schedule() {
  const { t, lang } = useLanguage();
  const locale = lang === 'th' ? th : enUS;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: schedules = [] } = useQuery({ queryKey: ['schedules'], queryFn: () => base44.entities.Schedule.list('-date', 200) });
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); setShowForm(false); },
  });

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(startDay).fill(null);
  const getForDay = (date) => schedules.filter(s => s.date === format(date, 'yyyy-MM-dd'));
  const daySchedules = selectedDate ? getForDay(selectedDate) : [];

  const typeLabels = { meeting: t('type_meeting'), deadline: t('type_deadline'), appointment: t('type_appointment'), reminder: t('type_reminder'), other: t('type_other') };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('schedule_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('schedule_subtitle')}</p>
        </div>
        <Button onClick={() => { setForm({ title: '', description: '', date: format(selectedDate || new Date(), 'yyyy-MM-dd'), start_time: '', end_time: '', type: 'meeting', status: 'scheduled' }); setShowForm(true); }} className="gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> {t('add_schedule')}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
          <CardTitle className="text-base md:text-lg">{format(currentMonth, 'MMMM yyyy', { locale })}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {t('day_names').map(d => <div key={d} className="bg-muted p-1.5 md:p-2 text-center text-[10px] md:text-xs font-medium text-muted-foreground">{d}</div>)}
            {paddingDays.map((_, i) => <div key={`p-${i}`} className="bg-card p-1 md:p-2 min-h-[50px] md:min-h-[80px]" />)}
            {days.map(day => {
              const list = getForDay(day);
              const sel = selectedDate && isSameDay(day, selectedDate);
              return (
                <div key={day.toISOString()} onClick={() => setSelectedDate(day)}
                  className={`bg-card p-1 md:p-2 min-h-[50px] md:min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''} ${sel ? 'bg-primary/5' : ''}`}>
                  <span className={`text-xs md:text-sm ${isToday(day) ? 'font-bold text-primary' : ''}`}>{format(day, 'd')}</span>
                  <div className="mt-0.5 space-y-0.5 hidden sm:block">
                    {list.slice(0, 2).map(s => <div key={s.id} className={`text-[9px] md:text-[10px] px-1 py-0.5 rounded truncate ${TYPE_COLORS[s.type] || TYPE_COLORS.other}`}>{s.title}</div>)}
                    {list.length > 2 && <div className="text-[9px] text-muted-foreground">+{list.length - 2}</div>}
                  </div>
                  {list.length > 0 && <div className="sm:hidden mt-1 w-1.5 h-1.5 rounded-full bg-primary mx-auto" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{format(selectedDate, 'EEEE d MMMM yyyy', { locale })}</CardTitle></CardHeader>
          <CardContent>
            {daySchedules.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">{t('no_schedule')}</p> : (
              <div className="space-y-2">{daySchedules.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.start_time && `${s.start_time}`}{s.end_time && ` - ${s.end_time}`}{s.customer_name && ` · ${s.customer_name}`}</p>
                  </div>
                  <Badge variant="secondary" className={TYPE_COLORS[s.type]}>{typeLabels[s.type]}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('add_schedule')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t('title')} *</Label><Input value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{t('date')}</Label><Input type="date" value={form.date || ''} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{t('time_start')}</Label><Input type="time" value={form.start_time || ''} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{t('time_end')}</Label><Input type="time" value={form.end_time || ''} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>{t('type')}</Label>
              <Select value={form.type || 'meeting'} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('description')}</Label><Textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending} className="w-full">
              {createMutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}