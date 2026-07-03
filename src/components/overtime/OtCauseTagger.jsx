import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const CAUSES = [
  ['client_late', 'ลูกค้าส่งช้า'],
  ['rework', 'แก้งานซ้ำ'],
  ['deadline_peak', 'peak ตามกำหนด'],
  ['under_resourced', 'คนไม่พอ'],
  ['adhoc', 'งานแทรก'],
  ['other', 'อื่นๆ'],
];

export default function OtCauseTagger({ entries, onTagged }) {
  const [busy, setBusy] = useState(false);

  const tag = async (e, code) => {
    setBusy(true);
    try { await base44.entities.OvertimeEntry.update(e.id, { cause_code: code }); } catch (_) {}
    await onTagged();
    setBusy(false);
  };

  if (!entries.length) return <p className="text-sm text-muted-foreground">แท็กครบแล้ว ✅</p>;

  return (
    <div className="space-y-1 max-h-[300px] overflow-auto">
      {entries.slice(0, 40).map((e) => (
        <div key={e.id} className="flex items-center gap-2 text-xs border-b py-1">
          <span className="w-20 shrink-0 text-muted-foreground">{e.ot_date}</span>
          <span className="flex-1 truncate">{e.user_name} · {e.task_description}</span>
          <select
            disabled={busy}
            onChange={(ev) => ev.target.value && tag(e, ev.target.value)}
            className="h-7 rounded border text-xs bg-background"
          >
            <option value="">— แท็ก —</option>
            {CAUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      ))}
      {entries.length > 40 && <p className="text-[11px] text-muted-foreground">แสดง 40 จาก {entries.length} รายการ</p>}
    </div>
  );
}