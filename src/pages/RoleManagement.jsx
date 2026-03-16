import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Save } from 'lucide-react';
import { toast } from 'sonner';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'จัดการงาน' },
  { id: 'schedule', label: 'ตารางงาน' },
  { id: 'customers', label: 'ลูกค้า' },
  { id: 'templates', label: 'เทมเพลตงาน' },
  { id: 'peak', label: 'Peak Account' },
  { id: 'billing', label: 'Billing' },
  { id: 'notifications', label: 'แจ้งเตือน' },
  { id: 'line_chat', label: 'Line OA Chat' },
  { id: 'reports', label: 'รายงาน' },
  { id: 'users', label: 'จัดการผู้ใช้' },
  { id: 'roles', label: 'สิทธิ์การใช้งาน' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'settings', label: 'ตั้งค่า' },
];

export default function RoleManagement() {
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('บันทึกสิทธิ์แล้ว');
    },
  });

  const togglePermission = (menuId) => {
    if (!selectedUser) return;
    const current = selectedUser.menu_permissions || [];
    const updated = current.includes(menuId)
      ? current.filter(id => id !== menuId)
      : [...current, menuId];
    setSelectedUser(prev => ({ ...prev, menu_permissions: updated }));
  };

  const selectAll = () => {
    setSelectedUser(prev => ({ ...prev, menu_permissions: MENU_ITEMS.map(m => m.id) }));
  };

  const clearAll = () => {
    setSelectedUser(prev => ({ ...prev, menu_permissions: [] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">สิทธิ์การใช้งาน</h1>
        <p className="text-sm text-muted-foreground mt-1">User Role Management — กำหนดเมนูที่ผู้ใช้เข้าถึงได้</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">ผู้ใช้งาน</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {users.map(u => (
              <div key={u.id}
                onClick={() => setSelectedUser({ ...u })}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-xs font-bold">{u.full_name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.role || 'staff'}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              <Shield className="w-4 h-4 inline mr-2" />
              {selectedUser ? `สิทธิ์ของ ${selectedUser.full_name}` : 'เลือกผู้ใช้'}
            </CardTitle>
            {selectedUser && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>เลือกทั้งหมด</Button>
                <Button variant="outline" size="sm" onClick={clearAll}>ล้าง</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <p className="text-sm text-muted-foreground text-center py-8">เลือกผู้ใช้เพื่อจัดการสิทธิ์</p>
            ) : (
              <div className="space-y-4">
                {selectedUser.role === 'admin' || selectedUser.role === 'management' ? (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">Admin / Management สามารถเข้าถึงทุกเมนูได้</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MENU_ITEMS.map(menu => (
                      <div key={menu.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Checkbox
                          checked={(selectedUser.menu_permissions || []).includes(menu.id)}
                          onCheckedChange={() => togglePermission(menu.id)}
                        />
                        <span className="text-sm">{menu.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={() => updateMutation.mutate({
                  id: selectedUser.id,
                  data: { menu_permissions: selectedUser.menu_permissions }
                })} disabled={updateMutation.isPending} className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}