import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { useAccessControl } from '../components/auth/useAccessControl';
import { Heart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import PulseSection from '../components/engagement/PulseSection';
import IdeaSection from '../components/engagement/IdeaSection';
import SkillSection from '../components/engagement/SkillSection';
import ShoutOutSection from '../components/engagement/ShoutOutSection';

export default function EngagementInsights() {
  const [deptFilter, setDeptFilter] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const ac = useAccessControl(currentUser);

  const { data: allUsers = [] } = useUserList();
  const activeUsers = allUsers.filter(u => u.status !== 'inactive');

  const { data: pulseResponses = [], isLoading: loadingPulse } = useQuery({
    queryKey: ['allPulseResponses'],
    queryFn: () => base44.entities.PulseResponse.list('-created_date', 500),
    staleTime: 60_000,
  });

  const { data: ideas = [], isLoading: loadingIdeas } = useQuery({
    queryKey: ['allIdeas'],
    queryFn: () => base44.entities.Idea.list('-created_date', 100),
    staleTime: 60_000,
  });

  const { data: allSkills = [], isLoading: loadingSkills } = useQuery({
    queryKey: ['allSkills'],
    queryFn: () => base44.entities.SkillEntry.list('skill_name', 1000),
    staleTime: 120_000,
  });

  const { data: allShoutOuts = [], isLoading: loadingShoutOuts } = useQuery({
    queryKey: ['allShoutOuts'],
    queryFn: () => base44.entities.ShoutOut.list('-created_date', 200),
    staleTime: 120_000,
  });

  if (!currentUser) return null;

  if (!ac.canViewEngagementInsights) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-muted-foreground">หน้านี้สำหรับ Admin, Management และ Manager เท่านั้น</p>
        </div>
      </div>
    );
  }

  const isLoading = loadingPulse || loadingIdeas || loadingSkills || loadingShoutOuts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            Engagement Insights
          </h1>
          <p className="text-xs text-muted-foreground mt-1">ภาพรวม pulse, ไอเดีย, ทักษะ และ shout-out ของทีม</p>
        </div>

        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="ทุกแผนก" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแผนก</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="accounting">Accounting</SelectItem>
            <SelectItem value="consulting">Consulting</SelectItem>
            <SelectItem value="audit">Audit</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="it">IT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section A: Pulse */}
      <PulseSection pulseResponses={pulseResponses} activeUserCount={activeUsers.length} deptFilter={deptFilter} />

      {/* Section B: Ideas */}
      <IdeaSection ideas={ideas} deptFilter={deptFilter} />

      {/* Section C: Skills */}
      <SkillSection allSkills={allSkills} deptFilter={deptFilter} />

      {/* Section D: ShoutOuts */}
      <ShoutOutSection allShoutOuts={allShoutOuts} deptFilter={deptFilter} />
    </div>
  );
}