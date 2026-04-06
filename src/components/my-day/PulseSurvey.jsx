import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getISOWeek, getYear } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

const MOODS = [
  { key: 'great', emoji: '😊', labelKey: 'my_day_pulse_great' },
  { key: 'good', emoji: '🙂', labelKey: 'my_day_pulse_good' },
  { key: 'neutral', emoji: '😐', labelKey: 'my_day_pulse_neutral' },
  { key: 'stressed', emoji: '😓', labelKey: 'my_day_pulse_stressed' },
  { key: 'burned_out', emoji: '😫', labelKey: 'my_day_pulse_burned_out' },
];

export default function PulseSurvey({ currentUser }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const now = new Date();
  const weekKey = `${getYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;

  const { data: existingResponse, isLoading } = useQuery({
    queryKey: ['pulseResponse', currentUser?.email, weekKey],
    queryFn: async () => {
      const results = await base44.entities.PulseResponse.filter(
        { user_email: currentUser.email, week_key: weekKey },
        '-created_date',
        1
      );
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!currentUser?.email,
  });

  const submitPulse = useMutation({
    mutationFn: (mood) => base44.entities.PulseResponse.create({
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      department: currentUser.department || '',
      mood,
      week_key: weekKey,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulseResponse'] });
      toast.success('บันทึกแล้ว ขอบคุณ!');
    },
  });

  if (isLoading) return null;

  // Already answered this week
  if (existingResponse) {
    const answeredMood = MOODS.find(m => m.key === existingResponse.mood);
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-pink-500" /> Pulse Check
        </p>
        <Card className="shadow-sm border bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{answeredMood?.emoji || '✅'}</span>
              <div>
                <p className="text-sm font-medium text-green-700">{t('my_day_pulse_done')}</p>
                <p className="text-[10px] text-green-600">{t('my_day_pulse_done_sub')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not answered yet
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Heart className="w-4 h-4 text-pink-500" /> Pulse Check
      </p>
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">{t('my_day_pulse_title')}</p>
          <div className="flex justify-between gap-2">
            {MOODS.map(m => (
              <button
                key={m.key}
                onClick={() => submitPulse.mutate(m.key)}
                disabled={submitPulse.isPending}
                className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border border-border
                           hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{t(m.labelKey)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}