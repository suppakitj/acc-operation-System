import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useLanguage } from '../LanguageContext';

export default function GreetingHeader({ user }) {
  const { t } = useLanguage();
  const hour = new Date().getHours();

  const greeting = hour < 12
    ? t('my_day_greeting_morning')
    : hour < 17
      ? t('my_day_greeting_afternoon')
      : t('my_day_greeting_evening');

  const displayName = user?.nickname || user?.full_name || '';
  const today = format(new Date(), 'EEEEที่ d MMMM yyyy', { locale: th });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold">
        {greeting} {displayName} 👋
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{today}</p>
    </div>
  );
}