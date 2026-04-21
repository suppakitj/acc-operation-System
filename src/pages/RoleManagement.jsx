import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '../hooks/useUserList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Pencil, Save, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '../components/auth/useAccessControl';

const ROLES = ['admin', 'management', 'manager', 'super_supervisor', 'staff'];
const ROLE_LABELS = {
  admin: 'Admin', management: 'Management', manager: 'Manager',
  super_supervisor: 'Super Supervisor', staff: 'Staff',
};
const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  management: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  super_supervisor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  staff: 'bg-gray-100 text-gray-700 border-gray-200',
};

const PERM_OPTIONS = [
  { value: 'yes', label: '✅ ใช่', color: 'text-green-700 bg-green-50' },
  { value: 'dept', label: '🏢 เฉพาะแผนก', color: 'text-blue-700 bg-blue-50' },
  { value: 'own', label: '👤 เฉพาะงานตัวเอง', color: 'text-yellow-700 bg-yellow-50' },
  { value: 'edit_only', label: '✏️ แก้ไขเท่านั้น', color: 'text-orange-700 bg-orange-50' },
  { value: 'view_only', label: '👁 ดูอย่างเดียว', color: 'text-teal-700 bg-teal-50' },
  { value: 'no', label: '❌ ไม่', color: 'text-red-700 bg-red-50' },
];

const PERMISSION_GROUPS = [
  {
    name: '🔐 ระบบ & ผู้ใช้',
    items: [
      { key: 'login', label: 'Login ระบบ' },
      { key: 'user_master', label: 'จัดการ User & User Master' },
      { key: 'role_mgmt', label: 'User Role Management' },
      { key: 'audit_log', label: 'Audit Log' },
      { key: 'db_backup', label: 'Backup Database' },
    ],
  },
  {
    name: '📋 งาน (Task)',
    items: [
      { key: 'view_task', label: 'ดู Task ทั้งหมด' },
      { key: 'add_task', label: 'เพิ่ม Task Manual' },
      { key: 'edit_assignee', label: 'แก้ไขผู้รับผิดชอบ' },
      { key: 'change_due', label: 'เปลี่ยน Due Date' },
      { key: 'change_status', label: 'เปลี่ยน Status งาน' },
      { key: 'template', label: 'จัดการ Task Template' },
      { key: 'task_generation', label: 'สร้างงานอัตโนมัติ' },
      { key: 'task_calendar', label: 'Task Calendar (Drag & Drop)' },
      { key: 'cross_group', label: 'ดูข้ามกลุ่ม' },
    ],
  },
  {
    name: '📅 ตารางงาน',
    items: [
      { key: 'view_schedule', label: 'ดูตารางทีม' },
      { key: 'add_schedule', label: 'เพิ่มตารางงาน' },
      { key: 'edit_schedule', label: 'แก้ไข/ลบตารางงาน' },
    ],
  },
  {
    name: '👥 ลูกค้า & Billing',
    items: [
      { key: 'customer', label: 'จัดการ Customer Master Data' },
      { key: 'view_billing', label: 'ดู Billing' },
      { key: 'peak', label: 'Licensing Peak Account' },
      { key: 'referral', label: 'ค่าแนะนำ (Referral)' },
      { key: 'customer_profile', label: 'Customer Profile Dashboard' },
      { key: 'customer_health', label: 'Customer Health Score' },
      { key: 'credential_vault', label: 'Credential Vault' },
      { key: 'director_vault', label: 'ข้อมูลกรรมการ (PDPA)' },
      { key: 'external_service', label: 'External Service Master' },
    ],
  },
  {
    name: '📊 รายงาน & วิเคราะห์',
    items: [
      { key: 'staff_dashboard', label: 'Staff Dashboard' },
      { key: 'team_analytics', label: 'Team Analytics' },
      { key: 'engagement_insights', label: 'Engagement Insights' },
      { key: 'obligation_dashboard', label: 'Obligation Dashboard' },
      { key: 'customer_summary', label: 'สรุปงานลูกค้า' },
      { key: 'time_tracking', label: 'SLA / Time Tracking' },
      { key: 'workload', label: 'Workload Balancer' },
      { key: 'staff_cost_report', label: 'Staff Cost Report' },
      { key: 'kpi_dashboard', label: 'KPI Dashboard' },
      { key: 'forecast_risk', label: 'Forecast & Risk' },
      { key: 'reports', label: 'รายงาน (Reports)' },
    ],
  },
  {
    name: '⚙️ Master Data & เครื่องมือ',
    items: [
      { key: 'service_master', label: 'Service Master' },
      { key: 'holiday_master', label: 'Holiday Master' },
      { key: 'tax_calendar', label: 'ปฏิทินภาษี' },
      { key: 'ocr', label: 'OCR (แปลงเอกสาร)' },
      { key: 'knowledge_base', label: 'Knowledge Base (อ่าน)' },
      { key: 'knowledge_manage', label: 'จัดการ Knowledge Base' },
    ],
  },
  {
    name: '🏠 My Day & สื่อสาร',
    items: [
      { key: 'my_day', label: 'My Day (หน้าแรก)' },
      { key: 'my_skills', label: 'ทักษะของฉัน' },
      { key: 'meeting_notes', label: 'Meeting Notes (สั่งงาน/บันทึกประชุม)' },
      { key: 'announcement_manage', label: 'สร้าง/จัดการข่าวสาร' },
      { key: 'shoutout', label: 'ส่ง Shout-out ชมเชย' },
      { key: 'findings_dashboard', label: 'Findings Dashboard' },
      { key: 'my_ideas', label: 'ไอเดียของฉัน' },
      { key: 'staff_scorecard', label: 'Performance Scorecard' },
      { key: 'team_ranking', label: 'Team Ranking' },
      { key: 'rework_analytics', label: 'Rework Analytics' },
      { key: 'postpone_analytics', label: 'Postpone Analytics' },
    ],
  },
];

