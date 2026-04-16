import React from 'react';
import { Bell, LogOut, Settings, Palette, Menu, Globe, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

export default function TopBar({ user, unreadCount, lineUnreadCount = 0, onMenuClick }) {
  const { t, lang, setLang } = useLanguage();

  const deptKey = user?.department ? `dept_${user.department}` : null;
  const roleKey = user?.role ? `role_${user.role}` : null;

  return (
    <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-semibold text-foreground/80">{t('app_name')}</h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Language toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLang(lang === 'th' ? 'en' : 'th')}>
          <span className="text-xs font-bold">{lang === 'th' ? 'EN' : 'TH'}</span>
        </Button>

        {/* LINE unread */}
        {lineUnreadCount > 0 && (
          <Link to="/LineChat">
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <MessageCircle className="w-[18px] h-[18px] text-green-600" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold px-1">
                {lineUnreadCount > 99 ? '99+' : lineUnreadCount}
              </span>
            </Button>
          </Link>
        )}

        {/* Notifications */}
        <Link to="/Notifications">
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 hover:bg-muted rounded-lg py-1.5 px-2 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xs font-bold">
                  {user?.initials || user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-[13px] font-semibold leading-tight">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {deptKey ? t(deptKey) : '-'} · {roleKey ? t(roleKey) : 'Staff'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{t('my_account')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/AppSettings" className="cursor-pointer"><Palette className="w-4 h-4 mr-2" /> {t('theme_settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/AppSettings" className="cursor-pointer"><Settings className="w-4 h-4 mr-2" /> {t('settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
              await base44.entities.AuditLog.create({
                action: 'logout',
                entity_type: 'User',
                user_email: user?.email || '',
                user_name: user?.full_name || '',
                details: `User logged out at ${new Date().toISOString()}`,
              }).catch(() => {});
              base44.auth.logout();
            }} className="text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}