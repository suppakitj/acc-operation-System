import React from 'react';
import { FileBarChart2 } from 'lucide-react';

export default function KpiReportCenter() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileBarChart2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h2 className="text-lg font-semibold">KPI Report Center</h2>
      <p className="text-sm text-muted-foreground mt-1">หน้านี้จะเปิดใช้งานใน Phase 3</p>
    </div>
  );
}