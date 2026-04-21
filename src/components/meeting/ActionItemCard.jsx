import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, History, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { getItemPermissions } from './meetingNoteUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ActionItemCard({
  note, item, currentUser,
  onToggleDone, onPostpone, onApprove, onReject, onShowHistory,
}) {
  const perms = getItemPermissions(note, item, currentUser);
  const hasPending = !!item.pending_postpone;
  const isOverdue = !item.done && item.due_date && new Date(item.due_date) < new Date();

  return (
    <div className={`rounded-lg border px-3 py-2 space-y-1.5 ${item.done ? 'bg-muted/30' : ''}`}>
      {/* Main row */}
      <div className="flex items-start gap-2">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="pt-0.5">
                <Checkbox
                  checked={item.done}
                  onCheckedChange={() => perms.canClose && onToggleDone()}
                  disabled={!perms.canClose || hasPending}
                />
              </div>
            </TooltipTrigger>
            {hasPending && <TooltipContent><p className="text-xs">กำลังรออนุมัติ</p></TooltipContent>}
            {!perms.canClose && !hasPending && <TooltipContent><p className="text-xs">ไม่มีสิทธิ์</p></TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1 min-w-0">
          <span className={`text-xs ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.text}</span>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {item.assignee_name && (
              <Badge variant="outline" className="text-[9px] gap-0.5">👤 {item.assignee_name}</Badge>
            )}
            {item.due_date && (
              <span className={`text-[10px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                📅 {format(new Date(item.due_date), 'd MMM', { locale: th })}
              </span>
            )}
            {(item.postpone_count || 0) > 0 && (
              <Badge
                variant="outline"
                className={`text-[9px] cursor-pointer ${item.postpone_count >= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                onClick={() => onShowHistory()}
              >
                เลื่อน {item.postpone_count} ครั้ง
              </Badge>
            )}
          </div>

          {/* Closed info */}
          {item.done && item.closed_at && (
            <p className="text-[10px] text-green-600 mt-0.5">
              ✅ ปิดโดย {item.closed_by_name || item.closed_by || '—'} — {format(new Date(item.closed_at), 'd MMM yy HH:mm', { locale: th })}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {perms.canPostpone && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onPostpone}>
                    <Clock className="w-3 h-3 text-amber-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">ขอเลื่อน Due Date</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {(item.postpone_history || []).length > 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onShowHistory}>
              <History className="w-3 h-3 text-indigo-600" />
            </Button>
          )}
        </div>
      </div>

      {/* Pending postpone banner */}
      {hasPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1.5">
          <p className="text-[11px] text-amber-800">
            ⏳ <span className="font-semibold">{item.pending_postpone.requested_by_name || item.pending_postpone.requested_by}</span> ขอเลื่อนเป็น{' '}
            <span className="font-semibold">{item.pending_postpone.new_due_date ? format(new Date(item.pending_postpone.new_due_date), 'd MMM yy', { locale: th }) : '—'}</span>
          </p>
          {item.pending_postpone.reason && (
            <p className="text-[10px] text-amber-700">เหตุผล: {item.pending_postpone.reason}</p>
          )}
          {perms.canApprove && (
            <div className="flex gap-1.5 pt-0.5">
              <Button size="sm" className="h-6 text-[10px] gap-1 bg-green-600 hover:bg-green-700" onClick={onApprove}>
                <CheckCircle2 className="w-3 h-3" /> อนุมัติ
              </Button>
              <Button size="sm" variant="destructive" className="h-6 text-[10px] gap-1" onClick={onReject}>
                ❌ ปฏิเสธ
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}