import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Palette, Check, Globe, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '../components/LanguageContext';
import LineOASettings from '../components/settings/LineOASettings';

const THEMES = [
  { id: 'default', label: 'Navy Blue', color: 'bg-[#1e3a5f]' },
  { id: 'emerald', label: 'Emerald Green', color: 'bg-[#2d8a6e]' },
  { id: 'purple', label: 'Royal Purple', color: 'bg-[#6d28d9]' },
  { id: 'rose', label: 'Rose Red', color: 'bg-[#e11d48]' },
  { id: 'dark', label: 'Dark Mode', color: 'bg-[#1a1a2e]' },
];

function SessionTimeoutSettings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig'],
    queryFn: () => base44.entities.AppConfig.filter({ key: 'session_timeout_minutes' }),
  });

  const existing = configs.find(c => c.key === 'session_timeout_minutes');
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    if (existing) setMinutes(parseInt(existing.value) || 30);
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        await base44.entities.AppConfig.update(existing.id, { value: String(minutes) });
      } else {
        await base44.entities.AppConfig.create({ key: 'session_timeout_minutes', value: String(minutes), description: 'Session inactivity timeout in minutes' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      toast.success(t('saved'));
    },
  });

  return (
    <Card className="border-orange-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-orange-500" /> Session Timeout (Admin)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">กำหนดระยะเวลา (นาที) ที่ระบบจะ logout อัตโนมัติเมื่อไม่มีการใช้งาน</p>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <Input type="number" min={5} max={480} value={minutes} onChange={e => setMinutes(Math.max(5, parseInt(e.target.value) || 5))} className="w-24" />
          <span className="text-sm text-muted-foreground">นาที</span>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppSettings() {
  const { t, lang, setLang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const [selectedTheme, setSelectedTheme] = useState(user?.theme || 'default');
  const [notifEmail, setNotifEmail] = useState(user?.notification_email !== false);
  const [notifLine, setNotifLine] = useState(user?.notification_line !== false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ theme: selectedTheme, notification_email: notifEmail, notification_line: notifLine });
    document.documentElement.classList.remove('theme-emerald', 'theme-purple', 'theme-rose', 'dark');
    if (selectedTheme === 'dark') document.documentElement.classList.add('dark');
    else if (selectedTheme !== 'default') document.documentElement.classList.add(`theme-${selectedTheme}`);
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    toast.success(t('saved'));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('settings_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings_subtitle')}</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> {t('language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t('language_desc')}</p>
          <div className="grid grid-cols-2 gap-3">
            {[{ id: 'th', label: '🇹🇭 ภาษาไทย', sub: 'Thai' }, { id: 'en', label: '🇺🇸 English', sub: 'English' }].map(l => (
              <button key={l.id} onClick={() => setLang(l.id)}
                className={cn("flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left", lang === l.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <span className="text-sm font-medium">{l.label}</span>
                {lang === l.id && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> {t('choose_theme')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {THEMES.map(theme => (
              <button key={theme.id} onClick={() => setSelectedTheme(theme.id)}
                className={cn("flex items-center gap-3 p-4 rounded-lg border-2 transition-all", selectedTheme === theme.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className={cn("w-8 h-8 rounded-full shrink-0", theme.color)} />
                <span className="text-sm font-medium">{theme.label}</span>
                {selectedTheme === theme.id && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('notif_settings')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div><Label>{t('email_notif')}</Label><p className="text-xs text-muted-foreground">{t('email_notif_desc')}</p></div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div><Label>{t('line_notif')}</Label><p className="text-xs text-muted-foreground">{t('line_notif_desc')}</p></div>
            <Switch checked={notifLine} onCheckedChange={setNotifLine} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? t('saving') : t('save_settings')}</Button>

      {/* LINE OA Settings — Admin Only */}
      {(user?.role === 'admin' || user?.role === 'management') && <LineOASettings />}

      {/* Admin Only — Session Timeout */}
      {(user?.role === 'admin' || user?.role === 'management') && <SessionTimeoutSettings />}
    </div>
  );
}