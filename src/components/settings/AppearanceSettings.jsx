import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Check, Globe, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '../LanguageContext';

const THEMES = [
  { id: 'default', label: 'Navy Blue', color: 'bg-[#1e3a5f]' },
  { id: 'emerald', label: 'Emerald Green', color: 'bg-[#2d8a6e]' },
  { id: 'purple', label: 'Royal Purple', color: 'bg-[#6d28d9]' },
  { id: 'rose', label: 'Rose Red', color: 'bg-[#e11d48]' },
  { id: 'ocean', label: 'Ocean Teal', color: 'bg-[#0d9488]' },
  { id: 'amber', label: 'Warm Amber', color: 'bg-[#d97706]' },
  { id: 'indigo', label: 'Indigo', color: 'bg-[#4f46e5]' },
  { id: 'slate', label: 'Slate Gray', color: 'bg-[#475569]' },
  { id: 'pink', label: 'Soft Pink', color: 'bg-[#db2777]' },
  { id: 'dark', label: 'Dark Mode', color: 'bg-[#1a1a2e]' },
];

export default function AppearanceSettings({ user }) {
  const { t, lang, setLang } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTheme, setSelectedTheme] = useState(user?.theme || 'default');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ theme: selectedTheme });
    document.documentElement.classList.remove('theme-emerald', 'theme-purple', 'theme-rose', 'theme-ocean', 'theme-amber', 'theme-indigo', 'theme-slate', 'theme-pink', 'dark');
    if (selectedTheme === 'dark') document.documentElement.classList.add('dark');
    else if (selectedTheme !== 'default') document.documentElement.classList.add(`theme-${selectedTheme}`);
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    toast.success(t('saved'));
  };

  return (
    <>
      {/* Language */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" /> {t('language')}
          </CardTitle>
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
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> {t('choose_theme')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {THEMES.map(theme => (
              <button key={theme.id} onClick={() => setSelectedTheme(theme.id)}
                className={cn("flex items-center gap-3 p-4 rounded-lg border-2 transition-all", selectedTheme === theme.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className={cn("w-8 h-8 rounded-full shrink-0", theme.color)} />
                <span className="text-sm font-medium">{theme.label}</span>
                {selectedTheme === theme.id && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? t('saving') : t('save')}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}