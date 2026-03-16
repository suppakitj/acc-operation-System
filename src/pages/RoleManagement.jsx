import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Check, X, Minus, Pencil, Save, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';

const ROLES = ['admin', 'management', 'manager', 'super_supervisor', 'staff'];

const DEFAULT_MATRIX = [
  { key: 'login', label: 'Login ระบบ', admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  { key: 'user_master', label: 'จัดการ User & User Master', admin: 'yes', management: 'no', manager: 'no', super_supervisor: 'no', staff: 'no' },
  { key: 'role_mgmt', label: 'User Role Management', admin: 'yes', management: 'no', manager: 'no', super_supervisor: 'no', staff: 'no' },
  { key: 'customer', label: 'จัดการ Customer Master Data', admin: 'yes', management: 'yes', manager: 'no', super_supervisor: 'yes', staff: 'no' },
  { key: 'template', label: 'จัดการ Task Template', admin: 'yes', management: 'yes', manager: 'dept', super_supervisor: 'dept', staff: 'no' },
  { key: 'view_task', label: 'ดู Task ทั้งหมด', admin: 'yes', management: 'yes', manager: 'dept', super_supervisor: 'dept', staff: 'dept' },
  { key: 'edit_assignee', label: 'แก้ไขผู้รับผิดชอบ', admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
  { key: 'change_due', label: 'เปลี่ยน Due Date', admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'own' },
  { key: 'change_status', label: 'เปลี่ยน Status งาน', admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'own' },
  { key: 'add_task', label: 'เพิ่ม Task Manual', admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  { key: 'view_billing', label: 'ดู Billing', admin: 'yes', management: 'yes', manager: 'dept', super_supervisor: 'dept', staff: 'no' },
  { key: 'view_schedule', label: 'ดูตารางทีม', admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'dept', staff: 'dept' },
  { key: 'cross_group', label: 'ดูข้ามกลุ่ม', admin: 'yes', management: 'no', manager: 'no', super_supervisor: 'no', staff: 'no' },
  { key: 'peak', label: 'Licensing Peak Account', admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no', staff: 'no' },
];

const PERM_CYCLE = ['yes', 'dept', 'own', 'no'];

function PermCell({ value, editable, onClick }) {
  const content = (() => {
    if (value === 'yes') return <div className="flex justify-center"><Check className="w-4 h-4 text-green-600" /></div>;
    if (value === 'no') return <div className="flex justify-center"><X className="w-4 h-4 text-red-400" /></div>;
    if (value === 'dept') return <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] px-1.5">เฉพาะแผนก</Badge>;
    if (value === 'own') return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 text-[10px] px-1.5">เฉพาะงานตัวเอง</Badge>;
    return <Minus className="w-4 h-4 text-muted-foreground mx-auto" />;
  })();
  if (!editable) return content;
  return (
    <button onClick={onClick} className="w-full flex justify-center cursor-pointer hover:bg-muted/40 rounded py-0.5 transition-colors" title="คลิกเพื่อเปลี่ยน">
      {content}
    </button>
  );
}

const ROLE_LABELS = {
  admin: 'Admin',
  management: 'Management',
  manager: 'Manager',
  super_supervisor: 'Super Supervisor',
  staff: 'Staff',
};

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  management: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  super_supervisor: 'bg-yellow-100 text-yellow-700',
  staff: 'bg-gray-100 text-gray-700',
};

export default function RoleManagement() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isEditingMatrix, setIsEditingMatrix] = useState(false);
  const [matrixEdits, setMatrixEdits] = useState(null); // local edits before save

  // Load saved matrix from AppConfig
  const { data: matrixConfigs = [] } = useQuery({
    queryKey: ['appConfig', 'permission_matrix'],
    queryFn: () => base44.entities.AppConfig.filter({ key: 'permission_matrix' }),
  });

  const savedMatrix = (() => {
    const cfg = matrixConfigs.find(c => c.key === 'permission_matrix');
    if (cfg?.value) {
      try { return JSON.parse(cfg.value); } catch { return null; }
    }
    return null;
  })();

  // Merge saved overrides into default matrix
  const matrix = DEFAULT_MATRIX.map(row => {
    const source = isEditingMatrix && matrixEdits ? matrixEdits : savedMatrix;
    if (source?.[row.key]) {
      return { ...row, ...source[row.key] };
    }
    return row;
  });

  const saveMatrixMutation = useMutation({
    mutationFn: async (overrides) => {
      const cfg = matrixConfigs.find(c => c.key === 'permission_matrix');
      const val = JSON.stringify(overrides);
      if (cfg) {
        await base44.entities.AppConfig.update(cfg.id, { value: val });
      } else {
        await base44.entities.AppConfig.create({ key: 'permission_matrix', value: val, description: 'Permission matrix overrides' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig', 'permission_matrix'] });
      setIsEditingMatrix(false);
      setMatrixEdits(null);
      toast.success('บันทึก Permission Matrix เรียบร้อย');
    },
  });

  const handleCellClick = (permKey, role) => {
    if (!isEditingMatrix) return;
    const current = matrixEdits || {};
    const rowOverrides = current[permKey] || {};
    const currentRow = DEFAULT_MATRIX.find(r => r.key === permKey);
    const currentVal = rowOverrides[role] || currentRow[role];
    const nextIdx = (PERM_CYCLE.indexOf(currentVal) + 1) % PERM_CYCLE.length;
    setMatrixEdits({
      ...current,
      [permKey]: { ...rowOverrides, [role]: PERM_CYCLE[nextIdx] },
    });
  };

  const handleSaveMatrix = () => {
    if (!matrixEdits) { setIsEditingMatrix(false); return; }
    // Merge with existing saved
    const existing = savedMatrix || {};
    const merged = { ...existing };
    Object.entries(matrixEdits).forEach(([key, vals]) => {
      merged[key] = { ...(merged[key] || {}), ...vals };
    });
    saveMatrixMutation.mutate(merged);
  };

  const handleStartEditMatrix = () => {
    setMatrixEdits(null); // start fresh edits
    setIsEditingMatrix(true);
  };

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUserId(null);
      setSelectedRole('');
      toast.success('บันทึก Role เรียบร้อย');
    },
  });

  if (!ac.canManageRoles) {
    return <div className="text-center py-12 text-muted-foreground">เฉพาะ Admin เท่านั้นที่จัดการสิทธิ์ได้</div>;
  }

  // Count users per role
  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" /> User Role Management
        </h1>
        <p className="text-sm text-muted-foreground">Role Permission Matrix — กำหนดสิทธิ์การใช้งานตาม Role</p>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ROLES.map(role => (
          <Card key={role} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className={`text-[10px] ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
            </div>
            <p className="text-lg font-bold">{roleCounts[role]}</p>
            <p className="text-[11px] text-muted-foreground">คน</p>
          </Card>
        ))}
      </div>

      {/* Permission Matrix Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Permission Matrix</CardTitle>
          <div className="flex gap-2">
            {isEditingMatrix ? (
              <>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                  onClick={() => { setIsEditingMatrix(false); setMatrixEdits(null); }}>
                  <XCircle className="w-3 h-3" /> ยกเลิก
                </Button>
                <Button size="sm" className="text-xs h-7 gap-1" disabled={saveMatrixMutation.isPending}
                  onClick={handleSaveMatrix}>
                  <Save className="w-3 h-3" /> บันทึก
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={handleStartEditMatrix}>
                <Pencil className="w-3 h-3" /> แก้ไข
              </Button>
            )}
          </div>
        </CardHeader>
        {isEditingMatrix && (
          <div className="px-6 pb-2">
            <p className="text-[11px] text-muted-foreground bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
              คลิกที่ช่องเพื่อสลับค่า: ✅ ใช่ → 🏢 เฉพาะแผนก → 👤 เฉพาะงานตัวเอง → ❌ ไม่ → ✅ ใช่
            </p>
          </div>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground min-w-[200px]">ความสามารถ</th>
                  {ROLES.map(role => (
                    <th key={role} className="px-3 py-3 text-center min-w-[100px]">
                      <Badge variant="secondary" className={`text-[10px] ${ROLE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={row.key} className={`border-b last:border-b-0 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/10'}`}>
                    <td className="px-4 py-2.5 text-xs font-medium">{row.label}</td>
                    {ROLES.map(role => (
                      <td key={role} className="px-3 py-2.5 text-center">
                        <PermCell
                          value={row[role]}
                          editable={isEditingMatrix}
                          onClick={() => handleCellClick(row.key, role)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User List by Role */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ผู้ใช้ตาม Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ROLES.map(role => {
              const roleUsers = users.filter(u => u.role === role);
              if (roleUsers.length === 0) return null;
              return (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={`text-[10px] ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
                    <span className="text-xs text-muted-foreground">{roleUsers.length} คน</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {roleUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary text-[10px] font-bold">{u.full_name?.[0]?.toUpperCase() || 'U'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{u.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger className="h-7 w-[130px] text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map(r => (
                                  <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={updateRoleMutation.isPending}
                              onClick={() => updateRoleMutation.mutate({ id: u.id, role: selectedRole })}>
                              <Save className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => { setEditingUserId(null); setSelectedRole(''); }}>
                              <XCircle className="w-3 h-3 text-red-400" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                            onClick={() => { setEditingUserId(u.id); setSelectedRole(u.role || 'staff'); }}>
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}