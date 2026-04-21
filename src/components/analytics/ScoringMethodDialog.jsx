import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, Clock, Info } from 'lucide-react';

const WEIGHT_TABLE = [
  { role: 'Staff', e1: 30, e2: 45, e3: 25 },
  { role: 'Super Supervisor', e1: 25, e2: 45, e3: 30 },
  { role: 'Manager', e1: 20, e2: 50, e3: 30 },
  { role: 'Management / Admin', e1: 15, e2: 55, e3: 30 },
];

const GRADES = [
  { range: '90+', letter: 'A+', label: 'Outstanding', cls: 'bg-emerald-100 text-emerald-700' },
  { range: '80–89', letter: 'A', label: 'Excellent', cls: 'bg-green-100 text-green-700' },
  { range: '70–79', letter: 'B', label: 'Good', cls: 'bg-blue-100 text-blue-700' },
  { range: '60–69', letter: 'C', label: 'Fair', cls: 'bg-amber-100 text-amber-700' },
  { range: '50–59', letter: 'D', label: 'Below expectations', cls: 'bg-orange-100 text-orange-700' },
  { range: '< 50', letter: 'F', label: 'Unsatisfactory', cls: 'bg-red-100 text-red-700' },
];

export default function ScoringMethodDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-indigo-600" />
            วิธีวัดผล — 3E Execution Framework
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">

          {/* E1 */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" /> E1: Execution — ทำครบ
            </h3>
            <p className="text-muted-foreground">วัดว่าพนักงานทำงานที่ได้รับมอบหมายครบหรือไม่</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><b className="text-foreground">Completion Rate</b> — สัดส่วนงานเสร็จ vs งานทั้งหมด</li>
              <li><b className="text-foreground">Utilization</b> — ชั่วโมงทำงานจริง vs ที่ควรทำ (sweet spot 70-95%)</li>
              <li><b className="text-foreground">Throughput vs Capacity</b> — จำนวนงานเสร็จ vs ความจุที่คาดหวัง</li>
            </ul>
          </section>

          {/* E2 */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600" /> E2: Effectiveness — ไม่ผิดพลาด
            </h3>
            <p className="text-muted-foreground">วัดคุณภาพงาน — ส่งแล้วถูกต้องไหม (น้ำหนักมากที่สุด)</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><b className="text-foreground">Rework Rate</b> — สัดส่วนงานถูกตีกลับแก้ไข (ยิ่งน้อยยิ่งดี)</li>
              <li><b className="text-foreground">First Time Right</b> — ส่งครั้งแรกผ่านเลย (bonus ถ้า {'>'} 80%)</li>
              <li><b className="text-foreground">Weighted Rework</b> — ถ้าแก้เรื่อง critical จะหักมากกว่าเรื่องเล็กน้อย</li>
              <li><b className="text-foreground">Critical Finding Rate</b> — สัดส่วนงานที่มี finding ร้ายแรง</li>
            </ul>
          </section>

          {/* E3 */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" /> E3: Efficiency — ตรงเวลา
            </h3>
            <p className="text-muted-foreground">วัดความตรงเวลาทั้ง Task และ Meeting Action Items</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><b className="text-foreground">On-Time Rate</b> — สัดส่วนงานเสร็จก่อน/ตรง due date เดิม</li>
              <li><b className="text-foreground">Avg Slippage</b> — เลื่อน due date ออกไปกี่วันโดยเฉลี่ย</li>
              <li><b className="text-foreground">Postpone Ratio</b> — กี่ % ของงานที่เลื่อน due date</li>
              <li><b className="text-foreground">Overdue Open</b> — งานค้างเกิน due date ที่ยังไม่เสร็จ</li>
              <li><b className="text-foreground">Meeting Action On-Time</b> — action items จาก Meeting Notes ตรงเวลาไหม</li>
            </ul>
          </section>

          {/* Weight table */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm">น้ำหนักตาม Role</h3>
            <p className="text-muted-foreground">ยิ่งตำแหน่งสูง → คุณภาพ (E2) ยิ่งมีน้ำหนักมาก</p>
            <table className="w-full border text-[11px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-2 py-1.5 text-left border-b">Role</th>
                  <th className="px-2 py-1.5 text-center border-b text-blue-600">E1</th>
                  <th className="px-2 py-1.5 text-center border-b text-green-600">E2</th>
                  <th className="px-2 py-1.5 text-center border-b text-amber-600">E3</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHT_TABLE.map(r => (
                  <tr key={r.role} className="border-b">
                    <td className="px-2 py-1">{r.role}</td>
                    <td className="px-2 py-1 text-center">{r.e1}%</td>
                    <td className="px-2 py-1 text-center">{r.e2}%</td>
                    <td className="px-2 py-1 text-center">{r.e3}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Grades */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm">เกณฑ์ตัดเกรด</h3>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map(g => (
                <Badge key={g.letter} variant="outline" className={`${g.cls} text-[10px]`}>
                  {g.letter} ({g.range}) — {g.label}
                </Badge>
              ))}
            </div>
          </section>

          {/* Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-[11px] text-amber-700">⚠️ ถ้ามีงานน้อยกว่า 5 รายการในช่วงเวลาที่เลือก คะแนนจะเป็น indicative เท่านั้น</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}