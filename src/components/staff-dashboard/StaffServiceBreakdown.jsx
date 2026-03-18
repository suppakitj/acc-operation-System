import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SERVICE_LABELS = {
  accounting: 'ทำบัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบ',
  peak_licensing: 'Peak',
  other: 'อื่นๆ',
};

const COLORS = ['hsl(217, 55%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)', 'hsl(200, 70%, 50%)'];

export default function StaffServiceBreakdown({ byService }) {
  const data = Object.entries(byService).map(([key, value]) => ({
    name: SERVICE_LABELS[key] || key,
    value,
  }));

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">ไม่มีข้อมูลประเภทงาน</div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <h4 className="text-xs font-semibold mb-3">ประเภทงาน</h4>
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={40} innerRadius={20} strokeWidth={1}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} งาน`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[11px] flex-1 truncate">{d.name}</span>
              <span className="text-[11px] font-semibold">{d.value}</span>
              <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}