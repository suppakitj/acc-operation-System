import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle } from 'lucide-react';

const DEPT_LABELS = {
  management: 'Mgmt', accounting: 'Acct', consulting: 'Consult',
  audit: 'Audit', billing: 'Billing', it: 'IT',
};

const MAX_ACTIVE_TASKS = 8; // threshold for overload

function getLoadLevel(count) {
  if (count >= MAX_ACTIVE_TASKS * 1.5) return { label: 'Overload', color: 'bg-red-100 text-red-700 border-red-300', barColor: 'bg-red-500' };
  if (count >= MAX_ACTIVE_TASKS) return { label: 'เต็ม', color: 'bg-orange-100 text-orange-700 border-orange-300', barColor: 'bg-orange-500' };
  if (count >= MAX_ACTIVE_TASKS * 0.7) return { label: 'ใกล้เต็ม', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', barColor: 'bg-yellow-500' };
  return { label: 'ปกติ', color: 'bg-green-100 text-green-700 border-green-300', barColor: 'bg-green-500' };
}

export default function WorkloadOverloadTable({ tasks, users }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const staffData = useMemo(() => {
    const map = {};

    tasks.forEach(t => {
      if (['completed', 'cancelled'].includes(t.status)) return;
      const email = t.assigned_to;
      if (!email) return;

      if (!map[email]) {
        const u = users.find(u => u.email === email);
        map[email] = {
          email,
          name: u?.initials || u?.nickname || u?.full_name || t.assigned_name || email,
          department: u?.department || t.department || '',
          activeTasks: 0,
          urgentHigh: 0,
          dueSoon: 0,
          overdue: 0,
          tasks: [],
        };
      }
      const s = map[email];
      s.activeTasks++;
      if (['urgent', 'high'].includes(t.priority)) s.urgentHigh++;
      if (t.due_date) {
        if (t.due_date < todayStr) s.overdue++;
        else {
          const daysLeft = Math.ceil((new Date(t.due_date) - today) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7) s.dueSoon++;
        }
      }
      s.tasks.push({ id: t.id, title: t.title, due_date: t.due_date, priority: t.priority, status: t.status });
    });

    return Object.values(map).sort((a, b) => b.activeTasks - a.activeTasks);
  }, [tasks, users]);

  const overloadCount = staffData.filter(s => s.activeTasks >= MAX_ACTIVE_TASKS).length;
  const nearFullCount = staffData.filter(s => s.activeTasks >= MAX_ACTIVE_TASKS * 0.7 && s.activeTasks < MAX_ACTIVE_TASKS).length;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-500" />
            Workload Overload Forecast
          </CardTitle>
          <div className="flex gap-2">
            {overloadCount > 0 && <Badge className="bg-red-100 text-red-700 border-red-300 text-[9px]">{overloadCount} Overload</Badge>}
            {nearFullCount > 0 && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-[9px]">{nearFullCount} ใกล้เต็ม</Badge>}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">เปรียบเทียบงาน active กับ capacity ({MAX_ACTIVE_TASKS} งาน/คน) — เรียงจากคนที่งานเยอะที่สุด</p>
      </CardHeader>
      <CardContent className="pt-1 pb-4 px-5">
        {staffData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase">พนักงาน</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">งาน Active</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase w-[120px]">Capacity</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center hidden sm:table-cell">Urgent/High</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center hidden sm:table-cell">Due ≤ 7 วัน</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">Overdue</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {staffData.map(s => {
                  const load = getLoadLevel(s.activeTasks);
                  const pct = Math.min((s.activeTasks / MAX_ACTIVE_TASKS) * 100, 150);
                  return (
                    <tr key={s.email} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="px-2 py-2.5">
                        <p className="text-xs font-semibold">{s.name}</p>
                        <Badge variant="outline" className="text-[8px] mt-0.5">{DEPT_LABELS[s.department] || s.department || '-'}</Badge>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs font-bold">{s.activeTasks}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${load.barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs hidden sm:table-cell">
                        {s.urgentHigh > 0 ? <span className="text-orange-600 font-medium">{s.urgentHigh}</span> : '-'}
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs hidden sm:table-cell">
                        {s.dueSoon > 0 ? <span className="text-amber-600 font-medium">{s.dueSoon}</span> : '-'}
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs">
                        {s.overdue > 0 ? <span className="text-red-600 font-bold">{s.overdue}</span> : '-'}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <Badge variant="outline" className={`text-[9px] ${load.color}`}>{load.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}