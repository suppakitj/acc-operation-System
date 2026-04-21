import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Tag } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6'];

const CATEGORY_LABELS = {
  typo_format: 'Typo / Format',
  missing_document: 'Missing Document',
  calculation_error: 'Calculation Error',
  wrong_entry: 'Wrong Entry',
  wrong_standard: 'Wrong Standard',
  missing_disclosure: 'Missing Disclosure',
  tax_position_error: 'Tax Position Error',
  client_data_issue: 'Client Data Issue',
  other: 'อื่นๆ',
};

export default function ReworkCategoryChart({ rejections }) {
  const data = useMemo(() => {
    const map = {};
    rejections.forEach(r => {
      const cat = r.category || 'other';
      if (!map[cat]) map[cat] = { category: CATEGORY_LABELS[cat] || cat, count: 0, minor: 0, major: 0, critical: 0 };
      map[cat].count++;
      const sev = r.severity || 'major';
      if (map[cat][sev] !== undefined) map[cat][sev]++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [rejections]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-600" />
          ประเภทปัญหาที่ถูกส่งกลับ
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">ใช้ระบุหัวข้ออบรม — ปัญหาที่เกิดซ้ำบ่อยควรจัดคอร์ส</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v, name) => [v, 'ครั้ง']}
                  labelFormatter={(l) => l}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border rounded-lg shadow px-3 py-2 text-xs">
                        <p className="font-semibold">{d.category}</p>
                        <p>ทั้งหมด: {d.count} ครั้ง</p>
                        <p className="text-red-600">Critical: {d.critical}</p>
                        <p className="text-yellow-600">Major: {d.major}</p>
                        <p className="text-green-600">Minor: {d.minor}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}