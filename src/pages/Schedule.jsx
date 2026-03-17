import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '../components/ui/SearchableSelect';
import { Plus, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, addDays, differenceInDays } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';

import ScheduleFilters from '../components/schedule/ScheduleFilters';
import ScheduleLegend from '../components/schedule/ScheduleLegend';
import MonthView from '../components/schedule/MonthView';
import WeekView from '../components/schedule/WeekView';
import AgendaView from '../components/schedule/AgendaView';

const TYPE_LABELS = {
  client_visit: 'Client Visit',
  office: 'Office',
  leave: 'Leave',
  meeting: 'Meeting',
  fieldwork: 'Fieldwork',
  wfh: 'Work from Home',
  other: 'Other',
};

export default function Schedule() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const queryClient = useQueryClient();

  const [view, setView] = useState('month'); // month, week, agenda
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [filters, setFilters] = useState({ search: '', department: 'all', employee: 'all', type: 'all', customer: 'all' });

  const { data: allSchedules = [] } = useQuery({ queryKey: ['schedules'], queryFn: () => base44.entities.Schedule.list('-date', 500) });
  const { data: allCustomers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });
  const customers = allCustomers.filter(c => c.status === 'active');
  const { data: users = [] } = useUserList();

  const baseSchedules = ac.canViewAllSchedules ? allSchedules : ac.filterByDepartment(allSchedules);

  const filteredSchedules = useMemo(() => {
    return baseSchedules.filter(s => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!(s.assigned_name || '').toLowerCase().includes(q) &&
            !(s.customer_name || '').toLowerCase().includes(q) &&
            !(s.title || '').toLowerCase().includes(q)) return false;
      }
      if (filters.department !== 'all' && s.department !== filters.department) return false;
      if (filters.employee !== 'all' && s.assigned_to !== filters.employee) return false;
      if (filters.type !== 'all' && s.type !== filters.type) return false;
      if (filters.customer !== 'all' && s.customer_id !== filters.customer) return false;
      return true;
    });
  }, [baseSchedules, filters]);

  // Count entries visible in current month
  const monthEntries = useMemo(() => {
    const ms = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const me = format(endOfMonth(currentDate), 'yyyy-MM-dd');
    return filteredSchedules.filter(s => s.date >= ms && s.date <= me).length;
  }, [filteredSchedules, currentDate]);

  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    setIsSaving(true);
    const startDate = form.date;
    const endDate = form.date_end || startDate;
    const days = differenceInDays(new Date(endDate), new Date(startDate));

    if (days <= 0) {
      // Single day
      const { date_end, ...data } = form;
      await base44.entities.Schedule.create(data);
    } else {
      // Multiple days - bulk create
      const records = [];
      for (let i = 0; i <= days; i++) {
        const d = format(addDays(new Date(startDate), i), 'yyyy-MM-dd');
        const { date_end, ...rest } = form;
        records.push({ ...rest, date: d });
      }
      await base44.entities.Schedule.bulkCreate(records);
    }
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    setShowForm(false);
    setIsSaving(false);
  };

  const navigate = (dir) => {
    if (view === 'week') {
      setCurrentDate(dir === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const openForm = () => {
    setForm({
      title: '', description: '', date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
      date_end: '',
      start_time: '', end_time: '', type: 'meeting', status: 'scheduled',
      assigned_to: currentUser?.email || '',
      assigned_name: currentUser?.full_name || currentUser?.email || '',
      customer_id: '', customer_name: '', department: '',
    });
    setShowForm(true);
  };

  const handleUserSelect = (email) => {
    const u = users.find(u => u.email === email);
    setForm(p => ({ ...p, assigned_to: email, assigned_name: u?.full_name || email }));
  };

  const handleCustomerSelect = (id) => {
    const c = customers.find(c => c.id === id);
    setForm(p => ({ ...p, customer_id: id, customer_name: c?.company_name || '' }));
  };

  const viewButtons = [
    { key: 'month', icon: Calendar, label: 'Month' },
    { key: 'week', icon: LayoutGrid, label: 'Week' },
    { key: 'agenda', icon: List, label: 'Agenda' },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar: View toggle + Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {viewButtons.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <ScheduleLegend />
      </div>

      {/* Filters */}
      <ScheduleFilters
        filters={filters}
        setFilters={setFilters}
        customers={customers}
        users={users}
        totalEntries={filteredSchedules.length}
      />

      {/* Calendar Card */}
      <Card>
        {/* Navigation header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('prev')}><ChevronLeft className="w-5 h-5" /></Button>
            <h2 className="text-lg font-bold">
              {format(currentDate, view === 'week' ? 'MMM d, yyyy' : 'MMMM yyyy')}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => navigate('next')}><ChevronRight className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="text-primary font-semibold ml-2">
              Today
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{monthEntries} entries</span>
            {ac.canAddSchedule && (
              <Button onClick={openForm} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Add
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {view === 'month' && (
            <MonthView
              currentMonth={currentDate}
              schedules={filteredSchedules}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentMonth={currentDate}
              schedules={filteredSchedules}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
          )}
          {view === 'agenda' && (
            <div className="p-4">
              <AgendaView currentMonth={currentDate} schedules={filteredSchedules} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Schedule Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('add_schedule')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t('title')} *</Label><Input value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>วันเริ่มต้น</Label><Input type="date" value={form.date || ''} onChange={e => setForm(p => ({ ...p, date: e.target.value, date_end: p.date_end && p.date_end < e.target.value ? e.target.value : p.date_end }))} /></div>
              <div className="space-y-1.5"><Label>วันสิ้นสุด</Label><Input type="date" value={form.date_end || ''} min={form.date || ''} onChange={e => setForm(p => ({ ...p, date_end: e.target.value }))} placeholder="เลือกถ้ามากกว่า 1 วัน" /></div>
            </div>
            {form.date && form.date_end && form.date_end > form.date && (
              <p className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                จะสร้าง {differenceInDays(new Date(form.date_end), new Date(form.date)) + 1} รายการ (วันละ 1 รายการ)
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>ประเภท</Label>
                <Select value={form.type || 'meeting'} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{t('time_start')}</Label><Input type="time" value={form.start_time || ''} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>{t('time_end')}</Label><Input type="time" value={form.end_time || ''} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>ผู้รับผิดชอบ</Label>
                <SearchableSelect
                  value={form.assigned_to || 'none'}
                  onValueChange={v => v === 'none' ? setForm(p => ({ ...p, assigned_to: '', assigned_name: '' })) : handleUserSelect(v)}
                  options={[{ value: 'none', label: '-' }, ...users.map(u => ({ value: u.email, label: u.full_name || u.email }))]}
                  placeholder="เลือกผู้รับผิดชอบ"
                  disabled={!ac.canEditAssignee}
                />
              </div>
              <div className="space-y-1.5"><Label>ลูกค้า</Label>
                <SearchableSelect
                  value={form.customer_id || 'none'}
                  onValueChange={v => v === 'none' ? setForm(p => ({ ...p, customer_id: '', customer_name: '' })) : handleCustomerSelect(v)}
                  options={[{ value: 'none', label: '-' }, ...customers.map(c => ({ value: c.id, label: c.company_name }))]}
                  placeholder="เลือกลูกค้า"
                />
              </div>
            </div>
            <div className="space-y-1.5"><Label>{t('description')}</Label><Textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <Button onClick={handleCreate} disabled={!form.title || isSaving} className="w-full">
              {isSaving ? t('saving') : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}