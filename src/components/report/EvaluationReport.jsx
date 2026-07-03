import React, { forwardRef } from 'react';

const Row = ({ label, children }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #0f766e', paddingBottom: 3, marginBottom: 8 }}>{label}</div>
    {children}
  </div>
);

const Bullets = ({ items, empty }) => (
  items?.length
    ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.6 }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    : <div style={{ fontSize: 11, color: '#94a3b8' }}>{empty || '—'}</div>
);

const EvaluationReport = forwardRef(function EvaluationReport({ staff, period, scorecard, insights, meta }, ref) {
  const d = scorecard.dimensions;
  return (
    <div ref={ref} style={{ width: 794, background: '#fff', color: '#0f172a', fontFamily: 'Sarabun, sans-serif', padding: 32, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f766e', paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>แบบประเมินผลการปฏิบัติงาน</div>
          <div style={{ fontSize: 13, color: '#334155' }}>{staff.name} · {staff.position || staff.role}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>งวด {period.from} → {period.to}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0f766e' }}>{scorecard.overall}</div>
          <div style={{ fontSize: 11 }}>เกรด {scorecard.grade.letter} · {scorecard.grade.label}</div>
          {insights.rank && <div style={{ fontSize: 10, color: '#64748b' }}>อันดับ #{insights.rank.rank} จาก {insights.rank.of}</div>}
        </div>
      </div>

      <Row label="สรุปการประเมิน">
        <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>E1 Execution<br /><b style={{ fontSize: 18 }}>{d.execution.score}</b></div>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>E2 Effectiveness<br /><b style={{ fontSize: 18 }}>{d.effectiveness.score}</b></div>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>E3 Efficiency<br /><b style={{ fontSize: 18 }}>{d.efficiency.score}</b></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          <b>ข้อเสนอ:</b> {insights.recommendedAction} · <b>สัญญาณค่าตอบแทน:</b> {insights.compensationSignal}
        </div>
      </Row>

      <Row label="จุดแข็ง"><Bullets items={insights.strengths} empty="—" /></Row>
      <Row label="ประเด็นพัฒนา"><Bullets items={insights.development} empty="ไม่มีประเด็นเด่น" /></Row>
      <Row label="แนวทางโค้ช"><Bullets items={insights.coaching} /></Row>

      <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 9, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
        <span>ข้อมูลลับด้านบุคคล — ใช้ประกอบการพิจารณาภายในเท่านั้น (Confidential HR)</span>
        <span>ประเมินโดย {meta.viewerName} · {meta.generatedAt}</span>
      </div>
    </div>
  );
});

export default EvaluationReport;