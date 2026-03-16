import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../components/LanguageContext';

export default function RoleManagement() {
  const { t } = useLanguage();
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success(t('saved')); },
  });

  const menuItems = [
    { id: 'dashboard', label: t('menu_dashboard') }, { id: 'tasks', label: t('menu_tasks') },
    { id: 'schedule', label: t('menu_schedule') }, { id: 'customers', label: t('menu_customers') },
    { id: 'templates', label: t('menu_templates') }, { id: 'peak', label: t('menu_peak') },
    { id: 'billing', label: t('menu_billing') }, { id: 'notifications', label: t('menu_notifications') },
    { id: 'line_chat', label: t('menu_line_chat') }, { id: 'reports', label: t('menu_reports') },
    { id: 'users', label: t('menu_users') }, { id: 'roles', label: t('menu_roles') },
    { id: 'audit', label: t('menu_audit') }, { id: 'settings', label: t('menu_settings') },
  ];

  const togglePermission = (menuId) => {
    if (!selectedUser) return;
    const current = selectedUser.menu_permissions || [];
    setSelectedUser(prev => ({ ...prev, menu_permissions: current.includes(menuId) ? current.filter(id => id !== menuId) : [...current, menuId] }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('roles_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('roles_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('users_label')}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {users.map(u => (
              <div key={u.id} onClick={() => setSelectedUser({ ...u })}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-xs font-bold">{u.full_name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{u.full_name}</p><p className="text-[11px] text-muted-foreground">{t(`role_${u.role}`) || 'Staff'}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> {selectedUser ? t('permissions_of', { name: selectedUser.full_name }) : t('roles_title')}
            </CardTitle>
            {selectedUser && !(selectedUser.role === 'admin' || selectedUser.role === 'management') && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedUser(p => ({ ...p, menu_permissions: menuItems.map(m => m.id) }))}>{t('select_all')}</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedUser(p => ({ ...p, menu_permissions: [] }))}>{t('clear')}</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedUser ? <p className="text-sm text-muted-foreground text-center py-8">{t('select_user')}</p> : (
              <div className="space-y-4">
                {(selectedUser.role === 'admin' || selectedUser.role === 'management') ? (
                  <div className="p-4 bg-muted/40 rounded-lg text-center"><Badge variant="secondary" className="bg-green-100 text-green-700">{t('admin_full_access')}</Badge></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {menuItems.map(menu => (
                      <div key={menu.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <Checkbox checked={(selectedUser.menu_permissions || []).includes(menu.id)} onCheckedChange={() => togglePermission(menu.id)} />
                        <span className="text-sm">{menu.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={() => updateMutation.mutate({ id: selectedUser.id, data: { menu_permissions: selectedUser.menu_permissions } })} disabled={updateMutation.isPending} className="w-full gap-2">
                  <Save className="w-4 h-4" /> {updateMutation.isPending ? t('saving') : t('save_permissions')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}