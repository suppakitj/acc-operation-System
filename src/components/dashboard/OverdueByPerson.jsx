import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const DEPT_LABELS = {
  management: 'Management',
  accounting: 'Accounting',
  consulting: 'Consulting',
  audit: 'Audit',
  billing: 'Billing',
  it: 'IT',
};

export default function OverdueByPerson({ tasks, users }) {
  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const data = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_to || t.status === 'completed' || t.status === 'cancelled') return;
      if (!t.due_date) return;
      const dueDate = new Date(t.due_date);
      if (dueDate >= todayStart) return;

      const daysOver = differenceInDays(todayStart, dueDate);
      if (!map[t.assigned_to]) {
        const user = users.find(u => u.email === t.assigned_to);
        map[t.assigned_to] = {
          email: t.assigned_to,
          name: t.assigned_name || user?.full_name || t.assigned_to,
          dept: t.department || '',
          count: 0,
          maxDays: 0,
          totalDays: 0,
          tasks: [],
        };
      }
      map[t.assigned_to].count++;
      map[t.assigned_to].totalDays += daysOver;
      if (daysOver > map[t.assigned_to].maxDays) map[t.assigned_to].maxDays = daysOver;
      map[t.assigned_to].tasks.push({ title: t.title, daysOver, customer: t.customer_name });
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count || b.maxDays - a.maxDays);
  }, [tasks, users, todayStart]);

  const totalOverdue = data.reduce((s, d) => s + d.count, 0);

  const getSeverity = (count, maxDays) => {
    if (count >= 5 || maxDays >= 14) return 'destructive';
    if (count >= 3 || maxDays >= 7) return 'default';
    return 'secondary';
  };

  const getSeverityLabel = (count, maxDays) => {
    if (count >= 5 || maxDays >= 14) return 'วิกฤต';
    if (count >= 3 || maxDays >= 7) return 'ต้องติดตาม';
    return 'เล็กน้อย';
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            งานเกินกำหนดรายบุคคล
          </CardTitle>
          {totalOverdue > 0 && (
            <Badge variant="destructive" className="text-[10px]">{totalOverdue} งาน</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {data.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">ไม่มีงานเกินกำหนด 🎉</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.map(person => (
              <div key={person.email} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{person.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {DEPT_LABELS[person.dept] || person.dept || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={getSeverity(person.count, person.maxDays)} className="text-[9px]">
                      {getSeverityLabel(person.count, person.maxDays)}
                    </Badge>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-red-50 rounded-md py-1.5">
                    <p className="text-sm font-bold text-red-700">{person.count}</p>
                    <p className="text-[9px] text-red-600">งานเกิน</p>
                  </div>
                  <div className="bg-amber-50 rounded-md py-1.5">
                    <p className="text-sm font-bold text-amber-700">{person.maxDays}</p>
                    <p className="text-[9px] text-amber-600">วันมากสุด</p>
                  </div>
                  <div className="bg-blue-50 rounded-md py-1.5">
                    <p className="text-sm font-bold text-blue-700">
                      {person.count > 0 ? Math.round(person.totalDays / person.count) : 0}
                    </p>
                    <p className="text-[9px] text-blue-600">เฉลี่ย (วัน)</p>
                  </div>
                </div>

                {/* Top 3 overdue tasks */}
                <div className="mt-2 space-y-1">
                  {person.tasks.sort((a, b) => b.daysOver - a.daysOver).slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="text-red-500 font-semibold shrink-0">-{t.daysOver}d</span>
                      <span className="truncate">{t.title}</span>
                      {t.customer && <span className="shrink-0 text-[9px] bg-muted px-1.5 py-0.5 rounded">{t.customer}</span>}
                    </div>
                  ))}
                  {person.tasks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/60">+{person.tasks.length - 3} งานอื่น...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}