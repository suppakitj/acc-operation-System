import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { th } from 'date-fns/locale';

const RISK_LEVELS = {
  critical: { label: 'วิกฤต', color: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  high: { label: 'สูง', color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
  medium: { label: 'ปานกลาง', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
  low: { label: 'ต่ำ', color: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' },
};

const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_WEIGHT = { pending: 3, in_progress: 2, review: 1 };

function computeRisk(task, today) {
  if (!task.due_date) return null;
  const daysLeft = differenceInDays(new Date(task.due_date), today);
  const priorityW = PRIORITY_WEIGHT[task.priority] || 2;
  const statusW = STATUS_WEIGHT[task.status] || 2;

  // Checklist progress
  const checklist = task.checklist || [];
  const totalItems = checklist.length;
  const checkedItems = checklist.filter(c => c.checked).length;
  const progress = totalItems > 0 ? checkedItems / totalItems : 0;

  // Due date change history penalty
  const changeCount = task.due_date_change_count || 0;
  const changePenalty = Math.min(changeCount * 0.15, 0.6);

  // Risk score (0-100, higher = more risky)
  let score = 0;

  // Time factor (biggest weight)
  if (daysLeft <= 0) score += 50; // already overdue
  else if (daysLeft <= 1) score += 40;
  else if (daysLeft <= 3) score += 30;
  else if (daysLeft <= 7) score += 20;
  else if (daysLeft <= 14) score += 10;
  else score += 5;

  // Progress factor (low progress = higher risk)
  score += (1 - progress) * 20;

  // Priority factor
  score += priorityW * 4;

  // Status factor (pending = highest risk)
  score += statusW * 3;

  // Change penalty
  score += changePenalty * 15;

  score = Math.min(100, Math.round(score));

  let level = 'low';
  if (score >= 70) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 30) level = 'medium';

  return { score, level, daysLeft, progress, changeCount };
}

export default function OverdueRiskTable({ tasks }) {
  const [expandedId, setExpandedId] = useState(null);
  const today = new Date();

  const riskData = useMemo(() => {
    return tasks
      .filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date)
      .map(t => ({ ...t, risk: computeRisk(t, today) }))
      .filter(t => t.risk && t.risk.score >= 25)
      .sort((a, b) => b.risk.score - a.risk.score);
  }, [tasks]);

  const criticalCount = riskData.filter(t => t.risk.level === 'critical').length;
  const highCount = riskData.filter(t => t.risk.level === 'high').length;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Overdue Risk Forecast
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && <Badge className="bg-red-100 text-red-700 border-red-300 text-[9px]">{criticalCount} วิกฤต</Badge>}
            {highCount > 0 && <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[9px]">{highCount} สูง</Badge>}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">วิเคราะห์ความเสี่ยงจาก: เวลาที่เหลือ, progress checklist, priority, สถานะ, ประวัติเลื่อน due date</p>
      </CardHeader>
      <CardContent className="pt-1 pb-4 px-5">
        {riskData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">ไม่มีงานที่มีความเสี่ยง 🎉</p>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {riskData.map(task => {
              const r = task.risk;
              const rl = RISK_LEVELS[r.level];
              const isExpanded = expandedId === task.id;
              return (
                <div key={task.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${rl.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.customer_name && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{task.customer_name}</span>}
                        {task.assigned_name && <span className="text-[10px] text-muted-foreground">👤 {task.assigned_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[9px] ${rl.color}`}>{rl.label} ({r.score})</Badge>
                      <span className={`text-[10px] font-medium ${r.daysLeft <= 0 ? 'text-red-600' : r.daysLeft <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {r.daysLeft <= 0 ? `เกิน ${Math.abs(r.daysLeft)} วัน` : `อีก ${r.daysLeft} วัน`}
                      </span>
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 bg-muted/20 border-t space-y-1.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        <div><span className="text-muted-foreground">Due Date:</span> <span className="font-medium">{format(new Date(task.due_date), 'd MMM yy', { locale: th })}</span></div>
                        <div><span className="text-muted-foreground">Priority:</span> <span className="font-medium capitalize">{task.priority || '-'}</span></div>
                        <div><span className="text-muted-foreground">Status:</span> <span className="font-medium capitalize">{task.status?.replace('_', ' ')}</span></div>
                        <div><span className="text-muted-foreground">เลื่อน Due:</span> <span className={`font-medium ${r.changeCount >= 2 ? 'text-amber-600' : ''}`}>{r.changeCount} ครั้ง</span></div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Checklist Progress:</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${r.progress >= 0.7 ? 'bg-green-500' : r.progress >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.max(r.progress * 100, 2)}%` }} />
                          </div>
                          <span className="text-[10px] font-medium">{Math.round(r.progress * 100)}%</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        💡 {r.level === 'critical' ? 'ต้องดำเนินการทันที — พิจารณาเพิ่มคน หรือเลื่อน due date พร้อมแจ้ง' :
                           r.level === 'high' ? 'ควรติดตามใกล้ชิด — ตรวจสอบ progress ทุกวัน' :
                           'ติดตามตามปกติ — แต่อย่าปล่อยนานเกินไป'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}