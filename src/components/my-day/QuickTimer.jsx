import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

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
    <span className="font-mono text-lg font-bold text-red-600">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function QuickTimer({ currentUser, activeTasks, runningEntry }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const startTimer = useMutation({
    mutationFn: (task) => base44.entities.TimeEntry.create({
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
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      toast.success('เริ่มจับเวลาแล้ว');
    },
  });

  const stopTimer = useMutation({
    mutationFn: () => {
      const now = new Date();
      const start = new Date(runningEntry.start_time);
      const duration = Math.round((now - start) / 60000);
      return base44.entities.TimeEntry.update(runningEntry.id, {
        end_time: now.toISOString(),
        duration_minutes: duration,
        is_running: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      toast.success('หยุดจับเวลาแล้ว');
    },
  });

  const handleStart = () => {
    const task = activeTasks.find(t => t.id === selectedTaskId);
    if (task) startTimer.mutate(task);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Timer className="w-4 h-4" /> {t('my_day_timer')}
      </p>

      {runningEntry ? (
        <Card className="shadow-sm border-2 border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">กำลังจับเวลา</p>
                <p className="font-medium text-sm truncate mt-0.5">{runningEntry.task_title}</p>
                <div className="mt-2">
                  <LiveTimer startTime={runningEntry.start_time} />
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => stopTimer.mutate()}
                disabled={stopTimer.isPending}
              >
                <Square className="w-3.5 h-3.5" /> {t('my_day_stop_timer')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('my_day_select_task')} />
                </SelectTrigger>
                <SelectContent>
                  {activeTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title} {task.customer_name ? `— ${task.customer_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleStart}
                disabled={!selectedTaskId || startTimer.isPending}
              >
                <Play className="w-3.5 h-3.5" /> {t('my_day_start_timer')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}