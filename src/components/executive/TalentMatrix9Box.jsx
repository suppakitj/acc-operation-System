import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';

const CELL_STYLE = {
  emerald: 'bg-emerald-50 border-emerald-200', green: 'bg-green-50 border-green-200', teal: 'bg-teal-50 border-teal-200',
  blue: 'bg-blue-50 border-blue-200', sky: 'bg-sky-50 border-sky-200', cyan: 'bg-cyan-50 border-cyan-200',
  amber: 'bg-amber-50 border-amber-200', orange: 'bg-orange-50 border-orange-200', red: 'bg-red-50 border-red-200',
};

const LABELS = {
  '2-0': 'Trusted Pro', '2-1': 'High Performer', '2-2': 'Star',
  '1-0': 'Effective', '1-1': 'Core Player', '1-2': 'High Potential',
  '0-0': 'Underperformer', '0-1': 'Inconsistent', '0-2': 'Raw Talent',
};
const COLORS = {
  '2-0': 'teal', '2-1': 'green', '2-2': 'emerald',
  '1-0': 'cyan', '1-1': 'sky', '1-2': 'blue',
  '0-0': 'red', '0-1': 'orange', '0-2': 'amber',
};

export default function TalentMatrix9Box({ matrix }) {
  const [sel, setSel] = useState(null);
  const band = (v) => (v >= 80 ? 2 : v >= 60 ? 1 : 0);

  const buckets = {};
  matrix.filter((m) => m.has_sufficient_data).forEach((m) => {
    const key = `${band(m.performance)}-${band(m.potential)}`;
    (buckets[key] = buckets[key] || []).push(m);
  });

  // Rows top→bottom = performance 2,1,0; cols left→right = potential 0,1,2
  const rows = [2, 1, 0];
  const cols = [0, 1, 2];
  const PERF_LABEL = { 2: 'สูง', 1: 'กลาง', 0: 'ต่ำ' };
  const POT_LABEL = { 0: 'ต่ำ', 1: 'กลาง', 2: 'สูง' };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Talent Matrix — 9-Box</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="w-3 h-3" /> ข้อมูลลับ · ผู้บริหารเท่านั้น</span>
      </div>

      <div className="flex gap-1">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center w-8 shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Performance ↑</span>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid grid-cols-3 gap-2">
            {rows.map((pr) => cols.map((po) => {
              const key = `${pr}-${po}`;
              const cell = buckets[key] || [];
              const label = LABELS[key];
              const color = COLORS[key];
              return (
                <div key={key} className={`rounded-lg border p-2.5 min-h-[100px] ${CELL_STYLE[color]}`}>
                  <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1.5">{label}</div>
                  <div className="flex flex-wrap gap-1">
                    {cell.map((m) => (
                      <button key={m.user.email} onClick={() => setSel(m)}
                        className="px-1.5 py-0.5 rounded-md bg-white/70 border text-[11px] hover:bg-white transition-colors">
                        {m.user.nickname || m.user.full_name || m.user.email}
                      </button>
                    ))}
                    {cell.length === 0 && <span className="text-[10px] opacity-40">—</span>}
                  </div>
                </div>
              );
            }))}
          </div>

          {/* X-axis labels */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            {cols.map((po) => (
              <div key={po} className="text-center text-[10px] text-muted-foreground">{POT_LABEL[po]}</div>
            ))}
          </div>
          <div className="text-center text-[11px] text-muted-foreground mt-0.5">Potential → (tenure · skills · learning · engagement)</div>
        </div>
      </div>

      {sel && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="font-semibold">{sel.user.nickname || sel.user.full_name} · {sel.box.th} ({sel.box.label})</div>
          <div className="text-muted-foreground mt-1">Performance {sel.performance} · Potential {sel.potential}</div>
          <div className="text-xs mt-1">
            Tenure {sel.potentialBreakdown.tenure} · Skills {sel.potentialBreakdown.skills} · Learning {sel.potentialBreakdown.learning_velocity} · Engagement {sel.potentialBreakdown.engagement}
          </div>
          <div className="text-xs mt-2"><b>แนวทาง:</b> {sel.box.action}</div>
        </div>
      )}
    </Card>
  );
}