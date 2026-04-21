import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip as RTooltip } from 'recharts';
import { computeScorecard3E } from '@/utils/staffKpi';
import MetricTile from './MetricTile';
import ScoreGradeBadge, { scoreColor } from './ScoreGradeBadge';

const DIM_COLORS = { e1: '#3b82f6', e2: '#22c55e', e3: '#f59e0b' };

export default function StaffScorecard({ email, role, from, to, user }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks_kpi'], queryFn: () => base44.entities.Task.list('-created_date', 2000), staleTime: 60_000,
  });
  const { data: meetingNotes = [] } = useQuery({
    queryKey: ['meetingNotes_kpi'], queryFn: () => base44.entities.MeetingNote.list('-created_date', 1000), staleTime: 60_000,
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries_kpi'],
    queryFn: async () => { try { return await base44.entities.TimeEntry.list('-created_date', 5000); } catch { return []; } },
    staleTime: 60_000,
  });

  const filteredTasks = useMemo(() => {
    if (!from || !to) return tasks;
    return tasks.filter(t => {
      const d = t.created_date?.slice(0, 10) || '';
      return d >= from && d <= to;
    });
  }, [tasks, from, to]);

  const filteredEntries = useMemo(() => {
    if (!from || !to) return timeEntries;
    return timeEntries.filter(e => {
      const d = e.start_time?.slice(0, 10) || '';
      return d >= from && d <= to;
    });
  }, [timeEntries, from, to]);

  const scorecard = useMemo(() =>
    computeScorecard3E({ email, role: role || 'staff', tasks: filteredTasks, timeEntries: filteredEntries, meetingNotes, user, from, to }),
    [email, role, filteredTasks, filteredEntries, meetingNotes, user, from, to]
  );

  const { overall, grade, weights, has_sufficient_data, dimensions: { execution: e1, effectiveness: e2, efficiency: e3 } } = scorecard;

  const barData = [
    { name: 'Execution', score: e1.score, weight: Math.round(weights.e1 * 100), fill: DIM_COLORS.e1 },
    { name: 'Effectiveness', score: e2.score, weight: Math.round(weights.e2 * 100), fill: DIM_COLORS.e2 },
    { name: 'Efficiency', score: e3.score, weight: Math.round(weights.e3 * 100), fill: DIM_COLORS.e3 },
  ];

  // Coaching
  let coaching = '✨ Performance ดีทั้ง 3 มิติ — keep up the good work';
  if (e2.score < 70) coaching = '🔍 เน้นเรื่องคุณภาพงาน — ตรวจ checklist + self-review ก่อนส่ง';
  else if (e3.score < 70) coaching = '⏰ จัดการเวลา — แตก task ย่อย, set milestone, communicate early';
  else if (e1.score < 70) coaching = '📊 ปริมาณงาน — review capacity กับ manager, ลดงาน WIP';

  const sevTotal = e2.severity_breakdown.minor + e2.severity_breakdown.major + e2.severity_breakdown.critical;
  const topCategories = Object.entries(e2.category_breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Insufficient data warning */}
      {!has_sufficient_data && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">งานน้อยกว่า 5 รายการ — ใช้เป็น indicative เท่านั้น</p>
        </div>
      )}

      {/* Hero */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center shrink-0">
              <p className={`text-5xl font-bold ${scoreColor(overall)}`}>{overall}</p>
              <ScoreGradeBadge grade={grade} size="lg" />
              <p className="text-[10px] text-muted-foreground mt-1">Overall Score</p>
            </div>
            <div className="flex-1 w-full h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                  <RTooltip formatter={(v) => `${v}/100`} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={28}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-around text-[10px] text-muted-foreground -mt-1">
                {barData.map(d => <span key={d.name}>Weight: {d.weight}%</span>)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E1: Execution */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-sm">E1: Execution — ทำครบ</h3>
            <span className={`ml-auto font-bold ${scoreColor(e1.score)}`}>{e1.score}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricTile label="Completion Rate" value={e1.completion_rate} format="percent" good={e1.completion_rate >= 0.8} />
            <MetricTile label="Completed" value={e1.completed} hint={`/ ${e1.total_assigned}`} />
            <MetricTile label="Hours" value={e1.total_hours} format="decimal" />
            <MetricTile label="Utilization" value={e1.utilization_rate} format="percent" good={e1.utilization_rate >= 0.7 && e1.utilization_rate <= 0.95} />
            <MetricTile label="In Flight" value={e1.in_flight} />
            <MetricTile label="Cancelled" value={e1.cancelled} good={e1.cancelled === 0} />
            <MetricTile label="Throughput vs Cap" value={e1.throughput_vs_capacity} format="percent" good={e1.throughput_vs_capacity >= 0.8} />
            <MetricTile label="Capacity" value={e1.capacity} hint="tasks/period" />
          </div>
        </CardContent>
      </Card>

      {/* E2: Effectiveness */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-sm">E2: Effectiveness — ไม่ผิดพลาด</h3>
            <span className={`ml-auto font-bold ${scoreColor(e2.score)}`}>{e2.score}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricTile label="Rework Rate" value={e2.rework_rate} format="percent" good={e2.rework_rate <= 0.1} />
            <MetricTile label="First Time Right" value={e2.first_time_right_rate} format="percent" good={e2.first_time_right_rate >= 0.8} />
            <MetricTile label="Avg Rework" value={e2.avg_rework_count} format="decimal" good={e2.avg_rework_count < 0.5} />
            <MetricTile label="Weighted Rework" value={e2.avg_weighted_rework} format="decimal" good={e2.avg_weighted_rework < 1} />
            <MetricTile label="Reworked Tasks" value={e2.reworked_tasks} hint={`/ ${e2.reviewed_tasks} reviewed`} />
            <MetricTile label="Critical Findings" value={Math.round(e2.critical_finding_rate * 100) + '%'} good={e2.critical_finding_rate === 0} />
          </div>
          {sevTotal > 0 && (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-muted-foreground">Severity:</span>
              <Badge variant="outline" className="text-[9px] bg-yellow-50 text-yellow-700">Minor {e2.severity_breakdown.minor}</Badge>
              <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700">Major {e2.severity_breakdown.major}</Badge>
              <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700">Critical {e2.severity_breakdown.critical}</Badge>
            </div>
          )}
          {topCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-muted-foreground mr-1">Categories:</span>
              {topCategories.map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-[9px]">{cat} ({count})</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* E3: Efficiency */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-sm">E3: Efficiency — ตรงเวลา</h3>
            <span className={`ml-auto font-bold ${scoreColor(e3.score)}`}>{e3.score}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricTile label="On-Time Tasks" value={e3.on_time_rate} format="percent" good={e3.on_time_rate >= 0.85} />
            <MetricTile label="Combined On-Time" value={e3.combined_on_time_rate} format="percent" good={e3.combined_on_time_rate >= 0.85} />
            <MetricTile label="Avg Slippage" value={e3.avg_slippage_days} format="decimal" hint="days" good={e3.avg_slippage_days <= 2} />
            <MetricTile label="Postpone Ratio" value={e3.postpone_ratio} format="percent" good={e3.postpone_ratio <= 0.1} />
            <MetricTile label="Postponed" value={e3.postponed_count} />
            <MetricTile label="Overdue Open" value={e3.overdue_open} good={e3.overdue_open === 0} />
            <MetricTile label="Meeting OT" value={e3.meeting_action_on_time} format="percent" good={e3.meeting_action_on_time >= 0.8} />
            <MetricTile label="Meeting Actions" value={`${e3.meeting_on_time}/${e3.meeting_total}`} />
          </div>
        </CardContent>
      </Card>

      {/* Coaching */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-start gap-2">
        <TrendingUp className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-indigo-800">Coaching Takeaway</p>
          <p className="text-xs text-indigo-700 mt-0.5">{coaching}</p>
        </div>
      </div>
    </div>
  );
}