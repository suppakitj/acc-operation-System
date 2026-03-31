import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, DollarSign, TrendingUp, Users } from 'lucide-react';

function fmt(num) {
  return num.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

export default function StaffCostStatCards({ totalMinutes, totalCost, staffCount }) {
  const totalHours = totalMinutes / 60;
  const hours = Math.floor(totalHours);
  const mins = Math.round(totalMinutes % 60);
  const avgCost = staffCount > 0 && totalHours > 0 ? totalCost / totalHours : 0;

  const cards = [
    { label: 'ชั่วโมงรวม', value: `${fmt(hours)} ชม. ${mins} นท.`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'ต้นทุนรวม', value: `฿${fmt(totalCost)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'ต้นทุน/ชม. เฉลี่ย', value: `฿${fmt(avgCost)}/ชม.`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'พนักงานที่มีข้อมูล', value: `${staffCount} คน`, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className="shadow-sm border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                <p className="text-sm font-bold">{c.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}