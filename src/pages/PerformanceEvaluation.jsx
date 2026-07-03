import React from 'react';
import { UserCheck } from 'lucide-react';

export default function PerformanceEvaluation() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <UserCheck className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h2 className="text-lg font-semibold">Performance Evaluation</h2>
      <p className="text-sm text-muted-foreground mt-1">หน้านี้จะเปิดใช้งานใน Phase 4</p>
    </div>
  );
}