import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ManusSettings() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'manus'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const getVal = (key) => configs.find(c => c.key === key)?.value || '';
  const getId = (key) => configs.find(c => c.key === key)?.id || null;

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setApiKey(getVal('manus_api_key'));
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { key: 'manus_api_key', value: apiKey, description: 'Manus.im API Key' },
      ];
      for (const item of items) {
        const existingId = getId(item.key);
        if (existingId) {
          await base44.entities.AppConfig.update(existingId, { value: item.value });
        } else {
          await base44.entities.AppConfig.create(item);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      toast.success('บันทึกการตั้งค่า Manus แล้ว');
    },
  });

  const maskedKey = apiKey ? apiKey.slice(0, 8) + '••••••••' + apiKey.slice(-4) : '';

  return (
    <Card className="border-violet-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4 text-violet-500" /> Manus.im Integration (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          ตั้งค่า API Key สำหรับเชื่อมต่อ Manus.im เพื่อใช้ OCR และประมวลผลเอกสาร
        </p>

        <div className="space-y-1.5">
          <Label>Manus API Key</Label>
          <div className="flex items-center gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="manus_xxxxxxxx..."
              className="font-mono text-sm"
            />
            <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ไปที่ manus.im → Settings → Integrations → API → Create new เพื่อสร้าง API Key
          </p>
        </div>

        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </CardContent>
    </Card>
  );
}