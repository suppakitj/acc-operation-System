import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MessageSquare } from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// ─── ข้อ 6: วิเคราะห์เหตุผลที่เลื่อนบ่อยสุด ───
export default function PostponeReasonChart({ postpones }) {
  const data = useMemo(() => {
    const map = {};
    postpones.forEach(p => {
      const reason = (p.reason || 'ไม่ระบุเหตุผล').trim();
      // Normalize by keywords
      const key = normalizeReason(reason);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [postpones]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600" /> เหตุผลที่เลื่อนบ่อย (Root Cause)
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground text-center py-8">ไม่มีข้อมูล</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-600" /> เหตุผลที่เลื่อนบ่อย (Root Cause)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => [`${v} ครั้ง`, 'จำนวน']} contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function normalizeReason(reason) {
  const r = reason.toLowerCase();
  if (r.includes('เอกสาร') || r.includes('ส่งเอกสาร') || r.includes('ข้อมูล')) return 'ลูกค้าส่งเอกสารไม่ครบ';
  if (r.includes('งานเร่ง') || r.includes('แทรก') || r.includes('ด่วน')) return 'งานเร่งแทรก';
  if (r.includes('ลูกค้า') && (r.includes('ยืนยัน') || r.includes('ตอบ'))) return 'รอลูกค้ายืนยัน';
  if (r.includes('ป่วย') || r.includes('ลา') || r.includes('หยุด')) return 'ลาป่วย/ลาหยุด';
  if (r.includes('ซับซ้อน') || r.includes('ยาก') || r.includes('เยอะ')) return 'งานซับซ้อนกว่าคาด';
  if (r.includes('ระบบ') || r.includes('peak') || r.includes('software')) return 'ปัญหาระบบ/Software';
  if (r.includes('ประเมิน') || r.includes('effort')) return 'ประเมิน effort ผิด';
  return reason.length > 30 ? reason.slice(0, 30) + '...' : reason;
}