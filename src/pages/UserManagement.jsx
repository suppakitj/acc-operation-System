import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../components/LanguageContext';
import UserTable from '../components/users/UserTable';
import UserFormDialog from '../components/users/UserFormDialog';
import { useAccessControl } from '../components/auth/useAccessControl';
import { useUserList } from '../hooks/useUserList';
import TablePagination, { paginateData } from '../components/shared/TablePagination';

// Employee ID prefixes per department
const DEPT_PREFIX = {
  management: 'MD',
  accounting: 'ACC',
  consulting: 'ACC',
  audit: 'AC',
  billing: 'ACC',
  it: 'IT',
};
const DEPT_START = {
  management: 1, accounting: 1, consulting: 1001, audit: 1, billing: 2001, it: 1,
};

function generateEmployeeId(department, existingUsers) {
  const prefix = DEPT_PREFIX[department] || 'EMP';
  const start = DEPT_START[department] || 1;

  // Find max number for this prefix+range
  const existingIds = existingUsers
    .filter(u => u.employee_id?.startsWith(prefix + '-'))
    .map(u => {
      const num = parseInt(u.employee_id.split('-')[1]);
      return isNaN(num) ? 0 : num;
    })
    .filter(n => n >= start);

  const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : start - 1;
  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export default function UserManagement() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: users = [] } = useUserList();

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await base44.functions.invoke('updateUser', { userId: id, data });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditingUser(null);
      if (resData?.roleUpdateSkipped) {
        toast.warning('บันทึกข้อมูลอื่นแล้ว แต่ไม่สามารถเปลี่ยน Role ได้ (ต้องเปลี่ยนจาก Dashboard ของ Base44)');
      } else {
        toast.success(t('saved'));
      }
    },
    onError: (err) => {
      console.error('User update failed:', err);
      toast.error('บันทึกไม่สำเร็จ: ' + (err?.message || 'ไม่ทราบสาเหตุ'));
    },
  });

  const handleSave = async (formData) => {
    if (editingUser) {
      // Auto-generate employee_id if missing and department is set
      const dept = formData.departments?.[0] || formData.department;
      let employeeId = editingUser.employee_id;
      if (!employeeId && dept) {
        employeeId = generateEmployeeId(dept, users);
      }
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          ...formData,
          employee_id: employeeId || editingUser.employee_id,
          last_modified_by: currentUser?.email || '',
        },
      });
    } else {
      // Invite new user
      const inviteRole = formData.role === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(formData.email, inviteRole);
      toast.success('ส่งคำเชิญเรียบร้อย — ผู้ใช้จะได้รับ email เพื่อลงทะเบียน');
      setShowForm(false);
    }
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.user_status === 'inactive' ? 'active' : 'inactive';
    updateMutation.mutate({
      id: user.id,
      data: { user_status: newStatus, last_modified_by: currentUser?.email || '' },
    });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  // Filter users
    React.useEffect(() => { setPage(1); }, [search, deptFilter, roleFilter, statusFilter]);

  // Filter users
  const filtered = users.filter(u => {
    if (search) {
      const s = search.toLowerCase();
      if (!u.full_name?.toLowerCase().includes(s) && !u.email?.toLowerCase().includes(s) && !u.employee_id?.toLowerCase().includes(s) && !u.username?.toLowerCase().includes(s)) return false;
    }
    if (deptFilter !== 'all') {
      const depts = u.departments || (u.department ? [u.department] : []);
      if (!depts.includes(deptFilter)) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all') {
      const st = u.user_status || 'active';
      if (st !== statusFilter) return false;
    }
    return true;
  });

  // Stats
  const activeCount = users.filter(u => u.user_status !== 'inactive').length;
  const inactiveCount = users.filter(u => u.user_status === 'inactive').length;

  if (!ac.canManageUsers) {
    return <div className="text-center py-12 text-muted-foreground">เฉพาะ Admin เท่านั้นที่จัดการผู้ใช้ได้</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">User Master</h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{users.length} คน</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">จัดการผู้ใช้งาน กำหนดบทบาท และแผนก</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs shrink-0 self-start sm:self-auto"
          onClick={() => { setEditingUser(null); setShowForm(true); }}>
          <UserPlus className="w-3.5 h-3.5" /> เพิ่มผู้ใช้ใหม่
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">Active: {activeCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-xs font-medium text-gray-600">Inactive: {inactiveCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อ, email, รหัส..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs"><SelectValue placeholder="ทุกแผนก" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแผนก</SelectItem>
            {['management', 'accounting', 'consulting', 'audit', 'billing', 'it'].map(d => (
              <SelectItem key={d} value={d}>{t(`dept_${d}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs"><SelectValue placeholder="ทุก Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Role</SelectItem>
            {['admin', 'management', 'manager', 'super_supervisor', 'staff'].map(r => (
              <SelectItem key={r} value={r}>{t(`role_${r}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs"><SelectValue placeholder="ทุกสถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto">{filtered.length} of {users.length}</span>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <>
          <UserTable users={paginateData(filtered, page, pageSize)} onEdit={handleEdit} onToggleStatus={handleToggleStatus} />
          {filtered.length > pageSize && <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="mx-auto w-10 h-10 mb-2" />
          No users match the current filters.
        </div>
      )}

      {/* Form Dialog */}
      <UserFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        user={editingUser}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}