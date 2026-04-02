import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, Users, Building2,
  Bell, CreditCard, MessageCircle, Shield,
  Settings, ChevronLeft, ChevronRight, Key, ClipboardList,
  BarChart3, History, X, Database, Briefcase, CalendarHeart, TrendingUp, UsersRound, CalendarDays,
  ChevronDown, PieChart, Folder, Contact, MessageSquare, Cog, ScanLine, HardDrive, Handshake, Zap, Timer, Scale, DollarSign, Target, Activity,
  HeartPulse, KeyRound, Globe
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
    // ─── ภาพรวม ───
    { id: 'dashboard', label: t('menu_dashboard'), icon: LayoutDashboard, path: '/Dashboard' },
    { id: 'kpi_dashboard', label: 'KPI Dashboard', icon: Target, path: '/KpiDashboard' },
    // ─── งาน & ตารางงาน ───
    { id: 'tasks', label: t('menu_tasks'), icon: CheckSquare, path: '/Tasks' },
    { id: 'task_calendar', label: 'Task Calendar', icon: CalendarDays, path: '/TaskCalendar' },
    { id: 'schedule', label: t('menu_schedule'), icon: Calendar, path: '/Schedule' },
    { id: 'templates', label: t('menu_templates'), icon: ClipboardList, path: '/TaskTemplates' },
    { id: 'task_generation', label: 'สร้างงานอัตโนมัติ', icon: Zap, path: '/TaskGeneration' },
    { id: 'time_tracking', label: 'Time Tracking', icon: Timer, path: '/TimeTracking' },
    // ─── ลูกค้า ───
    { id: 'customers', label: t('menu_customers'), icon: Building2, path: '/Customers' },
    { id: 'customer_profile', label: 'Customer Profile', icon: Contact, path: '/CustomerProfile' },
    { id: 'customer_health', label: 'Customer Health', icon: HeartPulse, path: '/CustomerHealthScore' },
    { id: 'credential_vault', label: 'Credential Vault', icon: KeyRound, path: '/CustomerCredentials' },
    // ─── การเงิน ───
    { id: 'billing', label: t('menu_billing'), icon: CreditCard, path: '/Billing' },
    { id: 'peak', label: t('menu_peak'), icon: Key, path: '/PeakAccount' },
    { id: 'referral', label: 'ค่าแนะนำ', icon: Handshake, path: '/ReferralCommission' },
    // ─── ทีม & รายงาน ───
    { id: 'staff_dashboard', label: 'Staff Dashboard', icon: UsersRound, path: '/StaffDashboard' },
    { id: 'team_analytics', label: 'Team Analytics', icon: TrendingUp, path: '/TeamAnalytics' },
    { id: 'workload', label: 'Workload Balancer', icon: Scale, path: '/WorkloadBalancer' },
    { id: 'staff_cost_report', label: 'Staff Cost Report', icon: DollarSign, path: '/StaffCostReport' },
    { id: 'forecast_risk', label: 'Forecast & Risk', icon: Activity, path: '/ForecastRisk' },
    // ─── LINE ───
    { id: 'line_chat', label: t('menu_line_chat'), icon: MessageCircle, path: '/LineChat' },
    { id: 'line_files', label: 'LINE Files', icon: HardDrive, path: '/LineFiles' },
    // ─── ตั้งค่า & ระบบ ───
    { id: 'service_master', label: 'Service Master', icon: Briefcase, path: '/ServiceMaster' },
    { id: 'external_service', label: 'External Service', icon: Globe, path: '/ExternalServiceMaster' },
    { id: 'holiday_master', label: 'Holiday Master', icon: CalendarHeart, path: '/HolidayMaster' },
    { id: 'ocr', label: 'OCR', icon: ScanLine, path: '/OcrProcessing' },
    { id: 'users', label: t('menu_users'), icon: Users, path: '/UserManagement' },
    { id: 'roles', label: t('menu_roles'), icon: Shield, path: '/RoleManagement' },
    { id: 'audit', label: t('menu_audit'), icon: History, path: '/AuditLog' },
    { id: 'backup', label: 'Backup DB', icon: Database, path: '/DatabaseBackup' },
    { id: 'settings', label: t('menu_settings'), icon: Settings, path: '/AppSettings' },
  ];

  const allowedIds = ac.getVisibleMenuIds();
  const visibleMenuItems = menuItems.filter(item => allowedIds.includes(item.id));

  // Menu groups — จัดหมวดให้ชัดเจน
  const menuGroups = [
    { key: 'overview', label: 'ภาพรวม', icon: PieChart, ids: ['dashboard', 'kpi_dashboard'] },
    { key: 'work', label: 'งาน & ตารางงาน', icon: CheckSquare, ids: ['tasks', 'task_calendar', 'schedule', 'templates', 'task_generation', 'time_tracking'] },
    { key: 'clients', label: 'ลูกค้า', icon: Building2, ids: ['customers', 'customer_profile', 'customer_health', 'credential_vault'] },
    { key: 'finance', label: 'การเงิน', icon: CreditCard, ids: ['billing', 'peak', 'referral'] },
    { key: 'reports', label: 'ทีม & รายงาน', icon: BarChart3, ids: ['staff_dashboard', 'team_analytics', 'workload', 'staff_cost_report', 'forecast_risk'] },
    { key: 'comms', label: 'LINE', icon: MessageCircle, ids: ['line_chat', 'line_files'] },
    { key: 'system', label: 'ตั้งค่า & ระบบ', icon: Cog, ids: ['service_master', 'external_service', 'holiday_master', 'ocr', 'users', 'roles', 'audit', 'backup', 'settings'] },
  ];

  // Build visible groups
  const visibleGroups = menuGroups
    .map(g => ({ ...g, items: visibleMenuItems.filter(m => g.ids.includes(m.id)) }))
    .filter(g => g.items.length > 0);

  // Find which group the current page belongs to
  const activeGroupKey = visibleGroups.find(g => g.items.some(m => m.path === location.pathname))?.key;

  // Collapsible state — auto-expand active group
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const saved = localStorage.getItem('sidebar_groups');
    if (saved) return JSON.parse(saved);
    return { overview: true, work: true, clients: true, comms: true, tools: true, system: false };
  });

  useEffect(() => {
    if (activeGroupKey && !expandedGroups[activeGroupKey]) {
      setExpandedGroups(prev => ({ ...prev, [activeGroupKey]: true }));
    }
  }, [activeGroupKey]);

  useEffect(() => {
    localStorage.setItem('sidebar_groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary-foreground font-bold text-sm">{user?.initials || 'A'}</span>
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
        <nav className="space-y-1">
          {visibleGroups.map(group => {
            const isExpanded = expandedGroups[group.key] !== false;
            const hasActive = group.items.some(m => m.path === location.pathname);
            const GroupIcon = group.icon;

            return (
              <div key={group.key}>
                {/* Group header */}
                {(!collapsed || mobileOpen) ? (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors",
                      hasActive ? "text-sidebar-primary" : "text-sidebar-foreground/45 hover:text-sidebar-foreground/70"
                    )}
                  >
                    <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", !isExpanded && "-rotate-90")} />
                  </button>
                ) : (
                  <div className="flex justify-center py-1.5">
                    <div className={cn("w-5 h-px rounded", hasActive ? "bg-sidebar-primary/60" : "bg-sidebar-foreground/15")} />
                  </div>
                )}

                {/* Group items */}
                <div className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-200",
                  (!collapsed || mobileOpen) ? (isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0") : ""
                )}>
                  {group.items.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-200",
                          (!collapsed || mobileOpen) ? "px-3 py-2 ml-2" : "px-3 py-2.5",
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
                </div>
              </div>
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
        "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 hidden lg:flex flex-col border-r border-sidebar-border font-sarabun",
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
        "fixed left-0 top-0 h-full w-72 bg-sidebar text-sidebar-foreground z-50 lg:hidden transition-transform duration-300 border-r border-sidebar-border font-sarabun",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}