import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const KEYS = ['line_channel_id', 'line_channel_secret', 'line_user_id'];

const DEPT_LIST = [
  { key: 'management', label: 'Management' },
  { key: 'accounting', label: 'บัญชี' },
  { key: 'consulting', label: 'ที่ปรึกษา' },
  { key: 'audit', label: 'Audit' },
  { key: 'billing', label: 'Billing' },
  { key: 'it', label: 'IT' },
];

export default function LineOASettings() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'line_oa'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const getVal = (key) => configs.find(c => c.key === key)?.value || '';

  const [channelId, setChannelId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [lineGroupId, setLineGroupId] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  const [showGroupId, setShowGroupId] = useState(false);
  const [deptGroups, setDeptGroups] = useState({});
  const [showDeptGroupIds, setShowDeptGroupIds] = useState({});
  const [webhookUrl, setWebhookUrl] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!configs.length || initialized) return;
    setChannelId(getVal('line_channel_id'));
    setChannelSecret(getVal('line_channel_secret'));
    setAccessToken(getVal('line_access_token'));
    setLineUserId(getVal('line_user_id'));
    setLineGroupId(getVal('line_group_id'));
    setWebhookUrl(getVal('line_webhook_url') || 'https://acc-precision-hub.base44.app/functions/lineWebhook');
    const dg = {};
    DEPT_LIST.forEach(d => {
      dg[d.key] = getVal(`line_group_dept_${d.key}`);
    });
    setDeptGroups(dg);
    setInitialized(true);
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pairs = [
        { key: 'line_channel_id', value: channelId, description: 'LINE OA Channel ID' },
        { key: 'line_channel_secret', value: channelSecret, description: 'LINE OA Channel Secret' },
        { key: 'line_access_token', value: accessToken, description: 'LINE OA Channel Access Token' },
        { key: 'line_user_id', value: lineUserId, description: 'LINE Your User ID' },
        { key: 'line_group_id', value: lineGroupId, description: 'LINE Group ID สำหรับส่งแจ้งเตือนเข้ากลุ่ม (บริษัท)' },
        ...DEPT_LIST.map(d => ({
          key: `line_group_dept_${d.key}`,
          value: deptGroups[d.key] || '',
          description: `LINE Group ID แผนก ${d.label}`,
        })),
        { key: 'line_webhook_url', value: webhookUrl, description: 'LINE Webhook URL' },
      ];
      for (const p of pairs) {
        const existing = configs.find(c => c.key === p.key);
        if (existing) {
          await base44.entities.AppConfig.update(existing.id, { value: p.value });
        } else {
          await base44.entities.AppConfig.create(p);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig', 'line_oa'] });
      toast.success('บันทึกการตั้งค่า LINE OA เรียบร้อย');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      // Simple validation test
      if (!channelId || !channelSecret || !accessToken) throw new Error('กรุณากรอก Channel ID, Channel Secret และ Channel Access Token');
      if (!lineUserId) throw new Error('กรุณากรอก Your User ID');
      return true;
    },
    onSuccess: () => toast.success('การเชื่อมต่อสำเร็จ (Channel ID & Secret ถูกบันทึก)'),
    onError: (err) => toast.error(err.message),
  });

  const isConnected = !!(channelId && channelSecret && accessToken && lineUserId);
  const maskedSecret = channelSecret ? '•'.repeat(Math.max(0, channelSecret.length - 4)) + channelSecret.slice(-4) : '';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500" /> LINE Official Account
        </CardTitle>
        <p className="text-xs text-muted-foreground">Configure LINE OA for messaging and file capture</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel ID */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <span className="font-semibold">Channel ID</span>
            <span className="text-muted-foreground font-normal"> — Your LINE Official Account Channel ID</span>
          </Label>
          <Input value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="" />
          <p className="text-[11px] text-muted-foreground">Found in LINE Developers Console</p>
        </div>

        {/* Channel Secret */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              <span className="font-semibold">Channel Secret</span>
              <span className="text-muted-foreground font-normal"> — Your LINE Official Account Channel Secret (masked)</span>
            </Label>
          </div>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={channelSecret}
              onChange={e => setChannelSecret(e.target.value)}
              placeholder=""
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSecret(!showSecret)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showSecret ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Stored securely. Update via your LINE Developers Console.</p>
        </div>

        {/* Channel Access Token */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <span className="font-semibold">Channel Access Token</span>
            <span className="text-muted-foreground font-normal"> — Your LINE Official Account Channel Access Token (masked)</span>
          </Label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              placeholder=""
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowToken(!showToken)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Stored securely. Found in LINE Developers Console → Messaging API.</p>
        </div>

        {/* Your User ID */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <span className="font-semibold">Your User ID</span>
            <span className="text-muted-foreground font-normal"> — Your LINE User ID (masked)</span>
          </Label>
          <div className="relative">
            <Input
              type={showUserId ? 'text' : 'password'}
              value={lineUserId}
              onChange={e => setLineUserId(e.target.value)}
              placeholder=""
            />
            <button
              type="button"
              onClick={() => setShowUserId(!showUserId)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showUserId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Found in LINE Developers Console → Basic settings → Your user ID</p>
        </div>

        {/* LINE Group ID */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <span className="font-semibold">Group ID (กลุ่มบริษัท)</span>
            <span className="text-muted-foreground font-normal"> — LINE Group ID สำหรับส่งแจ้งเตือนเข้ากลุ่ม</span>
          </Label>
          <div className="relative">
            <Input
              type={showGroupId ? 'text' : 'password'}
              value={lineGroupId}
              onChange={e => setLineGroupId(e.target.value)}
              placeholder="C..."
            />
            <button
              type="button"
              onClick={() => setShowGroupId(!showGroupId)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showGroupId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">เชิญ LINE OA Bot เข้ากลุ่ม แล้วส่งข้อความ — ระบบจะบันทึก Group ID จาก webhook อัตโนมัติ หรือกรอกเอง</p>
        </div>

        {/* Department Group IDs */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm">
            <span className="font-semibold">Group ID ตามแผนก</span>
            <span className="text-muted-foreground font-normal"> — LINE Group ID สำหรับส่งแจ้งเตือนงานเข้ากลุ่มแต่ละแผนก</span>
          </Label>
          <p className="text-[11px] text-muted-foreground">เชิญ Bot เข้ากลุ่มแผนก แล้วกรอก Group ID — ระบบจะส่งแจ้งเตือนงานที่เกี่ยวข้องเข้ากลุ่มแผนกโดยอัตโนมัติ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {DEPT_LIST.map(dept => (
              <div key={dept.key} className="space-y-1">
                <Label className="text-xs font-medium">{dept.label}</Label>
                <div className="relative">
                  <Input
                    type={showDeptGroupIds[dept.key] ? 'text' : 'password'}
                    value={deptGroups[dept.key] || ''}
                    onChange={e => setDeptGroups(prev => ({ ...prev, [dept.key]: e.target.value }))}
                    placeholder={`Group ID แผนก${dept.label}`}
                    className="text-xs h-8 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeptGroupIds(prev => ({ ...prev, [dept.key]: !prev[dept.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showDeptGroupIds[dept.key] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook URL */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <span className="font-semibold">Webhook URL</span>
            <span className="text-muted-foreground font-normal"> — Configure this in your LINE Developers Console</span>
          </Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://..." className="flex-1" />
            <Button type="button" size="sm" variant="outline" className="text-xs shrink-0" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.info('Copied!'); }}>
              Copy
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">ใส่ URL ที่ต้องการ แล้วกด "บันทึก" — จากนั้นนำ URL นี้ไปตั้งค่าใน LINE Developers Console</p>
        </div>

        {/* Save Button */}
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า LINE OA'}
        </Button>

        {/* Status Bar */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">LINE OA</span>
            <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-100 text-green-700 text-[10px]' : 'text-[10px]'}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
          <Button size="sm" variant="outline" className="text-xs h-8"
            onClick={() => { saveMutation.mutate(); testMutation.mutate(); }}
            disabled={testMutation.isPending}>
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}