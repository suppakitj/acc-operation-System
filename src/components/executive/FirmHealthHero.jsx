import React from 'react';
import { Card } from '@/components/ui/card';
import { gradeOverall } from '@/utils/staffKpi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GRADE_BG = {
  emerald: 'from-emerald-500 to-emerald-600', green: 'from-green-500 to-green-600',
  blue: 'from-blue-500 to-blue-600', amber: 'from-amber-500 to-amber-600',
  orange: 'from-orange-500 to-orange-600', red: 'from-red-500 to-red-600',
};

export default function FirmHealthHero({ health, prev, trend, periodLabel, compareLabel }) {
  const grade = gradeOverall(health.overall);
  const delta = prev ? health.overall - prev.overall : null;
  const bg = GRADE_BG[grade.color] || GRADE_BG.blue;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Score card */}
      <Card className={`lg:col-span-2 bg-gradient-to-br ${bg} text-white p-6 relative overflow-hidden`}>
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-90">Firm Health Score</p>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-6xl font-bold leading-none">{health.overall}</span>
            <span className="text-lg opacity-80 mb-1">/ 100</span>
          </div>
          <div className="text-lg font-semibold mt-1">{grade.letter} — {grade.label}</div>
          {delta !== null && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              {delta > 0 ? <TrendingUp className="w-4 h-4" /> : delta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              <span>{delta > 0 ? '+' : ''}{delta} จุด</span>
              {compareLabel && <span className="opacity-70">vs {compareLabel}</span>}
            </div>
          )}
        </div>
        {/* Background circle decoration */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10" />
      </Card>

      {/* Components + Trend */}
      <Card className="lg:col-span-3 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          {/* Sub-scores */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">องค์ประกอบ</p>
            <ScoreBar label="Operational (3E)" value={health.components.operational} weight={health.weights.operational} color="bg-blue-500" />
            <ScoreBar label="Financial" value={health.components.financial} weight={health.weights.financial} color="bg-emerald-500" />
            <div className="text-xs text-muted-foreground mt-2">
              ทีมที่มีข้อมูลเพียงพอ: {health.coverage.scored} / {health.coverage.total} คน
            </div>
          </div>

          {/* Trend chart */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">แนวโน้ม 6 งวด</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trend}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                <Tooltip formatter={(v) => [`${v} คะแนน`, 'Health']} />
                <ReferenceLine y={70} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ScoreBar({ label, value, weight, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value} <span className="text-xs text-muted-foreground font-normal">({Math.round(weight * 100)}%)</span></span>
      </div>
      <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}