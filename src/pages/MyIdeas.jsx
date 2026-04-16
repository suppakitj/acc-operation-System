import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lightbulb } from 'lucide-react';
import IdeaBox from '../components/my-day/IdeaBox';

export default function MyIdeas() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!currentUser) return null;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-500" />
          กล่องไอเดีย
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          เสนอไอเดียหรือข้อเสนอแนะเพื่อปรับปรุงการทำงาน
        </p>
      </div>
      <IdeaBox currentUser={currentUser} />
    </div>
  );
}