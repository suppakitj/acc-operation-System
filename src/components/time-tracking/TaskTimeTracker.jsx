import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { parseUTCDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

function formatDuration(mins) {
  if (!mins || mins < 1) return '< 1 นาที';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m} นาที`;
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

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', task?.id],
    queryFn: () => base44.entities.TimeEntry.filter({ task_id: task.id }, '-created_date', 100),
    enabled: !!task?.id,
  });

  const runningEntry = entries.find(e => e.is_running && e.user_email === currentUser?.email);

  const totalMinutes = entries
    .filter(e => !e.is_running && e.duration_minutes)
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const startMutation = useMutation({
    mutationFn: () => base44.entities.TimeEntry.create({
      task_id: task.id,
      task_title: task.title,
      customer_id: task.customer_id || '',
      customer_name: task.customer_name || '',
      service_type: task.service_type || '',
      department: task.department || '',
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      start_time: new Date().toISOString(),
      is_running: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', task.id] });
      toast.success('เริ่มจับเวลาแล้ว');
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
      toast.success('หยุดจับเวลาแล้ว');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeEntries', task.id] }),
  });

  if (!task?.id) return null;

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Time Tracking</span>
          {totalMinutes > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              รวม {formatDuration(totalMinutes)}
            </Badge>
          )}
        </div>
      </div>

      {/* Timer controls */}
      <div className="flex items-center gap-2">
        {runningEntry ? (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <LiveTimer startTime={runningEntry.start_time} />
            </div>
            <Input
              placeholder="บันทึกสิ่งที่ทำ..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="flex-1 h-9 text-xs"
            />
            <Button size="sm" variant="destructive" onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending} className="gap-1.5 shrink-0">
              <Square className="w-3 h-3" /> หยุด
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="gap-1.5">
            <Play className="w-3 h-3" /> เริ่มจับเวลา
          </Button>
        )}
      </div>

      {/* Time entries log */}
      {entries.length > 0 && (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {entries.filter(e => !e.is_running).map(entry => (
            <div key={entry.id} className="flex items-center gap-2 text-xs py-1.5 px-2 bg-muted/30 rounded group">
              <span className="text-muted-foreground shrink-0 w-[70px]">
                {entry.start_time ? format(parseUTCDate(entry.created_date), 'dd MMM HH:mm') : '-'}
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