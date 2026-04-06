import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Award, Heart } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '../LanguageContext';
import { parseUTCDate } from '@/lib/dateUtils';

const CAT_LABEL = {
  teamwork: 'Teamwork', quality: 'Quality', speed: 'Speed',
  creative: 'Creative', helpful: 'Helpful', leadership: 'Leadership',
};

export default function ShoutOutSection({ allShoutOuts, deptFilter }) {
  const { t } = useLanguage();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const filtered = useMemo(() => {
    let list = allShoutOuts;
    if (deptFilter !== 'all') {
      list = list.filter(s => s.from_department === deptFilter || s.to_department === deptFilter);
    }
    return list;
  }, [allShoutOuts, deptFilter]);

  const thisMonth = filtered.filter(s => {
    const d = parseUTCDate(s.created_date);
    return d && d >= monthStart && d <= monthEnd;
  });

  // Top received
  const topReceived = useMemo(() => {
    const count = {};
    const cats = {};
    thisMonth.forEach(s => {
      count[s.to_name] = (count[s.to_name] || 0) + 1;
      if (!cats[s.to_name]) cats[s.to_name] = {};
      cats[s.to_name][s.category] = (cats[s.to_name][s.category] || 0) + 1;
    });
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, c]) => {
        const topCat = Object.entries(cats[name] || {}).sort((a, b) => b[1] - a[1])[0];
        return { name, count: c, topCategory: topCat ? topCat[0] : '-' };
      });
  }, [thisMonth]);

  // Top giver
  const topGiver = useMemo(() => {
    const count = {};
    thisMonth.forEach(s => { count[s.from_name] = (count[s.from_name] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  }, [thisMonth]);

  const mostRecognized = topReceived[0];

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const count = {};
    thisMonth.forEach(s => { count[s.category] = (count[s.category] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1]);
  }, [thisMonth]);

  const stats = [
    { label: t('engagement_shoutout_month'), value: thisMonth.length, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('engagement_shoutout_top_received'), value: mostRecognized?.name || '-', icon: Award, color: 'text-pink-600', bg: 'bg-pink-50', small: true },
    { label: t('engagement_shoutout_top_giver'), value: topGiver?.[0] || '-', icon: Heart, color: 'text-purple-600', bg: 'bg-purple-50', small: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" /> {t('engagement_shoutout_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mb-1.5`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className={`font-bold ${s.small ? 'text-sm truncate' : 'text-xl'}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        {catBreakdown.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {catBreakdown.map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="text-xs">
                {CAT_LABEL[cat] || cat}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Top 5 recognized */}
        {topReceived.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">🏆 Top 5 ถูกชมเชยมากที่สุด</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">ชื่อ</th>
                    <th className="text-center p-2">จำนวน</th>
                    <th className="text-left p-2">หมวดที่ได้บ่อย</th>
                  </tr>
                </thead>
                <tbody>
                  {topReceived.map((r, i) => (
                    <tr key={r.name} className="border-t">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2 text-center">{r.count}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{CAT_LABEL[r.topCategory] || r.topCategory}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent 5 */}
        <div>
          <p className="text-xs font-semibold mb-2">⭐ ชมเชยล่าสุด</p>
          {filtered.slice(0, 5).map(s => (
            <div key={s.id} className="flex items-start gap-2 py-2 border-b last:border-0">
              <Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs">
                <span className="font-medium">{s.from_name}</span> ชมเชย <span className="font-medium">{s.to_name}</span>: <span className="text-muted-foreground">{s.message}</span>
              </p>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มี shout-out</p>}
        </div>
      </CardContent>
    </Card>
  );
}