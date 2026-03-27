import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { parseUTCDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

function formatDuration(mins) {
  if (!mins || mins < 1) return '< 1 นาที';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m > 0 ? `${m} น.` : ''}`;
}

function LiveTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="font-mono text-sm font-bold text-red-600">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function TaskTimeTracker({ task, currentUser }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [showLog, setShowLog] = useState(false);

  // Manual log state
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', task?.id],
    queryFn: () => base44.entities.TimeEntry.filter({ task_id: task.id }, '-created_date', 100),
    enabled: !!task?.id,
  });

  const runningEntry = entries.find(e => e.is_running && e.user_email === currentUser?.email);
  const completedEntries = entries.filter(e => !e.is_running && e.duration_minutes);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + e.duration_minutes, 0);

  const createEntry = (data) => base44.entities.TimeEntry.create({
    task_id: task.id,
    task_title: task.title,
    customer_id: task.customer_id || '',
    customer_name: task.customer_name || '',
    service_type: task.service_type || '',
    department: task.department || '',
    user_email: currentUser.email,
    user_name: currentUser.full_name || currentUser.email,
    ...data,
  });

  const startMutation = useMutation({
    mutationFn: () => createEntry({ start_time: new Date().toISOString(), is_running: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', task.id] });
      toast.success('เริ่มจับเวลา');
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => {
      const endTime = new Date();
      const startTime = new Date(runningEntry.start_time);
      const durationMinutes = Math.max(0, (endTime - startTime) / 60000);
      return base44.entities.TimeEntry.update(runningEntry.id, {
        end_time: endTime.toISOString(),
        duration_minutes: Math.round(durationMinutes * 100) / 100,
        is_running: false,
        description: note || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', task.id] });
      setNote('');
      toast.success('หยุดจับเวลา');
    },
  });

  // Manual time entry
  const manualMutation = useMutation({
    mutationFn: () => {
      const h = parseFloat(manualHours) || 0;
      const m = parseFloat(manualMinutes) || 0;
      const totalMins = h * 60 + m;
      if (totalMins <= 0) throw new Error('กรุณาใส่เวลา');
      const now = new Date();
      const start = new Date(now.getTime() - totalMins * 60000);
      return createEntry({
        start_time: start.toISOString(),
        end_time: now.toISOString(),
        duration_minutes: Math.round(totalMins * 100) / 100,
        is_running: false,
        description: manualNote || 'บันทึกเวลาย้อนหลัง',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', task.id] });
      setManualHours('');
      setManualMinutes('');
      setManualNote('');
      setShowManualForm(false);
      toast.success('บันทึกเวลาแล้ว');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeEntries', task.id] }),
  });

  if (!task?.id) return null;

  return (
    <div className="space-y-2.5 border-t pt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Time Tracking</span>
          <Badge variant="secondary" className="text-[10px]">
            รวม {formatDuration(totalMinutes)}
          </Badge>
        </div>
        {completedEntries.length > 0 && (
          <button onClick={() => setShowLog(!showLog)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            {completedEntries.length} รายการ {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Quick actions — primary way: manual log, secondary: timer */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowManualForm(!showManualForm)} className="gap-1.5 text-xs h-8">
          <Plus className="w-3 h-3" /> บันทึกเวลา
        </Button>
        {runningEntry ? (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <LiveTimer startTime={runningEntry.start_time} />
            </div>
            <Input
              placeholder="บันทึกสิ่งที่ทำ..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="h-8 w-32 text-[11px]"
            />
            <Button size="sm" variant="destructive" onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending} className="gap-1 h-8 text-xs">
              <Square className="w-3 h-3" /> หยุด
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="gap-1.5 text-xs h-8 text-muted-foreground">
            <Play className="w-3 h-3" /> จับเวลา
          </Button>
        )}
      </div>

      {/* Manual time entry form */}
      {showManualForm && (
        <div className="flex flex-wrap items-end gap-2 p-2.5 bg-muted/30 rounded-lg border">
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground">ชั่วโมง</label>
            <Input
              type="number" min="0" max="24" step="0.5" placeholder="0"
              value={manualHours} onChange={e => setManualHours(e.target.value)}
              className="h-8 w-16 text-xs"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground">นาที</label>
            <Input
              type="number" min="0" max="59" step="5" placeholder="0"
              value={manualMinutes} onChange={e => setManualMinutes(e.target.value)}
              className="h-8 w-16 text-xs"
            />
          </div>
          <div className="space-y-0.5 flex-1 min-w-[120px]">
            <label className="text-[10px] text-muted-foreground">รายละเอียด</label>
            <Input
              placeholder="ทำอะไร..."
              value={manualNote} onChange={e => setManualNote(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <Button size="sm" onClick={() => manualMutation.mutate()} disabled={manualMutation.isPending || (!manualHours && !manualMinutes)} className="h-8 text-xs gap-1">
            <Plus className="w-3 h-3" /> บันทึก
          </Button>
        </div>
      )}

      {/* Time entries log (collapsible) */}
      {showLog && completedEntries.length > 0 && (
        <div className="space-y-1 max-h-[180px] overflow-y-auto">
          {completedEntries.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 text-xs py-1.5 px-2 bg-muted/20 rounded group">
              <span className="text-muted-foreground shrink-0 w-[62px]">
                {entry.created_date ? format(parseUTCDate(entry.created_date), 'dd MMM HH:mm') : '-'}
              </span>
              <Badge variant="outline" className="text-[9px] shrink-0">
                {formatDuration(entry.duration_minutes)}
              </Badge>
              <span className="truncate flex-1 text-muted-foreground">{entry.description || '-'}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {entry.user_name?.split(' ')[0] || entry.user_email?.split('@')[0]}
              </span>
              <Button
                variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => deleteMutation.mutate(entry.id)}
              >
                <Trash2 className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}