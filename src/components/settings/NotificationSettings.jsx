import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

export default function NotificationSettings({ user }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [notifEmail, setNotifEmail] = useState(user?.notification_email !== false);
  const [notifLine, setNotifLine] = useState(user?.notification_line !== false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ notification_email: notifEmail, notification_line: notifLine });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    toast.success(t('saved'));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" /> {t('notif_settings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>{t('email_notif')}</Label>
            <p className="text-xs text-muted-foreground">{t('email_notif_desc')}</p>
          </div>
          <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>{t('line_notif')}</Label>
            <p className="text-xs text-muted-foreground">{t('line_notif_desc')}</p>
          </div>
          <Switch checked={notifLine} onCheckedChange={setNotifLine} />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}