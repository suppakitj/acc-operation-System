import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../components/LanguageContext';

const ROLE_COLORS = { admin: 'bg-red-100 text-red-700', management: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', super_supervisor: 'bg-yellow-100 text-yellow-700', staff: 'bg-gray-100 text-gray-700' };

export default function UserManagement() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [editingUser, setEditingUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setEditingUser(null); },
  });

  const filtered = users.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  const roles = ['admin', 'management', 'manager', 'super_supervisor', 'staff'];
  const depts = ['management', 'accounting', 'consulting', 'audit', 'billing', 'it'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('users_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('users_subtitle')} — {users.length} {t('people')}</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2 shrink-0 self-start sm:self-auto">
          <UserPlus className="w-4 h-4" /> {t('invite_user')}
        </Button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={t('search_users')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>

      <div className="space-y-2">
        {filtered.map(user => (
          <Card key={user.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => setEditingUser({ ...user })}>
            <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-xs md:text-sm">{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <span className="hidden sm:flex gap-1 flex-wrap">{(user.departments || (user.department ? [user.department] : [])).map(d => <Badge key={d} variant="outline" className="text-[10px]">{t(`dept_${d}`)}</Badge>)}</span>
              <Badge variant="secondary" className={ROLE_COLORS[user.role] || ROLE_COLORS.staff}>{t(`role_${user.role}`) || 'Staff'}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('invite_title')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t('email')} *</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('role')}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">User</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={async () => { await base44.users.inviteUser(inviteEmail, inviteRole === 'admin' ? 'admin' : 'user'); toast.success(t('saved')); setShowInvite(false); setInviteEmail(''); }} disabled={!inviteEmail} className="w-full">{t('send_invite')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('edit_user')}</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div><Label>{t('name')}</Label><p className="text-sm mt-1">{editingUser.full_name}</p></div>
              <div><Label>{t('email')}</Label><p className="text-sm mt-1">{editingUser.email}</p></div>
              <div className="space-y-1.5"><Label>{t('role')}</Label>
                <Select value={editingUser.role || 'staff'} onValueChange={v => setEditingUser(p => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{t(`role_${r}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{t('department')} (หลายแผนกได้)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {depts.map(d => {
                    const checked = (editingUser.departments || (editingUser.department ? [editingUser.department] : [])).includes(d);
                    return (
                      <div key={d} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                        <Checkbox checked={checked} onCheckedChange={() => {
                          const current = editingUser.departments || (editingUser.department ? [editingUser.department] : []);
                          const updated = checked ? current.filter(x => x !== d) : [...current, d];
                          setEditingUser(p => ({ ...p, departments: updated, department: updated[0] || '' }));
                        }} />
                        <span className="text-sm">{t(`dept_${d}`)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5"><Label>{t('phone')}</Label><Input value={editingUser.phone || ''} onChange={e => setEditingUser(p => ({ ...p, phone: e.target.value }))} /></div>
              <Button onClick={() => updateMutation.mutate({ id: editingUser.id, data: { role: editingUser.role, departments: editingUser.departments || (editingUser.department ? [editingUser.department] : []), department: (editingUser.departments || [editingUser.department])[0] || '', phone: editingUser.phone } })} disabled={updateMutation.isPending} className="w-full">{updateMutation.isPending ? t('saving') : t('save')}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}