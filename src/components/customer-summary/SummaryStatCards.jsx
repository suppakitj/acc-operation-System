import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

export default function SummaryStatCards({ stats }) {
  const rateColor = stats.completionRate >= 80 ? 'text-green-600' : stats.completionRate >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="shadow-sm border">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{stats.totalCustomers}</p>
            <p className="text-[10px] text-muted-foreground">ลูกค้าที่มีงาน</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4.5 h-4.5 text-green-600" />
          </div>
          <div>
            <p className={`text-lg font-bold ${rateColor}`}>{stats.completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Completion Rate</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardContent className="p-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stats.totalOverdue > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <AlertTriangle className={`w-4.5 h-4.5 ${stats.totalOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-lg font-bold ${stats.totalOverdue > 0 ? 'text-red-600' : ''}`}>{stats.totalOverdue}</p>
            <p className="text-[10px] text-muted-foreground">งานเกินกำหนด</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Clock className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{stats.totalHours}</p>
            <p className="text-[10px] text-muted-foreground">ชั่วโมงทั้งหมด</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}