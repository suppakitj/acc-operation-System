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
import AppLauncher from '../components/my-day/AppLauncher';
import MyTodoList from '../components/my-day/MyTodoList';
import ReviewQueue from '../components/my-day/ReviewQueue';

export default function MyDay() {
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60_000,
  });

  const { data: myTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['myTasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter(
      { assigned_to: currentUser.email },
      '-due_date',
      200
    ),
    enabled: !!currentUser?.email,
    staleTime: 30_000,
  });

  const { data: myTimeEntries = [] } = useQuery({
    queryKey: ['myTimeEntries', currentUser?.email],
    queryFn: () => base44.entities.TimeEntry.filter(
      { user_email: currentUser.email },
      '-created_date',
      100
    ),
    enabled: !!currentUser?.email,
    staleTime: 30_000,
  });

  // ดึงงานรอตรวจ — เฉพาะ reviewer เท่านั้น
  const isReviewer = ['admin', 'management', 'manager', 'super_supervisor'].includes(currentUser?.role);
  const { data: reviewTasks = [] } = useQuery({
    queryKey: ['reviewTasks'],
    queryFn: () => base44.entities.Task.filter({ status: 'review' }, '-created_date', 50),
    enabled: !!currentUser && isReviewer,
    staleTime: 30_000,
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
    mutationFn: ({ id, newStatus, extraData }) => {
      const updateData = { status: newStatus, ...extraData };
      if (newStatus === 'review') {
        updateData.review_status = 'pending_review';
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
    const task = myTasks.find(t => t.id === taskId);
    const isStaff = currentUser?.role === 'staff';
    const isReviewerRole = ['admin', 'management', 'manager', 'super_supervisor'].includes(currentUser?.role);

    // Staff ห้ามกด completed
    if (isStaff && newStatus === 'completed') {
      toast.error('ไม่สามารถปิดงานเองได้ — ต้องส่งตรวจให้หัวหน้า approve');
      return;
    }

    // เช็ค checklist ก่อนส่งตรวจหรือปิดงาน
    if ((newStatus === 'review' || newStatus === 'completed') && task) {
      const checklist = task.checklist || [];
      const allChecked = checklist.length === 0 || checklist.every(item => item.checked);
      if (!allChecked) {
        toast.error('กรุณา check checklist ให้ครบก่อน');
        return;
      }
    }

    // ถ้า reviewer ปิดงานตรง → set reviewer info
    let extraData = {};
    if (newStatus === 'completed' && isReviewerRole) {
      const today = format(new Date(), 'yyyy-MM-dd');
      extraData = {
        completed_date: today,
        review_status: 'approved',
        reviewer_email: currentUser.email,
        reviewer_name: currentUser.full_name || currentUser.email,
        reviewed_date: today,
        review_note: task.status === 'review' ? '' : 'ปิดงานโดยหัวหน้างาน (ไม่ผ่าน review)',
      };
    }

    updateTaskStatus.mutate({ id: taskId, newStatus, extraData });
  };

  // Approve/Reject สำหรับ ReviewQueue
  const handleReviewApprove = async (taskId) => {
    const task = reviewTasks.find(t => t.id === taskId);
    if (task) {
      const checklist = task.checklist || [];
      const checkedCount = checklist.filter(item => item.checked).length;
      if (checklist.length > 0 && checkedCount !== checklist.length) {
        toast.error(`Checklist ยังไม่ครบ (${checkedCount}/${checklist.length}) — กรุณาส่งกลับ`);
        return;
      }
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.Task.update(taskId, {
      status: 'completed',
      completed_date: today,
      review_status: 'approved',
      reviewer_email: currentUser.email,
      reviewer_name: currentUser.full_name || currentUser.email,
      reviewed_date: today,
    });
    queryClient.invalidateQueries({ queryKey: ['reviewTasks'] });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('✅ Approve เรียบร้อย');
  };

  const handleReviewReject = async (taskId, note) => {
    await base44.entities.Task.update(taskId, {
      status: 'in_progress',
      review_status: 'rejected',
      reviewer_email: currentUser.email,
      reviewer_name: currentUser.full_name || currentUser.email,
      reviewed_date: format(new Date(), 'yyyy-MM-dd'),
      review_note: note || '',
    });
    queryClient.invalidateQueries({ queryKey: ['reviewTasks'] });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('📤 ส่งกลับแล้ว');
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
      <CompanyFeed currentUser={currentUser} />
      <TodayFocus
        activeTasks={activeTasks}
        dueToday={dueToday}
        overdue={overdue}
        onStatusChange={handleStatusChange}
        currentUser={currentUser}
        isUpdating={updateTaskStatus.isPending}
      />
      <ReviewQueue
        reviewTasks={reviewTasks}
        onApprove={handleReviewApprove}
        onReject={handleReviewReject}
        currentUser={currentUser}
      />
      <MyTodoList currentUser={currentUser} />
      <MyStats myTasks={myTasks} myTimeEntries={myTimeEntries} />
      <PulseSurvey currentUser={currentUser} />
      <QuickTimer
        currentUser={currentUser}
        activeTasks={activeTasks}
        runningEntry={runningEntry}
      />
      <AppLauncher currentUser={currentUser} />
    </div>
  );
}