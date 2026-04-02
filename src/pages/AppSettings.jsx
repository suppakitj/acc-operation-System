import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Check, Globe, Shield, Clock, User, Plug, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '../components/LanguageContext';
import LineOASettings from '../components/settings/LineOASettings';
import EmailSettings from '../components/settings/EmailSettings';
import O365EmailSettings from '../components/settings/O365EmailSettings';
import GoogleDriveSettings from '../components/settings/GoogleDriveSettings';
import ManusSettings from '../components/settings/ManusSettings';
import CredentialVaultSettings from '../components/settings/CredentialVaultSettings';
import SessionTimeoutSettings from '../components/settings/SessionTimeoutSettings';
import ProfileSettings from '../components/settings/ProfileSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import NotificationSettings from '../components/settings/NotificationSettings';

export default function AppSettings() {
  const { t } = useLanguage();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin' || user?.role === 'management';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('settings_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings_subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-3" : "grid-cols-1")}>
          <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
            <User className="w-3.5 h-3.5" /> โปรไฟล์
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="system" className="gap-1.5 text-xs sm:text-sm">
              <Settings className="w-3.5 h-3.5" /> ระบบ
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="integrations" className="gap-1.5 text-xs sm:text-sm">
              <Plug className="w-3.5 h-3.5" /> เชื่อมต่อ
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Profile */}
        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings user={user} />
          <AppearanceSettings user={user} />
          <NotificationSettings user={user} />
        </TabsContent>

        {/* Tab: System (Admin) */}
        {isAdmin && (
          <TabsContent value="system" className="space-y-4">
            <SessionTimeoutSettings />
          </TabsContent>
        )}

        {/* Tab: Integrations (Admin) */}
        {isAdmin && (
          <TabsContent value="integrations" className="space-y-4">
            <O365EmailSettings />
            <EmailSettings />
            <LineOASettings />
            <GoogleDriveSettings />
            <ManusSettings />
            <CredentialVaultSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}