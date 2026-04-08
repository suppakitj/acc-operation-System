import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Building2, Users, ClipboardList, TrendingUp } from 'lucide-react';
import TimeTrackingStats from '../components/time-tracking/TimeTrackingStats';
import TimeByCustomerTable from '../components/time-tracking/TimeByCustomerTable';
import TimeByEmployeeTable from '../components/time-tracking/TimeByEmployeeTable';
import TimeByTaskTable from '../components/time-tracking/TimeByTaskTable';
import CostEfficiencyTable from '../components/time-tracking/CostEfficiencyTable';

const MONTH_LABELS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export default function TimeTracking() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ['timeEntries-tracking'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 2000),
    staleTime: 2 * 60_000,
  });

  // Filter by selected month/year
  const entries = useMemo(() => {
    const m = parseInt(month);
    const y = parseInt(year);
    return allEntries.filter(e => {
      if (!e.start_time) return false;
      const d = new Date(e.start_time);
      return d.getMonth() + 1 === m && d.getFullYear() === y;
    });
  }, [allEntries, month, year]);

  const years = [];
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) years.push(y);

  // Running timers
  const runningCount = allEntries.filter(e => e.is_running).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5" /> SLA / Time Tracking
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">วิเคราะห์เวลาการทำงาน — รู้ว่า task ไหนใช้เวลานาน ลูกค้าไหนกิน resource เยอะ</p>
        </div>
        {runningCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {runningCount} timer กำลังทำงานอยู่
          </div>
        )}
      </div>

      {/* Month/Year selector */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">เดือน</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">ปี</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <TimeTrackingStats entries={entries} />

      {/* Tabs for different views */}
      <Tabs defaultValue="customer" className="space-y-3">
        <TabsList>
          <TabsTrigger value="customer" className="gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" /> ตามลูกค้า</TabsTrigger>
          <TabsTrigger value="efficiency" className="gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" /> Cost Efficiency</TabsTrigger>
          <TabsTrigger value="employee" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> ตามพนักงาน</TabsTrigger>
          <TabsTrigger value="task" className="gap-1.5 text-xs"><ClipboardList className="w-3.5 h-3.5" /> ตาม Task</TabsTrigger>
        </TabsList>

        <TabsContent value="customer">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">เวลาตามลูกค้า — ลูกค้าไหนกิน resource มากที่สุด</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeByCustomerTable entries={entries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cost Efficiency — เปรียบเทียบเวลาที่ใช้ vs ค่าบริการ</CardTitle>
            </CardHeader>
            <CardContent>
              <CostEfficiencyTable entries={entries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">เวลาตามพนักงาน — ใครใช้เวลาเท่าไหร่</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeByEmployeeTable entries={entries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="task">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">เวลาตาม Task — task ไหนใช้เวลานานที่สุด</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeByTaskTable entries={entries} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}