import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, AlertTriangle, Clock, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import { parseUTCDate } from '@/lib/dateUtils';

export default function Notifications() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ target_user: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter(n => !n.is_read);

  const TYPE_CONFIG = {
    due_7days: { icon: Clock, color: 'bg-blue-100 text-blue-700', label: t('notif_due_7days') },
    due_3days: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700', label: t('notif_due_3days') },
    overdue: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: t('notif_overdue') },
    task_assigned: { icon: Info, color: 'bg-blue-100 text-blue-700', label: t('notif_assigned') },
    task_completed: { icon: CheckCheck, color: 'bg-green-100 text-green-700', label: t('notif_completed') },
    system: { icon: Bell, color: 'bg-gray-100 text-gray-700', label: t('notif_system') },
    billing: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', label: t('notif_billing') },
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('notif_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('notif_unread', { n: unread.length })}</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => unread.forEach(n => markReadMutation.mutate(n.id))} className="gap-2 self-start sm:self-auto">
            <CheckCheck className="w-4 h-4" /> {t('mark_all_read')}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? <div className="text-center py-12 text-muted-foreground">{t('loading')}</div> :
         notifications.length === 0 ? <Card className="p-8 text-center text-muted-foreground">{t('no_notifications')}</Card> :
         notifications.map(n => {
           const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
           const IconComp = config.icon;
           return (
             <Card key={n.id} className={`hover:shadow-md transition-all ${!n.is_read ? 'border-l-4 border-l-primary' : 'opacity-70'}`}
               onClick={() => !n.is_read && markReadMutation.mutate(n.id)}>
               <CardContent className="p-3 md:p-4 flex items-start gap-3 md:gap-4 cursor-pointer">
                 <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}><IconComp className="w-4 h-4 md:w-5 md:h-5" /></div>
                 <div className="flex-1 min-w-0">
                   <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                   <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                   <div className="flex items-center gap-2 mt-2 flex-wrap">
                     <Badge variant="secondary" className={config.color}>{config.label}</Badge>
                     {n.customer_name && <span className="text-xs text-muted-foreground">{n.customer_name}</span>}
                     <span className="text-xs text-muted-foreground">{format(parseUTCDate(n.created_date), 'dd/MM/yyyy HH:mm')}</span>
                   </div>
                 </div>
               </CardContent>
             </Card>
           );
         })}
      </div>
    </div>
  );
}