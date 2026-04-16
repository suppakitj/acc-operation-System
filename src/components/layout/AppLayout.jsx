import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SessionTimeout from '../auth/SessionTimeout';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 2 * 60_000, // 2min — user data rarely changes
  });

  const { data: notifications } = useQuery({
    queryKey: ['unreadNotifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Notification.filter({ target_user: user.email, is_read: false });
    },
    enabled: !!user?.email,
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });

  const { data: lineUnreadCount = 0 } = useQuery({
    queryKey: ['lineUnreadCount'],
    queryFn: async () => {
      const messages = await base44.entities.LineMessage.filter(
        { is_read: false, direction: 'incoming' },
        '-created_date',
        500
      );
      return messages.length;
    },
    enabled: !!user?.email,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // ─── Tab title กะพริบเมื่อ LINE ใหม่ ───
  const originalTitle = useRef(document.title);
  const titleInterval = useRef(null);

  useEffect(() => {
    if (lineUnreadCount > 0) {
      if (titleInterval.current) clearInterval(titleInterval.current);
      let show = true;
      titleInterval.current = setInterval(() => {
        document.title = show
          ? `(${lineUnreadCount}) 💬 LINE ใหม่ — ACC`
          : originalTitle.current;
        show = !show;
      }, 1500);
    } else {
      if (titleInterval.current) {
        clearInterval(titleInterval.current);
        titleInterval.current = null;
      }
      document.title = originalTitle.current;
    }
    return () => {
      if (titleInterval.current) clearInterval(titleInterval.current);
    };
  }, [lineUnreadCount]);

  useEffect(() => {
    const handleFocus = () => {
      if (lineUnreadCount === 0 && titleInterval.current) {
        clearInterval(titleInterval.current);
        titleInterval.current = null;
        document.title = originalTitle.current;
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [lineUnreadCount]);

  // Log login event once
  const loginLogged = useRef(false);
  useEffect(() => {
    if (user?.email && !loginLogged.current) {
      loginLogged.current = true;
      base44.entities.AuditLog.create({
        action: 'login',
        entity_type: 'User',
        user_email: user.email,
        user_name: user.full_name || user.email,
        details: `User logged in at ${new Date().toISOString()}`,
      }).catch(() => {});
    }
  }, [user?.email]);

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.classList.remove('theme-emerald', 'theme-purple', 'theme-rose', 'theme-ocean', 'theme-amber', 'theme-indigo', 'theme-slate', 'theme-pink', 'dark');
      if (user.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (user.theme !== 'default') {
        document.documentElement.classList.add(`theme-${user.theme}`);
      }
    }
  }, [user?.theme]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        user={user}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        lineUnreadCount={lineUnreadCount}
      />
      <div className={cn(
        "transition-all duration-300",
        "lg:ml-64",
        collapsed && "lg:ml-[68px]"
      )}>
        <TopBar
          user={user}
          unreadCount={notifications?.length || 0}
          lineUnreadCount={lineUnreadCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
        <SessionTimeout />
      </div>
    </div>
  );
}