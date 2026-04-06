import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getISOWeek, getYear } from 'date-fns';
import { useLanguage } from '../LanguageContext';

const MOOD_SCORE = { great: 5, good: 4, neutral: 3, stressed: 2, burned_out: 1 };
const MOOD_CONFIG = [
  { key: 'great', emoji: '😊', label: 'ดีมาก', color: 'bg-green-100 text-green-700' },
  { key: 'good', emoji: '🙂', label: 'ดี', color: 'bg-blue-100 text-blue-700' },
  { key: 'neutral', emoji: '😐', label: 'เฉยๆ', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'stressed', emoji: '😓', label: 'เครียด', color: 'bg-orange-100 text-orange-700' },
  { key: 'burned_out', emoji: '😫', label: 'หมดแรง', color: 'bg-red-100 text-red-700' },
];

export default function PulseSection({ pulseResponses, activeUserCount, deptFilter }) {
  const { t } = useLanguage();
  const now = new Date();
  const currentWeekKey = `${getYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;
  const prevWeekKey = `${getYear(now)}-W${String(getISOWeek(now) - 1).padStart(2, '0')}`;

  const filtered = useMemo(() =>
    deptFilter === 'all' ? pulseResponses : pulseResponses.filter(r => r.department === deptFilter),
    [pulseResponses, deptFilter]
  );

  const thisWeek = filtered.filter(r => r.week_key === currentWeekKey);
  const lastWeek = filtered.filter(r => r.week_key === prevWeekKey);

  const avgMood = (responses) => {
    if (!responses.length) return 0;
    return Math.round((responses.reduce((s, r) => s + (MOOD_SCORE[r.mood] || 3), 0) / responses.length) * 10) / 10;
  };

  const thisAvg = avgMood(thisWeek);
  const lastAvg = avgMood(lastWeek);
  const trend = lastAvg > 0 ? Math.round((thisAvg - lastAvg) * 10) / 10 : 0;
  const participationRate = activeUserCount > 0 ? Math.round((thisWeek.length / activeUserCount) * 100) : 0;
  const needsAttention = thisWeek.filter(r => r.mood === 'stressed' || r.mood === 'burned_out').length;

  // Weekly trend data
  const weeklyData = useMemo(() => {
    const weekMap = {};
    filtered.forEach(r => {
      if (!weekMap[r.week_key]) weekMap[r.week_key] = [];
      weekMap[r.week_key].push(r);
    });
    return Object.entries(weekMap)
      .map(([week, responses]) => ({
        week: week.replace(/^\d{4}-/, ''),
        avg: Math.round((responses.reduce((s, r) => s + (MOOD_SCORE[r.mood] || 3), 0) / responses.length) * 10) / 10,
        count: responses.length,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8);
  }, [filtered]);

  // Mood distribution
  const moodDist = useMemo(() => {
    const counts = {};
    MOOD_CONFIG.forEach(m => counts[m.key] = 0);
    thisWeek.forEach(r => { if (counts[r.mood] !== undefined) counts[r.mood]++; });
    return counts;
  }, [thisWeek]);

  // Anonymous stressed comments
  const stressedComments = thisWeek
    .filter(r => (r.mood === 'stressed' || r.mood === 'burned_out') && r.comment)
    .map(r => ({ mood: r.mood, department: r.department, comment: r.comment }));

  const stats = [
    { label: t('engagement_pulse_participation'), value: `${participationRate}%`, sub: `${thisWeek.length}/${activeUserCount}`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('engagement_pulse_avg_mood'), value: thisAvg.toFixed(1), sub: '/5.0', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: t('engagement_pulse_needs_attention'), value: needsAttention, sub: 'คน', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: t('engagement_pulse_trend'), value: `${trend >= 0 ? '+' : ''}${trend}`, sub: 'vs สัปดาห์ก่อน', icon: TrendingUp, color: trend >= 0 ? 'text-green-600' : 'text-red-600', bg: trend >= 0 ? 'bg-green-50' : 'bg-red-50' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500" /> {t('engagement_pulse_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mb-1.5`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className="text-xl font-bold">{s.value} <span className="text-xs text-muted-foreground font-normal">{s.sub}</span></p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Mood distribution */}
        <div className="flex flex-wrap gap-2">
          {MOOD_CONFIG.map(m => (
            <Badge key={m.key} variant="outline" className={`${m.color} text-xs`}>
              {m.emoji} {m.label}: {moodDist[m.key]} คน
            </Badge>
          ))}
        </div>

        {/* Weekly trend chart */}
        {weeklyData.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Avg Mood']} />
                <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Anonymous stressed comments */}
        {stressedComments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">💬 ความคิดเห็น (ไม่ระบุชื่อ)</p>
            {stressedComments.map((c, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                <span>{c.mood === 'burned_out' ? '😫' : '😓'}</span>
                {c.department && <Badge variant="outline" className="text-[10px] ml-2">{c.department}</Badge>}
                <p className="text-muted-foreground mt-1">{c.comment}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}