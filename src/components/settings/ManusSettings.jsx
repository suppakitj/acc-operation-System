import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Eye, EyeOff, Save, Webhook, CheckCircle2, XCircle, Copy, Loader2, Trash2, RefreshCw } from 'lucide-react';
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
  const [webhookSecret, setWebhookSecret] = useState('');

  useEffect(() => {
    setApiKey(getVal('manus_api_key'));
    setWebhookSecret(getVal('manus_webhook_secret'));
  }, [configs]);

  const webhookId = getVal('manus_webhook_id');

  // Build webhook URL
  const appId = window.__BASE44_APP_ID__ || '';
  const baseUrl = window.location.origin;
  const webhookBaseUrl = `https://app.base44.com/api/functions/${appId}/manusWebhook`;
  const webhookUrl = webhookSecret
    ? `${webhookBaseUrl}?secret=${encodeURIComponent(webhookSecret)}`
    : webhookBaseUrl;

  // Save API Key + Secret
  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { key: 'manus_api_key', value: apiKey, description: 'Manus.im API Key' },
        { key: 'manus_webhook_secret', value: webhookSecret, description: 'Webhook verification secret' },
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

  // Register webhook
  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('registerManusWebhook', {
        action: 'register',
        webhook_url: webhookUrl,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      toast.success(`Webhook ลงทะเบียนสำเร็จ — ID: ${data.webhook_id}`);
    },
    onError: (err) => {
      toast.error('ลงทะเบียนล้มเหลว: ' + (err?.response?.data?.error || err.message));
    },
  });

  // Delete webhook
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('registerManusWebhook', { action: 'delete' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      toast.success('ลบ Webhook แล้ว');
    },
    onError: (err) => {
      toast.error('ลบล้มเหลว: ' + (err?.response?.data?.error || err.message));
    },
  });

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setWebhookSecret(result);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('คัดลอกแล้ว');
  };

  return (
    <Card className="border-violet-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4 text-violet-500" /> Manus.im Integration (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* API Key */}
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
            ไปที่ manus.im → Settings → Integrations → API → Create new
          </p>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-1.5">
          <Label>Webhook Secret (ไม่บังคับ)</Label>
          <div className="flex items-center gap-2">
            <Input
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder="secret สำหรับยืนยัน webhook..."
              className="font-mono text-sm"
            />
            <Button variant="outline" size="sm" onClick={generateSecret} title="สุ่ม Secret ใหม่">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ใช้ป้องกันไม่ให้คนอื่นเรียก webhook ของเรา — ระบบจะตรวจสอบ ?secret= จาก URL
          </p>
        </div>

        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก API Key & Secret'}
        </Button>

        {/* Webhook Section */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-violet-500" />
            <Label className="text-sm font-semibold">Webhook Configuration</Label>
          </div>

          <p className="text-xs text-muted-foreground">
            ลงทะเบียน Webhook เพื่อให้ Manus แจ้งกลับมาอัตโนมัติเมื่อ OCR เสร็จ — ไม่ต้องกดตรวจสอบเอง
          </p>

          {/* Webhook URL */}
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-xs bg-muted/50"
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)} title="คัดลอก URL">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Webhook Status */}
          <div className="flex items-center gap-3">
            {webhookId ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 flex-1">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-green-700">Webhook ลงทะเบียนแล้ว</span>
                  <p className="text-[11px] text-green-600 font-mono truncate">ID: {webhookId}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                  {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex-1">
                <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm text-amber-700">ยังไม่ได้ลงทะเบียน Webhook</span>
              </div>
            )}
          </div>

          {/* Register / Re-register Button */}
          <Button
            size="sm"
            variant={webhookId ? 'outline' : 'default'}
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending || !apiKey}
            className="w-full"
          >
            {registerMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1" /> กำลังลงทะเบียน...</>
            ) : webhookId ? (
              <><RefreshCw className="w-4 h-4 mr-1" /> ลงทะเบียนใหม่</>
            ) : (
              <><Webhook className="w-4 h-4 mr-1" /> ลงทะเบียน Webhook ที่ Manus</>
            )}
          </Button>

          {!apiKey && (
            <p className="text-[11px] text-red-500">กรุณากรอก API Key และบันทึกก่อนลงทะเบียน Webhook</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}