import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, AlertTriangle, Clock, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const TYPE_CONFIG = {
  due_7days: { icon: Clock, color: 'bg-blue-100 text-blue-700', label: 'อีก 7 วัน' },
  due_3days: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700', label: 'อีก 3 วัน' },
  overdue: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'เกินกำหนด' },
  task_assigned: { icon: Info, color: 'bg-blue-100 text-blue-700', label: 'มอบหมายงาน' },
  task_completed: { icon: CheckCheck, color: 'bg-green-100 text-green-700', label: 'งานเสร็จ' },
  system: { icon: Bell, color: 'bg-gray-100 text-gray-700', label: 'ระบบ' },
  billing: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', label: 'Billing' },
};

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">แจ้งเตือน</h1>
          <p className="text-sm text-muted-foreground mt-1">{unread.length} รายการยังไม่อ่าน</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => unread.forEach(n => markReadMutation.mutate(n.id))}>
            <CheckCheck className="w-4 h-4 mr-2" /> อ่านทั้งหมด
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">กำลังโหลด...</div>
        ) : notifications.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">ไม่มีการแจ้งเตือน</Card>
        ) : (
          notifications.map(n => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            const IconComp = config.icon;
            return (
              <Card key={n.id} className={`hover:shadow-md transition-shadow ${!n.is_read ? 'border-l-4 border-l-primary' : 'opacity-75'}`}
                onClick={() => !n.is_read && markReadMutation.mutate(n.id)}>
                <CardContent className="p-4 flex items-start gap-4 cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className={config.color}>{config.label}</Badge>
                      {n.customer_name && <span className="text-xs text-muted-foreground">{n.customer_name}</span>}
                      <span className="text-xs text-muted-foreground">{format(new Date(n.created_date), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {n.sent_via_email && <Badge variant="outline" className="text-[10px]">Email</Badge>}
                    {n.sent_via_line && <Badge variant="outline" className="text-[10px]">Line</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}