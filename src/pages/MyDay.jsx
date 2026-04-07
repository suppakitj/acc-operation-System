import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';

import GreetingHeader from '../components/my-day/GreetingHeader';
import TodayFocus from '../components/my-day/TodayFocus';
import MyStats from '../components/my-day/MyStats';
import PulseSurvey from '../components/my-day/PulseSurvey';
import QuickTimer from '../components/my-day/QuickTimer';
import CompanyFeed from '../components/my-day/CompanyFeed';
import SkillMap from '../components/my-day/SkillMap';
import IdeaBox from '../components/my-day/IdeaBox';
import AppLauncher from '../components/my-day/AppLauncher';

export default function MyDay() {
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['myTasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter(
      { assigned_to: currentUser.email },
      '-due_date',
      200
    ),
    enabled: !!currentUser?.email,
  });

  const { data: myTimeEntries = [] } = useQuery({
    queryKey: ['myTimeEntries', currentUser?.email],
    queryFn: () => base44.entities.TimeEntry.filter(
      { user_email: currentUser.email },
      '-created_date',
      500
    ),
    enabled: !!currentUser?.email,
  });

  // Derive task groups
  const { activeTasks, dueToday, overdue } = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const active = myTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const todayTasks = active.filter(t => t.due_date?.slice(0, 10) === today);
    const overdueTasks = active.filter(t => t.due_date && new Date(t.due_date) < todayStart && t.due_date.slice(0, 10) !== today);

    return { activeTasks: active, dueToday: todayTasks, overdue: overdueTasks };
  }, [myTasks]);

  // Running timer
  const runningEntry = useMemo(() =>
    myTimeEntries.find(e => e.is_running && e.user_email === currentUser?.email),
    [myTimeEntries, currentUser]
  );

  // Status change mutation
  const updateTaskStatus = useMutation({
    mutationFn: ({ id, newStatus }) => {
      const updateData = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_date = format(new Date(), 'yyyy-MM-dd');
      }
      return base44.entities.Task.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('อัปเดตสถานะแล้ว');
    },
  });

  const handleStatusChange = (taskId, newStatus) => {
    updateTaskStatus.mutate({ id: taskId, newStatus });
  };

  if (isLoadingUser || isLoadingTasks) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <GreetingHeader user={currentUser} />
      <TodayFocus
        activeTasks={activeTasks}
        dueToday={dueToday}
        overdue={overdue}
        onStatusChange={handleStatusChange}
      />
      <MyStats myTasks={myTasks} myTimeEntries={myTimeEntries} />
      <PulseSurvey currentUser={currentUser} />
      <QuickTimer
        currentUser={currentUser}
        activeTasks={activeTasks}
        runningEntry={runningEntry}
      />
      <AppLauncher currentUser={currentUser} />
      <CompanyFeed currentUser={currentUser} />
      <SkillMap currentUser={currentUser} />
      <IdeaBox currentUser={currentUser} />
    </div>
  );
}