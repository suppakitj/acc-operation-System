import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

function formatDuration(mins) {
  if (!mins) return '0 น.';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m > 0 ? `${m} น.` : ''}`;
}

const SERVICE_MAP = {
  accounting: 'ทำบัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบ',
  peak_licensing: 'Peak',
};

export default function CustomerTimeBreakdown({ timeEntries }) {
  const byService = useMemo(() => {
    const map = {};
    timeEntries.forEach(e => {
      const svc = e.service_type || 'other';
      if (!map[svc]) map[svc] = { minutes: 0, count: 0 };
      map[svc].minutes += e.duration_minutes || 0;
      map[svc].count++;
    });
    return Object.entries(map).sort((a, b) => b[1].minutes - a[1].minutes);
  }, [timeEntries]);

  const byEmployee = useMemo(() => {
    const map = {};
    timeEntries.forEach(e => {
      const key = e.user_email || 'unknown';
      if (!map[key]) map[key] = { name: e.user_name || key.split('@')[0], minutes: 0, count: 0 };
      map[key].minutes += e.duration_minutes || 0;
      map[key].count++;
    });
    return Object.entries(map).sort((a, b) => b[1].minutes - a[1].minutes);
  }, [timeEntries]);

  if (timeEntries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูลเวลา</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* By Service */}
      <div>
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">ตามประเภทบริการ</h4>
        <div className="space-y-1.5">
          {byService.map(([svc, data]) => (
            <div key={svc} className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-lg">
              <span className="text-xs font-medium">{SERVICE_MAP[svc] || svc}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px]">{data.count} entries</Badge>
                <span className="text-xs font-semibold">{formatDuration(data.minutes)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Employee */}
      <div>
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">ตามพนักงาน</h4>
        <div className="space-y-1.5">
          {byEmployee.map(([email, data]) => (
            <div key={email} className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-lg">
              <span className="text-xs font-medium">{data.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px]">{data.count} entries</Badge>
                <span className="text-xs font-semibold">{formatDuration(data.minutes)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}