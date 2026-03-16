import React, { useState } from 'react';
import { Bell, Search, LogOut, Settings, User, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

const DEPARTMENT_LABELS = {
  management: 'Management', accounting: 'บัญชี', consulting: 'ที่ปรึกษา',
  audit: 'Audit', billing: 'Billing', it: 'IT'
};

const ROLE_LABELS = {
  admin: 'Admin', management: 'Management', manager: 'Manager',
  super_supervisor: 'Super Supervisor', staff: 'Staff'
};

export default function TopBar({ user, unreadCount }) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหา..." className="pl-10 bg-muted/50 border-0" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Link to="/Notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-muted rounded-lg p-2 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-semibold">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {DEPARTMENT_LABELS[user?.department] || '-'} · {ROLE_LABELS[user?.role] || 'Staff'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/AppSettings" className="cursor-pointer">
                <Palette className="w-4 h-4 mr-2" /> ตั้งค่าธีม
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/AppSettings" className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" /> ตั้งค่า
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}