import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications } = useQuery({
    queryKey: ['unreadNotifications'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Notification.filter({ target_user: user.email, is_read: false });
    },
    enabled: !!user?.email,
    refetchInterval: 60000,
  });

  // Apply theme
  useEffect(() => {
    if (user?.theme) {
      document.documentElement.classList.remove('theme-emerald', 'theme-purple', 'theme-rose', 'dark');
      if (user.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (user.theme !== 'default') {
        document.documentElement.classList.add(`theme-${user.theme}`);
      }
    }
  }, [user?.theme]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={cn("transition-all duration-300", collapsed ? "ml-16" : "ml-64")}>
        <TopBar user={user} unreadCount={notifications?.length || 0} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}