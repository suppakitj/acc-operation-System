import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '../LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const ROLES = ['admin', 'management', 'manager', 'super_supervisor', 'staff'];
const DEPTS = ['management', 'accounting', 'consulting', 'audit', 'billing', 'it'];

export default function UserFormDialog({ open, onOpenChange, user, onSave, isSaving }) {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const canSeeCost = currentUser?.role === 'admin' || currentUser?.role === 'management';
  const isEdit = !!user;

  const [form, setForm] = useState({
    username: '', nickname: '', initials: '', phone: '', position: '',
    role: 'staff', departments: [], department: '',
    user_status: 'active', hourly_cost: 0,
  });

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        nickname: user.nickname || '',
        initials: user.initials || '',
        phone: user.phone || '',
        position: user.position || '',
        role: user.role || 'staff',
        departments: user.departments || (user.department ? [user.department] : []),
        department: user.department || '',
        user_status: user.user_status || 'active',
        hourly_cost: user.hourly_cost || 0,
      });
    } else {
      setForm({ username: '', nickname: '', initials: '', phone: '', position: '', role: 'staff', departments: [], department: '', user_status: 'active', hourly_cost: 0 });
    }
  }, [user, open]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleDept = (d) => {
    const current = form.departments || [];
    const updated = current.includes(d) ? current.filter(x => x !== d) : [...current, d];
    setForm(prev => ({ ...prev, departments: updated, department: updated[0] || '' }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      department: form.departments[0] || form.department || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isEdit && (
            <>
              <div><Label>ชื่อ-นามสกุล</Label><p className="text-sm mt-1 font-medium">{user.full_name}</p></div>
              <div><Label>Email</Label><p className="text-sm mt-1 text-muted-foreground">{user.email}</p></div>
              {user.employee_id && <div><Label>รหัสพนักงาน</Label><p className="text-sm mt-1 font-mono text-primary">{user.employee_id}</p></div>}
            </>
          )}

          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>ชื่อ-นามสกุล *</Label>
                <Input value={form.full_name || ''} onChange={e => update('full_name', e.target.value)} placeholder="เช่น สมชาย ใจดี" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email || ''} onChange={e => update('email', e.target.value)} placeholder="user@company.com" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={form.username} onChange={e => update('username', e.target.value)} placeholder="username" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ชื่อเล่น</Label>
              <Input value={form.nickname} onChange={e => update('nickname', e.target.value)} placeholder="เช่น นุ้ย, แอน" />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อย่อ</Label>
              <Input value={form.initials} onChange={e => update('initials', e.target.value)} placeholder="เช่น NP, AK" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>เบอร์โทร</Label>
            <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="08x-xxx-xxxx" />
          </div>

          <div className="space-y-1.5">
            <Label>ตำแหน่งงาน</Label>
            <Input value={form.position} onChange={e => update('position', e.target.value)} placeholder="เช่น หัวหน้าทีม, เจ้าหน้าที่บัญชี" />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => update('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{t(`role_${r}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>แผนกที่สังกัด (เลือกได้หลายแผนก)</Label>
            <div className="grid grid-cols-2 gap-2">
              {DEPTS.map(d => (
                <div key={d} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox checked={form.departments.includes(d)} onCheckedChange={() => toggleDept(d)} />
                  <span className="text-sm">{t(`dept_${d}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {canSeeCost && isEdit && (
            <div className="space-y-1.5">
              <Label>ต้นทุนต่อชั่วโมง (฿/ชม.)</Label>
              <Input type="number" value={form.hourly_cost || ''} onChange={e => update('hourly_cost', parseFloat(e.target.value) || 0)} placeholder="เช่น 250" />
              <p className="text-[10px] text-muted-foreground">ใช้สำหรับคำนวณใน Staff Cost Report</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>สถานะ</Label>
            <Select value={form.user_status} onValueChange={v => update('user_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={isSaving || (!isEdit && (!form.email || !form.full_name))} className="w-full">
            {isSaving ? t('saving') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}