import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GraduationCap } from 'lucide-react';
import SkillMap from '../components/my-day/SkillMap';

export default function MySkills() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!currentUser) return null;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-purple-600" />
          ทักษะของฉัน
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          บันทึกทักษะปัจจุบันและเป้าหมายที่อยากพัฒนา
        </p>
      </div>
      <SkillMap currentUser={currentUser} />
    </div>
  );
}