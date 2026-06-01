import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAccessControl } from '@/components/auth/useAccessControl';
import WhtRateConfig from '@/components/tax-qa-config/WhtRateConfig';
import KeywordMapConfig from '@/components/tax-qa-config/KeywordMapConfig';
import GlobalParamsConfig from '@/components/tax-qa-config/GlobalParamsConfig';

export default function TaxQAConfig() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(user);

  // Restrict to admin / partner roles
  const canAccess = ac.role === 'admin' || ac.role === 'partner' || ac.role === 'management';

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax QA Config</h1>
        <p className="text-sm text-muted-foreground">ตั้งค่าอัตราภาษี กฎ keyword และพารามิเตอร์ระบบตรวจ</p>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-700 text-sm">
          การเปลี่ยนอัตราหรือพารามิเตอร์มีผลกับการ validate ครั้งถัดไป — ควรตั้ง effective_date ให้ถูกต้อง
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="wht_rate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="wht_rate">WHT Rate Table</TabsTrigger>
          <TabsTrigger value="keyword">Income Keyword Map</TabsTrigger>
          <TabsTrigger value="global">Global Parameters</TabsTrigger>
        </TabsList>
        <TabsContent value="wht_rate"><WhtRateConfig user={user} /></TabsContent>
        <TabsContent value="keyword"><KeywordMapConfig user={user} /></TabsContent>
        <TabsContent value="global"><GlobalParamsConfig user={user} /></TabsContent>
      </Tabs>
    </div>
  );
}