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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import StatusBadge from '../components/shared/StatusBadge';

const TYPE_COLORS = {
  meeting: 'bg-blue-100 text-blue-700',
  deadline: 'bg-red-100 text-red-700',
  appointment: 'bg-green-100 text-green-700',
  reminder: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
};

const TYPE_LABELS = {
  meeting: 'ประชุม', deadline: 'กำหนดส่ง', appointment: 'นัดหมาย', reminder: 'เตือนความจำ', other: 'อื่นๆ'
};

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.Schedule.list('-date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); setShowForm(false); },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getSchedulesForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  };

  const daySchedules = selectedDate ? getSchedulesForDay(selectedDate) : [];

  const openNewForm = (date) => {
    setForm({ title: '', description: '', date: format(date || new Date(), 'yyyy-MM-dd'), start_time: '', end_time: '', type: 'meeting', status: 'scheduled' });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ตารางงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">Monthly Schedule</p>
        </div>
        <Button onClick={() => openNewForm(selectedDate)} className="gap-2">
          <Plus className="w-4 h-4" /> เพิ่มตารางงาน
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <CardTitle className="text-lg">{format(currentMonth, 'MMMM yyyy', { locale: th })}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
              <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {paddingDays.map((_, i) => <div key={`pad-${i}`} className="bg-card p-2 min-h-[80px]" />)}
            {days.map(day => {
              const dayScheduleList = getSchedulesForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <div key={day.toISOString()} onClick={() => setSelectedDate(day)}
                  className={`bg-card p-2 min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''} ${isSelected ? 'bg-primary/5' : ''}`}>
                  <span className={`text-sm ${isToday(day) ? 'font-bold text-primary' : ''}`}>{format(day, 'd')}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayScheduleList.slice(0, 2).map(s => (
                      <div key={s.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${TYPE_COLORS[s.type] || TYPE_COLORS.other}`}>
                        {s.title}
                      </div>
                    ))}
                    {dayScheduleList.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{dayScheduleList.length - 2} เพิ่มเติม</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{format(selectedDate, 'EEEE d MMMM yyyy', { locale: th })}</CardTitle>
          </CardHeader>
          <CardContent>
            {daySchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">ไม่มีตารางงานวันนี้</p>
            ) : (
              <div className="space-y-3">
                {daySchedules.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.start_time && `${s.start_time}`}{s.end_time && ` - ${s.end_time}`}
                        {s.customer_name && ` · ${s.customer_name}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className={TYPE_COLORS[s.type]}>{TYPE_LABELS[s.type]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Schedule Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>เพิ่มตารางงาน</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>หัวข้อ *</Label><Input value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>วันที่</Label><Input type="date" value={form.date || ''} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>เวลาเริ่ม</Label><Input type="time" value={form.start_time || ''} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>เวลาสิ้นสุด</Label><Input type="time" value={form.end_time || ''} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>ประเภท</Label>
              <Select value={form.type || 'meeting'} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>รายละเอียด</Label><Textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}