const DEFAULT_PERMS = {
  login:          { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  user_master:    { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  role_mgmt:      { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  audit_log:      { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  db_backup:      { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  view_task:      { admin: 'yes', management: 'yes', manager: 'dept', super_supervisor: 'dept', staff: 'dept' },
  add_task:       { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  edit_assignee:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
  change_due:     { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'own' },
  change_status:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'own' },
  template:       { admin: 'yes', management: 'yes', manager: 'dept', super_supervisor: 'dept', staff: 'no' },
  task_generation:{ admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  task_calendar:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  cross_group:    { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  view_schedule:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'dept', staff: 'dept' },
  add_schedule:   { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  edit_schedule:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'own' },
  customer:       { admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'yes', staff: 'edit_only' },
  view_billing:   { admin: 'yes', management: 'yes', manager: 'dept', super_supervisor: 'dept', staff: 'no' },
  peak:           { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no',  staff: 'no' },
  referral:       { admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  customer_profile:{ admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  customer_health: { admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  credential_vault:{ admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  director_vault:  { admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  external_service:{ admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  staff_dashboard: { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no',  staff: 'no' },
  team_analytics:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no',  staff: 'no' },
  engagement_insights: { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no', staff: 'no' },
  obligation_dashboard: { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no', staff: 'no' },
  customer_summary:{ admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no',  staff: 'no' },
  time_tracking:   { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  workload:        { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no',  staff: 'no' },
  staff_cost_report:{ admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no',  staff: 'no' },
  kpi_dashboard:   { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
  forecast_risk:   { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
  reports:         { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  service_master:  { admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  holiday_master:  { admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  tax_calendar:    { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  ocr:             { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  knowledge_base:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  knowledge_manage:{ admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  my_day:          { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  my_skills:       { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  announcement_manage: { admin: 'yes', management: 'yes', manager: 'no', super_supervisor: 'no', staff: 'no' },
  shoutout:        { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  meeting_notes:   { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  findings_dashboard: { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  my_ideas:        { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  staff_scorecard: { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  team_ranking:    { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
  rework_analytics:{ admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
  postpone_analytics:{ admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
};

function PermValue({ value }) {
  const opt = PERM_OPTIONS.find(o => o.value === value);
  if (!opt) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${opt.color}`}>
      {opt.label}
    </span>
  );
}

export default function RoleManagement() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const { data: users = [] } = useUserList();

  const [activeRole, setActiveRole] = useState('manager');
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});

  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  const { data: matrixConfigs = [] } = useQuery({
    queryKey: ['appConfig', 'permission_matrix'],
    queryFn: () => base44.entities.AppConfig.filter({ key: 'permission_matrix' }),
  });

  const savedOverrides = useMemo(() => {
    const cfg = matrixConfigs.find(c => c.key === 'permission_matrix');
    if (cfg?.value) {
      try { return JSON.parse(cfg.value); } catch { return {}; }
    }
    return {};
  }, [matrixConfigs]);

  const getPermValue = (permKey, role) => {
    if (savedOverrides[permKey]?.[role] !== undefined) return savedOverrides[permKey][role];
    return DEFAULT_PERMS[permKey]?.[role] || 'no';
  };

  const getCurrentValue = (permKey) => {
    if (isEditing && editValues[permKey] !== undefined) return editValues[permKey];
    return getPermValue(permKey, activeRole);
  };

  const handleStartEdit = () => {
    const current = {};
    PERMISSION_GROUPS.forEach(g => {
      g.items.forEach(item => {
        current[item.key] = getPermValue(item.key, activeRole);
      });
    });
    setEditValues(current);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditValues({});
    setIsEditing(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existing = { ...savedOverrides };
      Object.entries(editValues).forEach(([permKey, value]) => {
        if (!existing[permKey]) existing[permKey] = {};
        existing[permKey][activeRole] = value;
      });
      const cfg = matrixConfigs.find(c => c.key === 'permission_matrix');
      const val = JSON.stringify(existing);
      if (cfg) {
        await base44.entities.AppConfig.update(cfg.id, { value: val });
      } else {
        await base44.entities.AppConfig.create({ key: 'permission_matrix', value: val, description: 'Permission matrix overrides' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      setIsEditing(false);
      setEditValues({});
      toast.success(`บันทึกสิทธิ์ ${ROLE_LABELS[activeRole]} เรียบร้อย`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUserId(null);
      setSelectedRole('');
      toast.success('เปลี่ยน Role เรียบร้อย');
    },
  });

  if (!ac.canManageRoles) {
    return <div className="text-center py-12 text-muted-foreground">เฉพาะ Admin เท่านั้นที่จัดการสิทธิ์ได้</div>;
  }

  const roleUsers = users.filter(u => u.role === activeRole);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" /> User Role Management
        </h1>
        <p className="text-sm text-muted-foreground">เลือก Role แล้วดู/แก้ไขสิทธิ์ — แก้ทีละ Role ป้องกันแก้ผิด</p>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          const isActive = activeRole === role;
          return (
            <button
              key={role}
              onClick={() => {
                if (isEditing) { toast.error('กรุณาบันทึกหรือยกเลิกก่อนเปลี่ยน Role'); return; }
                setActiveRole(role);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                isActive
                  ? `${ROLE_COLORS[role]} border-current shadow-sm`
                  : 'bg-card border-border hover:border-primary/30'
              }`}
            >
              <span className={`text-sm font-medium ${isActive ? '' : 'text-muted-foreground'}`}>
                {ROLE_LABELS[role]}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
            </button>
          );
        })}
      </div>

      {/* Permission List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              สิทธิ์ของ <Badge className={`${ROLE_COLORS[activeRole]} text-xs`}>{ROLE_LABELS[activeRole]}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {roleUsers.length} คน — {isEditing ? 'กำลังแก้ไข (เลือกค่าจาก dropdown)' : 'โหมดดู'}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={handleCancelEdit}>
                  <XCircle className="w-3.5 h-3.5" /> ยกเลิก
                </Button>
                <Button size="sm" className="text-xs h-8 gap-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save className="w-3.5 h-3.5" /> บันทึก
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={handleStartEdit}>
                <Pencil className="w-3.5 h-3.5" /> แก้ไขสิทธิ์ {ROLE_LABELS[activeRole]}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {PERMISSION_GROUPS.map(group => (
            <div key={group.name}>
              <div className="px-4 py-2 bg-muted/50 border-y text-xs font-bold">{group.name}</div>
              {group.items.map((item, i) => {
                const value = getCurrentValue(item.key);
                return (
                  <div key={item.key} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <span className="text-xs font-medium pl-2">{item.label}</span>
                    {isEditing ? (
                      <Select
                        value={value}
                        onValueChange={v => setEditValues(prev => ({ ...prev, [item.key]: v }))}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERM_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <PermValue value={value} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Users in this Role */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            ผู้ใช้ที่เป็น {ROLE_LABELS[activeRole]} ({roleUsers.length} คน)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roleUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">ไม่มีผู้ใช้ใน Role นี้</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {roleUsers.map(u => (
                <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-[11px] font-bold">{u.full_name?.[0]?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{u.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {editingUserId === u.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="h-7 w-[130px] text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>)}
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
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                      onClick={() => { setEditingUserId(u.id); setSelectedRole(u.role || 'staff'); }}>
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}