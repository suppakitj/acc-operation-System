import React, { forwardRef } from 'react';

const fmtTHB = (n) => (n == null ? '—' : new Intl.NumberFormat('th-TH').format(Math.round(n)));

const Section = ({ title, children }) => (
  <div style={{ marginTop: 20 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #0f766e', paddingBottom: 4, marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const Tile = ({ label, value, sub }) => (
  <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
    <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    {sub && <div style={{ fontSize: 9, color: '#94a3b8' }}>{sub}</div>}
  </div>
);

const BoardReport = forwardRef(function BoardReport({ data, ai, meta }, ref) {
  const f = data.financial, o = data.operations, h = data.firmHealth;
  return (
    <div ref={ref} style={{ width: 794, background: '#ffffff', color: '#0f172a', fontFamily: "'Sarabun', 'Inter', sans-serif", padding: 32, boxSizing: 'border-box' }}>
      {/* Cover header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f766e', paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>ACC Consulting — KPI Report</div>
          <div style={{ fontSize: 13, color: '#475569' }}>{meta.title}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>งวด {data.period.from} → {data.period.to}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#0f766e' }}>{h.overall}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Firm Health / 100</div>
        </div>
      </div>

      {/* AI Executive Summary */}
      <Section title="บทสรุปผู้บริหาร (AI Executive Summary)">
        <div style={{ fontSize: 12, lineHeight: 1.6, color: '#1e293b' }}>{ai?.executive_summary}</div>
        {ai?.highlights?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', marginBottom: 4 }}>จุดเด่น (Highlights)</div>
            <ul style={{ fontSize: 11, margin: 0, paddingLeft: 18 }}>{ai.highlights.map((h, i) => <li key={i} style={{ marginBottom: 2 }}>{h}</li>)}</ul>
          </div>
        )}
        {ai?.concerns?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>ประเด็นเฝ้าระวัง (Concerns)</div>
            <ul style={{ fontSize: 11, margin: 0, paddingLeft: 18 }}>{ai.concerns.map((c, i) => <li key={i} style={{ marginBottom: 2 }}>{c}</li>)}</ul>
          </div>
        )}
      </Section>

      {/* Firm Health */}
      <Section title="Firm Health">
        <div style={{ display: 'flex', gap: 10 }}>
          <Tile label="Overall" value={`${h.overall}`} sub={h.prevOverall != null ? `เดิม ${h.prevOverall}` : ''} />
          <Tile label={`Operational (${Math.round(h.weights.operational * 100)}%)`} value={h.operational} />
          <Tile label={`Financial (${Math.round(h.weights.financial * 100)}%)`} value={h.financial} />
        </div>
      </Section>

      {/* Financial */}
      <Section title="การเงิน (Financial)">
        <div style={{ display: 'flex', gap: 10 }}>
          <Tile label="รายได้รวม" value={`฿${fmtTHB(f.totalRevenue)}`} sub={f.prevRevenue != null ? `เดิม ฿${fmtTHB(f.prevRevenue)}` : ''} />
          <Tile label="Revenue / FTE" value={`฿${fmtTHB(f.revenuePerFte)}`} />
          <Tile label="Gross Margin" value={f.grossMarginPct == null ? '—' : `${f.grossMarginPct}%`} />
          <Tile label="Cost Efficiency" value={f.costEfficiency == null ? '—' : `${f.costEfficiency}×`} />
        </div>
        {f.unattributedRevenue > 0 && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>* รายได้ที่ยังไม่ถูก attribute: ฿{fmtTHB(f.unattributedRevenue)}</div>}
      </Section>

      {/* Operations */}
      <Section title="ปฏิบัติการ (Operations)">
        <div style={{ display: 'flex', gap: 10 }}>
          <Tile label="งานเสร็จ" value={o.tasksCompleted} />
          <Tile label="On-Time" value={o.onTimeRate == null ? '—' : `${o.onTimeRate}%`} />
          <Tile label="ค้างเลยกำหนด" value={o.overdueOpen} />
          <Tile label="Rework" value={o.reworkTasks} />
          <Tile label="Critical Findings" value={o.criticalFindings} />
          <Tile label="ชม.รวม" value={o.totalHours} />
        </div>
      </Section>

      {/* Team */}
      <Section title="ผลงานทีม (Top / Bottom)">
        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Top 5</div>
            {data.team.top.map((p, i) => <div key={i}>{i + 1}. {p.name} — {p.score} ({p.grade})</div>)}
            {data.team.top.length === 0 && <div style={{ color: '#94a3b8' }}>ไม่มีข้อมูลเพียงพอ</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>ต้องการการสนับสนุน</div>
            {data.team.bottom.map((p, i) => <div key={i}>{p.name} — {p.score} ({p.grade})</div>)}
            {data.team.bottom.length === 0 && <div style={{ color: '#94a3b8' }}>ไม่มีข้อมูลเพียงพอ</div>}
          </div>
        </div>
      </Section>

      {/* Attention */}
      {data.attention.count > 0 && (
        <Section title={`ประเด็นต้องติดตาม (${data.attention.count})`}>
          <div style={{ fontSize: 11 }}>
            {data.attention.items.map((a, i) => <div key={i} style={{ marginBottom: 3 }}>• <b>{a.name}</b>: {a.reason} → {a.action}</div>)}
          </div>
        </Section>
      )}

      {/* AI Recommendations */}
      {ai?.recommendations?.length > 0 && (
        <Section title="ข้อเสนอแนะเชิงกลยุทธ์ (AI)">
          <ol style={{ fontSize: 11, paddingLeft: 18, margin: 0 }}>{ai.recommendations.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}</ol>
        </Section>
      )}

      {/* Risk flags */}
      {ai?.risk_flags?.length > 0 && (
        <Section title="ความเสี่ยงเร่งด่วน">
          <ul style={{ fontSize: 11, paddingLeft: 18, margin: 0, color: '#dc2626' }}>{ai.risk_flags.map((r, i) => <li key={i} style={{ marginBottom: 2 }}>{r}</li>)}</ul>
        </Section>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 9, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
        <span>ข้อมูลลับ — สำหรับผู้บริหารเท่านั้น (Confidential)</span>
        <span>สร้างโดย {meta.viewerName} · {meta.generatedAt}</span>
      </div>
    </div>
  );
});

export default BoardReport;