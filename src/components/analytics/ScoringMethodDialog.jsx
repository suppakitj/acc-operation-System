import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, Clock, Info, Calculator, BarChart3 } from 'lucide-react';

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

          {/* Overview */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            <p className="text-[11px] text-indigo-700">
              <b>Overall Score</b> = E1 × W1 + E2 × W2 + E3 × W3 — น้ำหนัก (W) แตกต่างตาม Role<br/>
              ใช้ <b>original_due_date</b> (due date ตอนสร้างงานครั้งแรก) เป็นเกณฑ์ตัดสินตรงเวลา ไม่ใช่ due date ที่ถูกเลื่อน
            </p>
          </div>

          {/* E1 */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" /> E1: Execution — ทำครบ
            </h3>
            <p className="text-muted-foreground">วัดว่าพนักงานทำงานที่ได้รับมอบหมายครบหรือไม่</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><b className="text-foreground">Completion Rate</b> — งานเสร็จ ÷ งานทั้งหมด</li>
              <li><b className="text-foreground">Utilization</b> — ชั่วโมงทำงานจริง ÷ ชั่วโมงที่ควรทำ (sweet spot 70–95%)</li>
              <li><b className="text-foreground">Throughput vs Capacity</b> — งานเสร็จ ÷ ความจุที่คาดหวัง (default 10 tasks)</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5 mt-1">
              <p className="text-[10px] text-blue-700">
                <b>สูตรคำนวณ:</b> ถ้ามี Time Entry → Completion 60% + Utilization 25% + Throughput 15%<br/>
                ถ้าไม่มี Time Entry → Completion 75% + Throughput 25%
              </p>
            </div>
          </section>

          {/* E2 */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600" /> E2: Effectiveness — ไม่ผิดพลาด
            </h3>
            <p className="text-muted-foreground">วัดคุณภาพงาน — ส่งแล้วถูกต้องไหม (น้ำหนักมากที่สุด)</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><b className="text-foreground">Rework Rate</b> — สัดส่วนงานถูกตีกลับ (ยิ่งน้อยยิ่งดี)</li>
              <li><b className="text-foreground">First Time Right</b> — Approve ครั้งแรกโดยไม่เคยถูก Reject</li>
              <li><b className="text-foreground">Weighted Rework</b> — คะแนนถ่วงน้ำหนักตามความรุนแรง</li>
              <li><b className="text-foreground">Critical Finding Rate</b> — สัดส่วนงานที่มี finding ระดับ Critical</li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5 mt-1">
              <p className="text-[10px] text-green-700">
                <b>สูตรคำนวณ:</b> เริ่มต้น 100 แล้วหักตามปัจจัย:<br/>
                − Rework Rate × 100 (สูงสุด −35) − Avg Weighted Rework × 10 (สูงสุด −20)<br/>
                − Critical Finding Rate × 100 (สูงสุด −15) + First Time Right {'>'} 80% ได้ bonus +5
              </p>
            </div>
            <div className="mt-1.5">
              <p className="text-[10px] font-semibold mb-1">น้ำหนัก Rework ตาม Severity (จาก Reject Dialog):</p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-300">Minor = 0.5 pt</Badge>
                <Badge variant="outline" className="text-[9px] bg-yellow-50 text-yellow-700 border-yellow-300">Major = 1.0 pt</Badge>
                <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-300">Critical = 2.0 pt</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ทุกครั้งที่ Reviewer ส่งกลับ จะบันทึก severity + category ไว้ใน Submission Cycle
              </p>
            </div>
          </section>

          {/* E3 */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" /> E3: Efficiency — ตรงเวลา
            </h3>
            <p className="text-muted-foreground">วัดความตรงเวลาทั้ง Task และ Meeting Action Items</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><b className="text-foreground">On-Time Rate (Task)</b> — งานเสร็จก่อน/ตรง <code className="text-[9px] bg-muted px-1 rounded">original_due_date</code></li>
              <li><b className="text-foreground">Meeting Action On-Time</b> — action items ปิดก่อน/ตรง due date เดิม</li>
              <li><b className="text-foreground">Combined On-Time</b> — รวม Task + Meeting Action เข้าด้วยกัน (ใช้คิดคะแนน)</li>
              <li><b className="text-foreground">Avg Slippage</b> — เลื่อน due date ออกไปกี่วันโดยเฉลี่ย</li>
              <li><b className="text-foreground">Postpone Ratio</b> — กี่ % ของงานที่เลื่อน due date</li>
              <li><b className="text-foreground">Overdue Open</b> — งานค้างเกิน due date ที่ยังไม่เสร็จ</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
              <p className="text-[10px] text-amber-700">
                <b>สูตรคำนวณ:</b> เริ่มต้น 100 แล้วหักตามปัจจัย:<br/>
                − (1 − Combined On-Time Rate) × 70 (สูงสุด −50)<br/>
                − Avg Slippage × 4 (สูงสุด −20) − Postpone Ratio × 60 (สูงสุด −15)<br/>
                − Overdue Open × 3 (สูงสุด −15)
              </p>
            </div>
          </section>

          {/* Submission Cycles */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-purple-600" /> Submission Cycles (Review Tracking)
            </h3>
            <p className="text-muted-foreground">ทุกครั้งที่ส่งตรวจ → Approve/Reject จะถูกบันทึกเป็น 1 Cycle</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li>Cycle 1 ส่งแล้ว Approve ครั้งแรก → <b className="text-foreground">First Time Right = true</b></li>
              <li>Cycle 1 Reject → Cycle 2 ส่งใหม่ → Approve → <b className="text-foreground">rework_count = 1</b></li>
              <li>แต่ละ Reject บันทึก severity + category + turnaround time</li>
            </ul>
          </section>

          {/* Weight table */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-slate-600" /> น้ำหนักตาม Role
            </h3>
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