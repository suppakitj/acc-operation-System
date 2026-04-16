import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Users, BookOpen, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../LanguageContext';

const CATEGORY_LABELS = {
  accounting: 'บัญชี', tax: 'ภาษี', audit: 'ตรวจสอบ',
  software: 'ซอฟต์แวร์', soft_skill: 'Soft Skill', other: 'อื่นๆ',
};
const LEVEL_LABELS = {
  beginner: 'เริ่มต้น', intermediate: 'ปานกลาง', advanced: 'ก้าวหน้า', expert: 'เชี่ยวชาญ',
};

export default function SkillSection({ allSkills, deptFilter }) {
  const { t } = useLanguage();

  const filtered = useMemo(() =>
    deptFilter === 'all' ? allSkills : allSkills.filter(s => s.category === deptFilter || !s.category),
    [allSkills, deptFilter]
  );

  const currentSkills = filtered.filter(s => !s.is_goal);
  const goalSkills = filtered.filter(s => s.is_goal);

  const uniqueUsers = new Set(filtered.map(s => s.user_email)).size;
  const uniqueCurrent = new Set(currentSkills.map(s => s.skill_name)).size;
  const uniqueGoals = new Set(goalSkills.map(s => s.skill_name)).size;

  const topSkills = useMemo(() => {
    const count = {};
    currentSkills.forEach(s => { count[s.skill_name] = (count[s.skill_name] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, c]) => ({ name, count: c }));
  }, [currentSkills]);

  const topGaps = useMemo(() => {
    const count = {};
    goalSkills.forEach(s => { count[s.skill_name] = (count[s.skill_name] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, c]) => ({ name, count: c }));
  }, [goalSkills]);

  const stats = [
    { label: t('engagement_skills_users'), value: uniqueUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('engagement_skills_top'), value: uniqueCurrent, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('engagement_skills_gaps'), value: uniqueGoals, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-500" /> {t('engagement_skills_title')}
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
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts side by side */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Top current skills */}
          <div>
            <p className="text-xs font-semibold mb-2">🏆 ทักษะที่ทีมมีมากที่สุด</p>
            {topSkills.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkills} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
            )}
          </div>

          {/* Top skill gaps */}
          <div>
            <p className="text-xs font-semibold mb-2">🎯 ทักษะที่อยากพัฒนามากที่สุด</p>
            {topGaps.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topGaps} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        {/* Detail: who wants to develop what */}
        {goalSkills.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">👤 รายชื่อพนักงานที่อยากพัฒนาทักษะ</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">พนักงาน</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">ทักษะที่อยากพัฒนา</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">หมวด</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">ระดับปัจจุบัน</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {goalSkills.map((s, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium">{s.user_name || s.user_email}</td>
                      <td className="px-3 py-2">{s.skill_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{CATEGORY_LABELS[s.category] || s.category || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{LEVEL_LABELS[s.level] || s.level || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{s.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}