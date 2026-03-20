import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

export default function SessionTimeoutSettings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'session_timeout'],
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
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-500" /> Session Timeout
        </CardTitle>
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