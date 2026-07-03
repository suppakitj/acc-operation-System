import React from 'react';
import { LayoutPanelTop } from 'lucide-react';

export default function ExecutiveBI() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <LayoutPanelTop className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h2 className="text-lg font-semibold">Executive BI Cockpit</h2>
      <p className="text-sm text-muted-foreground mt-1">หน้านี้จะเปิดใช้งานใน Phase 2</p>
    </div>
  );
}