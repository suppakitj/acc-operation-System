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
import { Plus, Search, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const DEPT_LABELS = {
  management: 'Management', accounting: 'บัญชี', consulting: 'ที่ปรึกษา',
  audit: 'Audit', billing: 'Billing', it: 'IT'
};

const ROLE_LABELS = {
  admin: 'Admin', management: 'Management', manager: 'Manager',
  super_supervisor: 'Super Supervisor', staff: 'Staff'
};

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700', management: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700', super_supervisor: 'bg-yellow-100 text-yellow-700',
  staff: 'bg-gray-100 text-gray-700'
};

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [editingUser, setEditingUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setEditingUser(null); },
  });

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async () => {
    await base44.users.inviteUser(inviteEmail, inviteRole === 'admin' ? 'admin' : 'user');
    toast.success('ส่งคำเชิญแล้ว');
    setShowInvite(false);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-muted-foreground mt-1">User Master — {users.length} คน</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> เชิญผู้ใช้
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ค้นหาผู้ใช้..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map(user => (
          <Card key={user.id} className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setEditingUser(user)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-semibold text-sm">{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{user.full_name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              {user.department && <Badge variant="outline">{DEPT_LABELS[user.department] || user.department}</Badge>}
              <Badge variant="secondary" className={ROLE_COLORS[user.role] || ROLE_COLORS.staff}>
                {ROLE_LABELS[user.role] || user.role || 'Staff'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>เชิญผู้ใช้ใหม่</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>อีเมล *</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={!inviteEmail} className="w-full">ส่งคำเชิญ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div><Label>ชื่อ</Label><p className="text-sm mt-1">{editingUser.full_name}</p></div>
              <div><Label>อีเมล</Label><p className="text-sm mt-1">{editingUser.email}</p></div>
              <div className="space-y-1.5">
                <Label>ตำแหน่ง</Label>
                <Select value={editingUser.role || 'staff'} onValueChange={v => setEditingUser(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>แผนก</Label>
                <Select value={editingUser.department || ''} onValueChange={v => setEditingUser(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>เบอร์โทร</Label>
                <Input value={editingUser.phone || ''} onChange={e => setEditingUser(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <Button onClick={() => updateMutation.mutate({
                id: editingUser.id,
                data: { role: editingUser.role, department: editingUser.department, phone: editingUser.phone }
              })} disabled={updateMutation.isPending} className="w-full">
                {updateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}