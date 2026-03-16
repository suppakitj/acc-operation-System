import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, Users, Building2,
  FileText, Bell, CreditCard, MessageCircle, Shield,
  Settings, ChevronLeft, ChevronRight, Key, ClipboardList,
  BarChart3, History, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/Dashboard' },
  { id: 'tasks', label: 'จัดการงาน', icon: CheckSquare, path: '/Tasks' },
  { id: 'schedule', label: 'ตารางงาน', icon: Calendar, path: '/Schedule' },
  { id: 'customers', label: 'ลูกค้า', icon: Building2, path: '/Customers' },
  { id: 'templates', label: 'เทมเพลตงาน', icon: ClipboardList, path: '/TaskTemplates' },
  { id: 'peak', label: 'Peak Account', icon: Key, path: '/PeakAccount' },
  { id: 'billing', label: 'Billing', icon: CreditCard, path: '/Billing' },
  { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, path: '/Notifications' },
  { id: 'line_chat', label: 'Line OA Chat', icon: MessageCircle, path: '/LineChat' },
  { id: 'reports', label: 'รายงาน', icon: BarChart3, path: '/Reports' },
  { id: 'users', label: 'จัดการผู้ใช้', icon: Users, path: '/UserManagement' },
  { id: 'roles', label: 'สิทธิ์การใช้งาน', icon: Shield, path: '/RoleManagement' },
  { id: 'audit', label: 'Audit Log', icon: History, path: '/AuditLog' },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings, path: '/AppSettings' },
];

export default function Sidebar({ user, collapsed, setCollapsed }) {
  const location = useLocation();

  const userPermissions = user?.menu_permissions || [];
  const isAdmin = user?.role === 'admin' || user?.role === 'management';

  const visibleMenuItems = menuItems.filter(item => {
    if (isAdmin) return true;
    if (['dashboard', 'tasks', 'schedule', 'notifications', 'settings'].includes(item.id)) return true;
    return userPermissions.includes(item.id);
  });

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">ACC Consulting</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Management System</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <span className="text-sidebar-primary-foreground font-bold text-sm">A</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleMenuItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-all text-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>ย่อเมนู</span></>}
        </button>
      </div>
    </aside>
  );
}