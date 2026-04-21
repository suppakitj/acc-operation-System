import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { rankTeam3E } from '@/utils/staffKpi';
import ScoreGradeBadge, { scoreColor } from './ScoreGradeBadge';
import { useUserList } from '@/hooks/useUserList';
import { startOfMonth, startOfQuarter, subMonths, format } from 'date-fns';

function getPeriodRange(preset) {
  const now = new Date();
  const to = format(now, 'yyyy-MM-dd');
  if (preset === 'quarter') return { from: format(startOfQuarter(now), 'yyyy-MM-dd'), to };
  if (preset === '3months') return { from: format(subMonths(startOfMonth(now), 2), 'yyyy-MM-dd'), to };
  return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to };
}

export default function TeamRanking3E({ department }) {
  const [period, setPeriod] = useState('quarter');
  const [sortBy, setSortBy] = useState('overall');

  const { from, to } = getPeriodRange(period);

  const { data: allUsers = [] } = useUserList();
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

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const d = t.created_date?.slice(0, 10) || '';
    return d >= from && d <= to;
  }), [tasks, from, to]);

  const filteredEntries = useMemo(() => timeEntries.filter(e => {
    const d = e.start_time?.slice(0, 10) || '';
    return d >= from && d <= to;
  }), [timeEntries, from, to]);

  const filteredUsers = useMemo(() => {
    let u = allUsers;
    if (department) {
      u = u.filter(usr => usr.department === department || (usr.departments || []).includes(department));
    }
    return u;
  }, [allUsers, department]);

  const rankings = useMemo(() => {
    const ranked = rankTeam3E({ users: filteredUsers, tasks: filteredTasks, timeEntries: filteredEntries, meetingNotes, from, to });
    // Sort
    if (sortBy === 'e1') return [...ranked].sort((a, b) => b.dimensions.execution.score - a.dimensions.execution.score);
    if (sortBy === 'e2') return [...ranked].sort((a, b) => b.dimensions.effectiveness.score - a.dimensions.effectiveness.score);
    if (sortBy === 'e3') return [...ranked].sort((a, b) => b.dimensions.efficiency.score - a.dimensions.efficiency.score);
    return ranked;
  }, [filteredUsers, filteredTasks, filteredEntries, meetingNotes, from, to, sortBy]);

  const sufficient = rankings.filter(r => r.has_sufficient_data);
  const insufficient = rankings.filter(r => !r.has_sufficient_data);
  const top3 = sufficient.slice(0, 3);
  const bottom3 = sufficient.length > 3 ? sufficient.slice(-3).reverse() : [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">เดือนนี้</SelectItem>
            <SelectItem value="quarter">ไตรมาสนี้</SelectItem>
            <SelectItem value="3months">3 เดือนล่าสุด</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">Overall</SelectItem>
            <SelectItem value="e1">Execution</SelectItem>
            <SelectItem value="e2">Effectiveness</SelectItem>
            <SelectItem value="e3">Efficiency</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">{from} — {to} · {rankings.length} คน</span>
      </div>

      {/* Top 3 / Bottom 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {top3.length > 0 && (
          <Card className="border-l-4 border-l-emerald-400">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Top Performers</p>
              {top3.map((r, i) => (
                <div key={r.user.email} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 w-5">#{i + 1}</span>
                  <span className="text-xs flex-1 truncate">{r.user.full_name || r.user.email}</span>
                  <span className={`text-xs font-bold ${scoreColor(r.overall)}`}>{r.overall}</span>
                  <ScoreGradeBadge grade={r.grade} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {bottom3.length > 0 && (
          <Card className="border-l-4 border-l-orange-400">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-orange-700 flex items-center gap-1"><ArrowUpDown className="w-3.5 h-3.5" /> Needs Coaching</p>
              {bottom3.map((r) => (
                <div key={r.user.email} className="flex items-center gap-2">
                  <span className="text-xs flex-1 truncate">{r.user.full_name || r.user.email}</span>
                  <span className={`text-xs font-bold ${scoreColor(r.overall)}`}>{r.overall}</span>
                  <ScoreGradeBadge grade={r.grade} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Staff</th>
                <th className="px-3 py-2 text-center">Overall</th>
                <th className="px-3 py-2 text-center">Grade</th>
                <th className="px-3 py-2 text-center text-blue-600">E1</th>
                <th className="px-3 py-2 text-center text-green-600">E2</th>
                <th className="px-3 py-2 text-center text-amber-600">E3</th>
                <th className="px-3 py-2 text-center">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {sufficient.map((r, i) => (
                <tr key={r.user.email} className="border-b hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium truncate max-w-[160px]">{r.user.full_name || r.user.email}</p>
                    <p className="text-[10px] text-muted-foreground">{r.user.role} · {r.user.department || '—'}</p>
                  </td>
                  <td className={`px-3 py-2 text-center font-bold ${scoreColor(r.overall)}`}>{r.overall}</td>
                  <td className="px-3 py-2 text-center"><ScoreGradeBadge grade={r.grade} /></td>
                  <td className={`px-3 py-2 text-center ${scoreColor(r.dimensions.execution.score)}`}>{r.dimensions.execution.score}</td>
                  <td className={`px-3 py-2 text-center ${scoreColor(r.dimensions.effectiveness.score)}`}>{r.dimensions.effectiveness.score}</td>
                  <td className={`px-3 py-2 text-center ${scoreColor(r.dimensions.efficiency.score)}`}>{r.dimensions.efficiency.score}</td>
                  <td className="px-3 py-2 text-center">{r.dimensions.execution.total_assigned}</td>
                </tr>
              ))}
              {insufficient.map((r) => (
                <tr key={r.user.email} className="border-b opacity-50">
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">
                    <p className="truncate max-w-[160px]">{r.user.full_name || r.user.email}</p>
                    <p className="text-[10px] text-muted-foreground">{r.user.role}</p>
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{r.overall}</td>
                  <td className="px-3 py-2 text-center"><Badge variant="secondary" className="text-[9px]">N/A</Badge></td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{r.dimensions.execution.score}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{r.dimensions.effectiveness.score}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{r.dimensions.efficiency.score}</td>
                  <td className="px-3 py-2 text-center">{r.dimensions.execution.total_assigned}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {insufficient.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-muted-foreground border-t">
              <AlertTriangle className="w-3 h-3" />
              {insufficient.length} คนมีข้อมูลไม่เพียงพอ ({'< 5'} tasks)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}