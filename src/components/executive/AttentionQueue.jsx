import React from 'react';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';

const DOT = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-sky-500' };
const TYPE_TH = { performance_drop: 'ผลงานตก', burnout_risk: 'เสี่ยง burnout', overdue_pileup: 'งานค้างเลยกำหนด', quality_slip: 'คุณภาพลดลง', overtime_burnout: 'OT/วันหยุดสูง' };

export default function AttentionQueue({ flags }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h2 className="text-lg font-semibold">ต้องให้ความสนใจ ({flags.length})</h2>
      </div>
      {flags.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีสัญญาณเตือนในงวดนี้ — ทีมอยู่ในเกณฑ์ดี ✅</p>}
      <div className="space-y-2">
        {flags.map((f, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[f.severity]}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{f.name} <span className="text-xs text-muted-foreground">· {TYPE_TH[f.type] || f.type}</span></div>
              <div className="text-xs text-muted-foreground truncate">{f.reason}</div>
              <div className="text-xs text-foreground/80 mt-0.5">→ {f.action}</div>
            </div>
            <Link to={`/StaffScorecard?email=${encodeURIComponent(f.email)}`} className="text-xs text-primary flex items-center shrink-0">
              Scorecard <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}