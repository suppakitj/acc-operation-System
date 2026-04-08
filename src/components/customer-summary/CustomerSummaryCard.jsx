import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const OBLIGATION_LABEL = {
  pnd1_monthly: 'ภงด.1', pnd1k_yearly: 'ภงด.1ก', pnd3_monthly: 'ภงด.3',
  pnd53_monthly: 'ภงด.53', pnd54_monthly: 'ภงด.54', pp30_monthly: 'ภ.พ.30',
  pp36_monthly: 'ภ.พ.36', sso_monthly: 'ประกันสังคม',
  pnd90_director: 'ภงด.90', pnd91_director: 'ภงด.91',
  pnd50_half: 'ภงด.50(ครึ่งปี)', pnd50_annual: 'ภงด.50(ปี)',
  audit_annual: 'ตรวจสอบงบ', dbd_filing: 'ยื่นงบDBD', boj5_annual: 'บอจ.5',
};

const STATUS_CONFIG = {
  completed: { label: 'เสร็จ', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'กำลังทำ', color: 'bg-blue-100 text-blue-700' },
  review: { label: 'รอตรวจ', color: 'bg-purple-100 text-purple-700' },
  pending: { label: 'รอดำเนินการ', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ยกเลิก', color: 'bg-gray-50 text-gray-400' },
};

export default function CustomerSummaryCard({ data: d }) {
  return (
    <Card className={`shadow-sm border ${d.issueCount > 0 ? 'border-l-4 border-l-red-400' : ''}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">{d.customer.company_name}</h3>
            <p className="text-[11px] text-muted-foreground">ผู้รับผิดชอบ: {d.topAssignee}</p>
          </div>
          {d.issueCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
              {d.issueCount} ปัญหา
            </Badge>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-semibold text-green-600">{d.tasks.completed}</p>
            <p className="text-[10px] text-muted-foreground">เสร็จ</p>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-semibold text-blue-600">{d.tasks.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">กำลังทำ</p>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
            <p className={`text-lg font-semibold ${d.tasks.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>{d.tasks.overdue}</p>
            <p className="text-[10px] text-muted-foreground">เกินกำหนด</p>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-semibold">{d.time.totalHours}</p>
            <p className="text-[10px] text-muted-foreground">ชั่วโมง</p>
          </div>
        </div>

        {/* On-time rate */}
        {d.tasks.onTimeRate !== null && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-muted-foreground">On-time rate:</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${d.tasks.onTimeRate >= 80 ? 'bg-green-500' : d.tasks.onTimeRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${d.tasks.onTimeRate}%` }}
              />
            </div>
            <span className={`text-[11px] font-semibold ${d.tasks.onTimeRate >= 80 ? 'text-green-600' : d.tasks.onTimeRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {d.tasks.onTimeRate}%
            </span>
          </div>
        )}

        {/* Obligation badges */}
        {d.obligations.total > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground mb-1.5">
              ภาระผูกพัน ({d.obligations.done}/{d.obligations.total})
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(d.obligations.status).map(([ob, status]) => (
                <Badge key={ob} variant="outline" className={`text-[9px] px-1.5 py-0 ${
                  status === 'done' ? 'bg-green-50 text-green-700 border-green-200' :
                  status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {status === 'done' ? '✓' : status === 'pending' ? '◷' : '✗'} {OBLIGATION_LABEL[ob] || ob}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Expandable task list */}
        {d.taskList.length > 0 && (
          <details className="text-[11px]">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              ดูรายการงาน ({d.taskList.length} งาน)
            </summary>
            <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
              {[...d.taskList].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')).map(t => {
                const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                return (
                  <div key={t.id} className="flex items-center gap-2 py-0.5">
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-muted-foreground shrink-0">
                      {t.due_date ? format(new Date(t.due_date), 'd MMM', { locale: th }) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}