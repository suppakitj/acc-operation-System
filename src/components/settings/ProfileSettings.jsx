import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

export default function ProfileSettings({ user }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [initials, setInitials] = useState(user?.initials || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setInitials(user.initials || '');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ nickname, initials });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    toast.success(t('saved'));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4" /> โปรไฟล์ของคุณ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>ชื่อ-นามสกุล</Label>
          <Input value={user?.full_name || ''} disabled className="bg-muted/50 cursor-not-allowed" />
          <p className="text-[11px] text-muted-foreground">ไม่สามารถแก้ไขได้</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>ชื่อเล่น</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="เช่น นุ้ย, แอน" />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อย่อ</Label>
            <Input value={initials} onChange={e => setInitials(e.target.value)} placeholder="เช่น NP, AK" />
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}