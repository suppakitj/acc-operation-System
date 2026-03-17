import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function OnTimeRateTable({ tasks, year }) {
  const data = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (t.status !== 'completed' || !t.completed_date || !t.assigned_name || !t.due_date) return;
      const completedDate = new Date(t.completed_date);
      if (completedDate.getFullYear() !== year) return;

      const key = t.assigned_to || t.assigned_name;
      if (!map[key]) map[key] = { name: t.assigned_name, email: key, onTime: 0, late: 0 };
      if (completedDate <= new Date(t.due_date)) {
        map[key].onTime++;
      } else {
        map[key].late++;
      }
    });

    return Object.values(map)
      .map(e => ({
        ...e,
        total: e.onTime + e.late,
        rate: Math.round((e.onTime / (e.onTime + e.late)) * 100),
      }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [tasks, year]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          On-Time Delivery Rate — อัตราส่งงานตรงเวลา ({year})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีข้อมูลในปี {year}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-xs font-medium text-muted-foreground">#</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">พนักงาน</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground text-center">ตรงเวลา</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground text-center">ล่าช้า</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground text-center">รวม</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground text-right">On-Time Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((emp, i) => (
                  <tr key={emp.email} className="border-b last:border-0">
                    <td className="py-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium truncate max-w-[140px]">{emp.name}</td>
                    <td className="py-2 text-center text-green-600 font-medium">{emp.onTime}</td>
                    <td className="py-2 text-center text-red-500 font-medium">{emp.late}</td>
                    <td className="py-2 text-center">{emp.total}</td>
                    <td className="py-2 text-right">
                      <Badge className={`text-[10px] ${
                        emp.rate >= 80 ? 'bg-green-100 text-green-700' :
                        emp.rate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {emp.rate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}