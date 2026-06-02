import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, AlertTriangle, History } from 'lucide-react';
import { useAccessControl } from '../components/auth/useAccessControl';
import FastTrackQueue from '../components/tax-qa/FastTrackQueue';
import ExceptionQueue from '../components/tax-qa/ExceptionQueue';
import TaxQAHistoryQueue from '../components/tax-qa/TaxQAHistoryQueue';

export default function TaxQAReview() {
  const [tab, setTab] = useState('fast_track');
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const role = ac.role;
  const canApprove = ['admin', 'partner', 'manager', 'super_supervisor'].includes(role);
  const canResubmit = true;
  const isAuditor = role === 'auditor';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Tax QA Review</h1>
        <p className="text-xs text-muted-foreground">ตรวจสอบและอนุมัติแบบภาษี — คิว Fast-track & Exception</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="fast_track" className="gap-1.5"><Zap className="w-4 h-4" />Fast-track</TabsTrigger>
          <TabsTrigger value="exception" className="gap-1.5"><AlertTriangle className="w-4 h-4" />Exception</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="w-4 h-4" />ประวัติ</TabsTrigger>
        </TabsList>
        <TabsContent value="fast_track" className="mt-4">
          <FastTrackQueue canApprove={canApprove && !isAuditor} />
        </TabsContent>
        <TabsContent value="exception" className="mt-4">
          <ExceptionQueue
            canApprove={canApprove && !isAuditor}
            canResubmit={canResubmit && !isAuditor}
            userEmail={currentUser?.email || ''}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <TaxQAHistoryQueue
            canApprove={canApprove && !isAuditor}
            canResubmit={canResubmit && !isAuditor}
            userEmail={currentUser?.email || ''}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}