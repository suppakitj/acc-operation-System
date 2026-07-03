/**
 * Composite Firm Health Score = operational (mean 3E) + financial.
 */
import { rankTeam3E } from './staffKpi';
import { computeFinancialKpis } from './revenueAttribution';

const clamp = (v) => Math.max(0, Math.min(100, v));

function scoreFinancial(fin, targets = {}) {
  const rpfTarget = targets.revenue_per_fte_target || fin.revenuePerFte || 1;
  const gmTarget  = targets.gross_margin_target_pct || 40;
  const ceTarget  = targets.cost_efficiency_target || 2.0;
  const rpfScore = clamp((fin.revenuePerFte / rpfTarget) * 100);
  const gmScore  = fin.grossMarginPct == null ? 60 : clamp((fin.grossMarginPct / gmTarget) * 100);
  const ceScore  = fin.costEfficiency == null ? 60 : clamp((fin.costEfficiency / ceTarget) * 100);
  return { score: Math.round(rpfScore * 0.4 + gmScore * 0.35 + ceScore * 0.25), rpfScore, gmScore, ceScore };
}

export function computeFirmHealth({ users, tasks, timeEntries, meetingNotes, billings, from, to, config }) {
  const ranked = rankTeam3E({ users, tasks, timeEntries, meetingNotes, from, to });
  const qualified = ranked.filter((r) => r.has_sufficient_data);
  const avg3E = qualified.length ? Math.round(qualified.reduce((s, r) => s + r.overall, 0) / qualified.length) : 0;

  const fin = computeFinancialKpis({ users, billings, timeEntries, from, to });
  const finScore = scoreFinancial(fin, config?.firm_health_targets);

  const w3e = config?.firm_health_weight_3e ?? 0.65;
  const wFin = 1 - w3e;
  const overall = Math.round(avg3E * w3e + finScore.score * wFin);

  return {
    overall,
    components: { operational: avg3E, financial: finScore.score },
    weights: { operational: w3e, financial: wFin },
    financial: fin,
    financialDetail: finScore,
    ranked,
    coverage: { scored: qualified.length, total: ranked.length },
  };
}