import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, Pin, Star, Plus } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import moment from 'moment';
import AnnouncementForm from './AnnouncementForm';
import { useAccessControl } from '../auth/useAccessControl';

const TYPE_BADGE = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  celebration: 'bg-green-50 text-green-700 border-green-200',
  reminder: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const TYPE_LABEL = { info: 'ข่าวสาร', celebration: '🎉 ฉลอง', reminder: 'แจ้งเตือน', urgent: 'ด่วน' };

const CATEGORY_LABEL = {
  teamwork: 'Teamwork', quality: 'Quality', speed: 'Speed',
  creative: 'Creative', helpful: 'Helpful', leadership: 'Leadership',
};

export default function CompanyFeed({ currentUser }) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const ac = useAccessControl(currentUser);
  const canManage = ac.canManageAnnouncements;

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 10),
    staleTime: 120_000,
  });

  const { data: recentShoutOuts = [] } = useQuery({
    queryKey: ['recentShoutOuts'],
    queryFn: () => base44.entities.ShoutOut.list('-created_date', 5),
    staleTime: 120_000,
  });

  const userDepts = currentUser?.departments || [currentUser?.department].filter(Boolean);

  const visibleAnnouncements = announcements.filter(a => {
    if (a.expires_at && new Date(a.expires_at) < new Date()) return false;
    if (a.target_departments?.length > 0) {
      return a.target_departments.some(d => userDepts.includes(d));
    }
    return true;
  });

  // Sort: pinned first
  const sorted = [...visibleAnnouncements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Announcements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Megaphone className="w-4 h-4" /> {t('my_day_feed')}
          </p>
          {canManage && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}>
              <Plus className="w-3 h-3" /> สร้างข่าว
            </Button>
          )}
        </div>

        {sorted.length === 0 ? (
          <Card className="shadow-sm border">
            <CardContent className="p-8 text-center">
              <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">ยังไม่มีข่าวสาร</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sorted.map(a => (
              <Card key={a.id} className="shadow-sm border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_BADGE[a.type] || TYPE_BADGE.info}`}>
                      {TYPE_LABEL[a.type] || 'ข่าวสาร'}
                    </Badge>
                    {a.pinned && <Pin className="w-3 h-3 text-amber-500" />}
                  </div>
                  <p className="font-medium text-sm">{a.pinned ? '📌 ' : ''}{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {a.author_name || a.author_email} · {moment(a.created_date).fromNow()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Shout-outs */}
      {recentShoutOuts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500" /> {t('my_day_shoutouts')}
          </p>
          <div className="space-y-2">
            {recentShoutOuts.map(s => (
              <Card key={s.id} className="shadow-sm border">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{s.from_name}</span>
                        {' ชมเชย '}
                        <span className="font-medium">{s.to_name}</span>
                        {': '}
                        <span className="text-muted-foreground">{s.message}</span>
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
                        {CATEGORY_LABEL[s.category] || s.category}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {canManage && <AnnouncementForm open={showForm} onOpenChange={setShowForm} currentUser={currentUser} />}
    </div>
  );
}