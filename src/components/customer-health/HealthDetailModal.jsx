import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GRADE_CONFIG, getRecommendations } from '@/lib/customerHealth';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { AlertTriangle, Info } from 'lucide-react';

const GRADE_BADGE = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-teal-100 text-teal-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
};

const BAR_COLOR = {
  high: 'bg-green-500',
  mid: 'bg-yellow-500',
  low: 'bg-red-500',
};

function DimBar({ label, score, max }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color = pct >= 70 ? BAR_COLOR.high : pct >= 40 ? BAR_COLOR.mid : BAR_COLOR.low;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-bold">{score}/{max} pts</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function HealthDetailModal({ customer, tasks, open, onOpenChange }) {
  const h = customer?.health;

  const recentTasks = useMemo(() => {
    if (!customer) return [];
    return tasks
      .filter(t => t.customer_id === customer.id)
      .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
      .slice(0, 10);
  }, [tasks, customer?.id]);

  if (!customer || !h || h.score === null) return null;

  const grade = h.grade;
  const cfg = GRADE_CONFIG[grade] || {};
  const recommendations = getRecommendations(h);

  const getDeliveryStatus = (task) => {
    if (task.status !== 'completed' || !task.completed_date) return null;
    if (!task.due_date) return { label: 'เสร็จ', color: 'text-green-600' };
    const due = task.due_date.slice(0, 10);
    const done = task.completed_date.slice(0, 10);
    if (done <= due) return { label: 'ตรงเวลา', color: 'text-green-600' };
    const diff = Math.ceil((new Date(done) - new Date(due)) / (1000 * 60 * 60 * 24));
    return { label: `สาย ${diff} วัน`, color: 'text-red-600' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">{customer.company_name}</DialogTitle>
            <Badge className={cn("text-xs px-2 py-0.5 border-0 font-bold", GRADE_BADGE[grade])}>
              Grade {grade}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{customer.customer_code} — {cfg.description}</p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Score */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
            <div className="text-center">
              <p className="text-4xl font-black">{h.score}</p>
              <p className="text-[10px] text-muted-foreground">/ 100</p>
            </div>
            <div className="flex-1 space-y-2">
              <DimBar label="On-Time Delivery" score={h.dim1_ontime} max={40} />
              <DimBar label="Due Date Stability" score={h.dim2_stability} max={30} />
              <DimBar label="Time Efficiency" score={h.dim3_efficiency} max={30} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-lg font-bold">{h.onTimeRate}%</p>
              <p className="text-[10px] text-muted-foreground">On-Time Rate</p>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-lg font-bold">{h.avgDueDateChanges}</p>
              <p className="text-[10px] text-muted-foreground">Avg เลื่อน Due/งาน</p>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-lg font-bold">{h.avgHoursPerTask} ชม.</p>
              <p className="text-[10px] text-muted-foreground">Avg ชม./งาน</p>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-1.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">คำแนะนำ</span>
              </div>
              {recommendations.map((r, i) => (
                <p key={i} className="text-xs text-amber-800">{r}</p>
              ))}
            </div>
          )}
          {recommendations.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Info className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">ลูกค้ามี Health Score ดี ไม่มีจุดที่ต้องปรับปรุงตอนนี้</span>
            </div>
          )}

          {/* Recent Tasks */}
          <div>
            <h3 className="text-sm font-semibold mb-2">10 งานล่าสุด</h3>
            {recentTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">ไม่มีข้อมูล</p>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">งาน</th>
                      <th className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">กำหนดส่ง</th>
                      <th className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">เสร็จ</th>
                      <th className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">ผล</th>
                      <th className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">เลื่อน Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map(t => {
                      const delivery = getDeliveryStatus(t);
                      return (
                        <tr key={t.id} className="border-b last:border-b-0">
                          <td className="px-2 py-1.5 text-[11px] font-medium max-w-[200px] truncate">{t.title}</td>
                          <td className="px-2 py-1.5 text-[10px] text-muted-foreground">
                            {t.due_date ? format(new Date(t.due_date), 'd MMM yy', { locale: th }) : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-muted-foreground">
                            {t.completed_date ? format(new Date(t.completed_date), 'd MMM yy', { locale: th }) : '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            {delivery ? (
                              <span className={cn("text-[10px] font-medium", delivery.color)}>{delivery.label}</span>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{t.status}</Badge>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-center">{t.due_date_change_count || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}