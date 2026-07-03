import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function PayrollMappingPanel({ entries = [], previewEntries, users, onMapped }) {
  const [busy, setBusy] = useState(false);

  const mapped = useMemo(() => new Set(
    users.map((u) => String(u.payroll_code || '').trim()).filter(Boolean)
  ), [users]);

  const codeList = useMemo(() => {
    const m = {};
    [...entries, ...(previewEntries || [])].forEach((e) => {
      if (e.employee_code && !m[e.employee_code]) m[e.employee_code] = e.user_name;
    });
    return Object.entries(m)
      .map(([code, name]) => ({ code, name }))
      .filter((c) => !mapped.has(c.code));
  }, [entries, previewEntries, mapped]);

  const assign = async (code, userId) => {
    if (!userId) return;
    setBusy(true);
    try { await base44.entities.User.update(userId, { payroll_code: code }); } catch (_) {}
    await onMapped();
    setBusy(false);
  };

  if (!codeList.length) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-amber-700">
          <AlertTriangle className="w-4 h-4" /> จับคู่รหัสพนักงาน ({codeList.length} รอ)
        </div>
        <p className="text-xs text-muted-foreground">
          รหัสจากโปรแกรมเงินเดือนที่ยังไม่ผูกกับ User — เลือกพนักงานให้ตรงกับชื่อ แล้วระบบจะจดจำถาวร
        </p>
        {codeList.map((c) => (
          <div key={c.code} className="flex items-center gap-2 text-sm border-b py-1.5">
            <span className="font-mono w-16">{c.code}</span>
            <span className="flex-1 truncate">{c.name}</span>
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => assign(c.code, e.target.value)}
              className="h-8 rounded border text-xs bg-background min-w-[200px]"
            >
              <option value="">— เลือก User —</option>
              {users.filter((u) => u.user_status !== 'inactive').map((u) => (
                <option key={u.id} value={u.id}>{u.nickname || u.full_name} · {u.employee_id}</option>
              ))}
            </select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}