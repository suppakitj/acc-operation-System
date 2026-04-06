import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const ACHIEVEMENTS = [
  {
    id: 'first_task',
    emoji: '🎯',
    title: 'First Blood',
    description: 'ทำงานเสร็จงานแรก',
    check: (ctx) => ctx.totalCompleted >= 1,
  },
  {
    id: 'ten_tasks',
    emoji: '🔟',
    title: 'สิบงานสำเร็จ',
    description: 'ทำงานเสร็จครบ 10 งาน',
    check: (ctx) => ctx.totalCompleted >= 10,
  },
  {
    id: 'fifty_tasks',
    emoji: '🏆',
    title: 'Half Century',
    description: 'ทำงานเสร็จครบ 50 งาน',
    check: (ctx) => ctx.totalCompleted >= 50,
  },
  {
    id: 'hundred_tasks',
    emoji: '💯',
    title: 'Century Club',
    description: 'ทำงานเสร็จครบ 100 งาน',
    check: (ctx) => ctx.totalCompleted >= 100,
  },
  {
    id: 'zero_overdue_30',
    emoji: '⏰',
    title: 'Mr./Ms. On-Time',
    description: 'ส่งงานตรงเวลา 30 งานติดต่อกัน',
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: 'streak_10',
    emoji: '🔥',
    title: 'On Fire',
    description: 'ส่งงานตรงเวลา 10 งานติดต่อกัน',
    check: (ctx) => ctx.streak >= 10,
  },
  {
    id: 'speed_demon',
    emoji: '⚡',
    title: 'Speed Demon',
    description: 'เสร็จงาน 5 งานใน 1 สัปดาห์',
    check: (ctx) => ctx.completedThisWeek >= 5,
  },
  {
    id: 'time_tracker',
    emoji: '⏱️',
    title: 'Time Master',
    description: 'จับเวลาสะสมครบ 100 ชั่วโมง',
    check: (ctx) => ctx.totalTrackedHours >= 100,
  },
  {
    id: 'multi_service',
    emoji: '🎭',
    title: 'Multi-talent',
    description: 'ทำงานครบ 3 ประเภทบริการ',
    check: (ctx) => ctx.serviceTypes >= 3,
  },
  {
    id: 'shoutout_received',
    emoji: '🌟',
    title: 'ขวัญใจทีม',
    description: 'ได้รับ Shout-out จากเพื่อนร่วมงาน',
    check: (ctx) => ctx.shoutOutsReceived >= 1,
  },
];

export default function Achievements({ myTasks, myTimeEntries, currentUser }) {
  const { t } = useLanguage();

  const { data: myShoutOuts = [] } = useQuery({
    queryKey: ['myShoutOuts', currentUser?.email],
    queryFn: () => base44.entities.ShoutOut.filter(
      { to_email: currentUser.email },
      '-created_date',
      100
    ),
    enabled: !!currentUser?.email,
  });

  const ctx = useMemo(() => {
    const completed = myTasks.filter(t => t.status === 'completed');
    const totalCompleted = completed.length;

    // Streak (on-time consecutive)
    const sorted = completed
      .filter(t => t.completed_date && t.due_date)
      .sort((a, b) => b.completed_date.localeCompare(a.completed_date));
    let streak = 0;
    for (const t of sorted) {
      if (t.completed_date.slice(0, 10) <= t.due_date.slice(0, 10)) streak++;
      else break;
    }

    // Completed this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const completedThisWeek = completed.filter(t =>
      t.completed_date && new Date(t.completed_date) >= weekAgo
    ).length;

    // Total tracked hours
    const totalTrackedMinutes = myTimeEntries
      .filter(e => !e.is_running && e.duration_minutes)
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const totalTrackedHours = Math.round(totalTrackedMinutes / 60);

    // Unique service types
    const serviceTypes = new Set(
      completed.map(t => t.service_type).filter(Boolean)
    ).size;

    return {
      totalCompleted,
      streak,
      completedThisWeek,
      totalTrackedHours,
      serviceTypes,
      shoutOutsReceived: myShoutOuts.length,
    };
  }, [myTasks, myTimeEntries, myShoutOuts]);

  const unlocked = ACHIEVEMENTS.filter(a => a.check(ctx));

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Trophy className="w-4 h-4 text-amber-500" />
        {t('my_day_achievements')}
        <span className="text-xs text-muted-foreground font-normal">({unlocked.length}/{ACHIEVEMENTS.length})</span>
      </p>
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = a.check(ctx);
          return (
            <div
              key={a.id}
              title={`${a.title}\n${a.description}`}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2 transition-all ${
                isUnlocked
                  ? 'border-2 border-amber-300 bg-amber-50'
                  : 'border border-dashed border-border bg-muted/30 opacity-40'
              }`}
            >
              <span className="text-2xl">{isUnlocked ? a.emoji : '🔒'}</span>
              <span className={`text-[10px] mt-1 leading-tight ${isUnlocked ? 'font-medium' : 'text-muted-foreground'}`}>
                {a.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}