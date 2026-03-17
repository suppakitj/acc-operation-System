import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, Users, Building2,
  Bell, CreditCard, MessageCircle, Shield,
  Settings, ChevronLeft, ChevronRight, Key, ClipboardList,
  BarChart3, History, X, Database, Briefcase, CalendarHeart, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '../LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAccessControl } from '../auth/useAccessControl';

export default function Sidebar({ user, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const { t } = useLanguage();
  const ac = useAccessControl(user);

  const menuItems = [
    { id: 'dashboard', label: t('menu_dashboard'), icon: LayoutDashboard, path: '/Dashboard' },
    { id: 'tasks', label: t('menu_tasks'), icon: CheckSquare, path: '/Tasks' },
    { id: 'schedule', label: t('menu_schedule'), icon: Calendar, path: '/Schedule' },
    { id: 'customers', label: t('menu_customers'), icon: Building2, path: '/Customers' },
    { id: 'templates', label: t('menu_templates'), icon: ClipboardList, path: '/TaskTemplates' },
    { id: 'service_master', label: 'Service Master', icon: Briefcase, path: '/ServiceMaster' },
    { id: 'holiday_master', label: 'Holiday Master', icon: CalendarHeart, path: '/HolidayMaster' },
    { id: 'peak', label: t('menu_peak'), icon: Key, path: '/PeakAccount' },
    { id: 'billing', label: t('menu_billing'), icon: CreditCard, path: '/Billing' },
    { id: 'notifications', label: t('menu_notifications'), icon: Bell, path: '/Notifications' },
    { id: 'line_chat', label: t('menu_line_chat'), icon: MessageCircle, path: '/LineChat' },
    { id: 'team_analytics', label: 'Team Analytics', icon: TrendingUp, path: '/TeamAnalytics' },
    { id: 'reports', label: t('menu_reports'), icon: BarChart3, path: '/Reports' },
    { id: 'users', label: t('menu_users'), icon: Users, path: '/UserManagement' },
    { id: 'roles', label: t('menu_roles'), icon: Shield, path: '/RoleManagement' },
    { id: 'audit', label: t('menu_audit'), icon: History, path: '/AuditLog' },
    { id: 'backup', label: 'Backup DB', icon: Database, path: '/DatabaseBackup' },
    { id: 'settings', label: t('menu_settings'), icon: Settings, path: '/AppSettings' },
  ];

  const allowedIds = ac.getVisibleMenuIds();
  const visibleMenuItems = menuItems.filter(item => allowedIds.includes(item.id));

  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary-foreground font-bold text-sm">A</span>
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate">{t('app_name')}</h1>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{t('app_subtitle')}</p>
            </div>
          )}
        </div>
        {/* Mobile close button */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3 px-2">
        <nav className="space-y-0.5">
          {visibleMenuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-primary"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                )}
                title={collapsed && !mobileOpen ? item.label : undefined}
              >
                <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-sidebar-primary")} />
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle — desktop only */}
      <div className="p-2 border-t border-sidebar-border shrink-0 hidden lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-all text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>{t('collapse_menu')}</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 hidden lg:flex flex-col border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-64"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-72 bg-sidebar text-sidebar-foreground z-50 lg:hidden transition-transform duration-300 border-r border-sidebar-border",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}