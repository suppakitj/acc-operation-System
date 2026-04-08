import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, ClipboardCheck, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function ReviewQueue({ reviewTasks = [], onApprove, onReject, currentUser }) {
  const isReviewer = ['admin', 'management', 'manager', 'super_supervisor'].includes(currentUser?.role);
  if (!isReviewer) return null;
  if (reviewTasks.length === 0) return null;

  const handleReject = (task) => {
    const note = prompt('เหตุผลที่ส่งกลับ:');
    if (note === null) return;
    onReject(task.id, note);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-purple-600" />
          งานรอตรวจ
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] px-1.5 ml-1">
            {reviewTasks.length}
          </Badge>
        </p>
        <Link to="/Tasks?status=review" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
          ดูทั้งหมด <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {reviewTasks.slice(0, 5).map(task => {
          const checklist = task.checklist || [];
          const checkedCount = checklist.filter(item => item.checked).length;
          const allChecked = checklist.length === 0 || checkedCount === checklist.length;

          return (
            <Card key={task.id} className="shadow-sm border border-l-4 border-l-purple-400">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {task.customer_name && (
                        <span className="text-[10px] text-muted-foreground">🏢 {task.customer_name}</span>
                      )}
                      {task.assigned_name && (
                        <span className="text-[10px] text-muted-foreground">👤 {task.assigned_name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-[10px] text-muted-foreground">
                          📅 {format(new Date(task.due_date), 'd MMM', { locale: th })}
                        </span>
                      )}
                    </div>
                    {checklist.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className={`h-full rounded-full ${allChecked ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${(checkedCount / checklist.length) * 100}%` }}
                          />
                        </div>
                        <span className={`text-[9px] ${allChecked ? 'text-green-600' : 'text-amber-600'}`}>
                          {checkedCount}/{checklist.length}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 text-[11px] gap-1 bg-green-600 hover:bg-green-700 px-2"
                      onClick={() => {
                        if (!allChecked) {
                          toast.error(`Checklist ยังไม่ครบ (${checkedCount}/${checklist.length}) — กรุณาส่งกลับ`);
                          return;
                        }
                        onApprove(task.id);
                      }}
                    >
                      <Check className="w-3 h-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1 text-red-600 border-red-200 hover:bg-red-50 px-2"
                      onClick={() => handleReject(task)}
                    >
                      <X className="w-3 h-3" /> กลับ
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {reviewTasks.length > 5 && (
          <Link to="/Tasks?status=review" className="block text-center text-xs text-muted-foreground hover:text-primary py-1">
            + อีก {reviewTasks.length - 5} งาน →
          </Link>
        )}
      </div>
    </div>
  );
}