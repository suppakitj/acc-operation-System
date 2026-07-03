import React from 'react';
import { Card } from '@/components/ui/card';
import ScoreGradeBadge from '@/components/analytics/ScoreGradeBadge';
import { Trophy, HeartHandshake } from 'lucide-react';

export default function PerformerLeaderboard({ ranked }) {
  const qualified = ranked.filter((r) => r.has_sufficient_data);
  const top5 = qualified.slice(0, 5);
  const bottom5 = qualified.length > 5 ? qualified.slice(-5).reverse() : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top 5 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold">Top 5 Performers</h3>
        </div>
        <div className="space-y-2">
          {top5.map((r, i) => (
            <Row key={r.user.email} rank={i + 1} r={r} />
          ))}
          {top5.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเพียงพอ</p>}
        </div>
      </Card>

      {/* Bottom 5 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <HeartHandshake className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold">ต้องการการสนับสนุน</h3>
        </div>
        <div className="space-y-2">
          {bottom5.map((r, i) => (
            <Row key={r.user.email} rank={qualified.length - bottom5.length + i + 1} r={r} />
          ))}
          {bottom5.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเพียงพอ</p>}
        </div>
      </Card>
    </div>
  );
}

function Row({ rank, r }) {
  const e1 = r.dimensions.execution.score;
  const e2 = r.dimensions.effectiveness.score;
  const e3 = r.dimensions.efficiency.score;
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{r.user.nickname || r.user.full_name || r.user.email}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground">E1:{e1}</span>
          <span className="text-[11px] text-muted-foreground">E2:{e2}</span>
          <span className="text-[11px] text-muted-foreground">E3:{e3}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold">{r.overall}</span>
        <ScoreGradeBadge grade={r.grade} />
      </div>
    </div>
  );
}