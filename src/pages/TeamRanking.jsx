import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Shield } from 'lucide-react';
import TeamRanking3E from '@/components/analytics/TeamRanking3E';

const DEPARTMENTS = [
  { value: 'all', label: 'ทุกแผนก' },
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

export default function TeamRanking() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const role = currentUser?.role || '';
  const isAdmin = role === 'admin' || role === 'management';
  const isManager = role === 'manager' || role === 'super_supervisor';

  const myDepts = currentUser?.departments?.length ? currentUser.departments : currentUser?.department ? [currentUser.department] : [];
  const defaultDept = isAdmin ? 'all' : (myDepts[0] || 'all');
  const [dept, setDept] = useState(defaultDept);

  // Staff cannot access
  if (currentUser && !isAdmin && !isManager) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  const availableDepts = isAdmin ? DEPARTMENTS : DEPARTMENTS.filter(d => d.value === 'all' || myDepts.includes(d.value));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-600" />
            Team Performance Ranking
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">3E Execution Framework — เปรียบเทียบผลงานทีม</p>
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableDepts.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <TeamRanking3E department={dept === 'all' ? undefined : dept} />
    </div>
  );
}