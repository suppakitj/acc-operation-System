import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Globe, Calculator, FileText, Building2, Users,
  HardDrive, MessageCircle, BookOpen, CreditCard, Scale,
  Briefcase, Mail, Phone, Shield, Database, Folder, Star,
  Link, ExternalLink, Monitor, Smartphone, Cloud, Lock,
  Search, Settings, Zap, Target, Activity, BarChart3, PieChart,
  ClipboardList, Calendar, Clock, DollarSign, Receipt, Landmark,
  GraduationCap, Heart, Home, Key, Layers, Map, Megaphone,
  Package, Printer, Server, Share2, ShoppingCart, Truck, Wifi, LayoutGrid,
} from 'lucide-react';

const ICON_MAP = {
  Globe, Calculator, FileText, Building2, Users,
  HardDrive, MessageCircle, BookOpen, CreditCard, Scale,
  Briefcase, Mail, Phone, Shield, Database, Folder, Star,
  Link, ExternalLink, Monitor, Smartphone, Cloud, Lock,
  Search, Settings, Zap, Target, Activity, BarChart3, PieChart,
  ClipboardList, Calendar, Clock, DollarSign, Receipt, Landmark,
  GraduationCap, Heart, Home, Key, Layers, Map, Megaphone,
  Package, Printer, Server, Share2, ShoppingCart, Truck, Wifi, LayoutGrid,
};

const COLORS = [
  { value: 'blue', label: 'Blue', cls: 'bg-blue-100 text-blue-700' },
  { value: 'green', label: 'Green', cls: 'bg-green-100 text-green-700' },
  { value: 'amber', label: 'Amber', cls: 'bg-amber-100 text-amber-700' },
  { value: 'red', label: 'Red', cls: 'bg-red-100 text-red-700' },
  { value: 'purple', label: 'Purple', cls: 'bg-purple-100 text-purple-700' },
  { value: 'pink', label: 'Pink', cls: 'bg-pink-100 text-pink-700' },
  { value: 'teal', label: 'Teal', cls: 'bg-teal-100 text-teal-700' },
  { value: 'slate', label: 'Slate', cls: 'bg-slate-100 text-slate-700' },
];

const CATEGORIES = [
  { value: 'tax_gov', label: '📋 ภาษี & ราชการ' },
  { value: 'accounting', label: '📊 บัญชี' },
  { value: 'hr_social', label: '👥 HR & ประกันสังคม' },
  { value: 'internal', label: '🏢 ระบบภายใน' },
  { value: 'other', label: '🔗 อื่นๆ' },
];

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'management', label: 'Management' },
  { value: 'manager', label: 'Manager' },
  { value: 'super_supervisor', label: 'Super Supervisor' },
  { value: 'staff', label: 'Staff' },
];

const DEPARTMENTS = [
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

const DEFAULT_FORM = {
  name: '', url: '', icon: 'Globe', color: 'blue', category: 'other',
  description: '', target_roles: [], target_departments: [],
  sort_order: 10, status: 'active', open_in_new_tab: true,
};

export default function MiniAppFormDialog({ open, onOpenChange, app }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (open) setForm({ ...DEFAULT_FORM, ...app });
  }, [open, app]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleArr = (field, val) => {
    const list = form[field] || [];
    update(field, list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MiniApp.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['miniApps'] }); onOpenChange(false); toast.success('เพิ่ม Mini App แล้ว'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MiniApp.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['miniApps'] }); onOpenChange(false); toast.success('อัปเดต Mini App แล้ว'); },
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error('กรุณากรอกชื่อและ URL');
      return;
    }
    if (app?.id) {
      updateMutation.mutate({ id: app.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Icon preview
  const isEmoji = form.icon && /^[^\x00-\x7F]/.test(form.icon);
  const IconComp = !isEmoji ? ICON_MAP[form.icon] : null;
  const colorCls = COLORS.find(c => c.value === form.color)?.cls || COLORS[0].cls;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{app ? 'แก้ไข Mini App' : 'เพิ่ม Mini App'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name + URL */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ชื่อ *</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="เช่น Peak Account" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL *</Label>
              <Input value={form.url} onChange={e => update('url', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Icon + Color + Preview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Icon (ชื่อ Lucide หรือ Emoji)</Label>
              <Input value={form.icon} onChange={e => update('icon', e.target.value)} placeholder="Calculator, 🏦" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สี</Label>
              <Select value={form.color} onValueChange={v => update('color', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLORS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${c.cls.split(' ')[0]}`} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Icon Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorCls}`}>
              {isEmoji ? (
                <span className="text-xl">{form.icon}</span>
              ) : IconComp ? (
                <IconComp className="w-5 h-5" />
              ) : (
                <Globe className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{form.name || 'ชื่อ App'}</p>
              <p className="text-[10px] text-muted-foreground">{form.url || 'https://...'}</p>
            </div>
          </div>

          {/* Category + Sort + Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">หมวดหมู่</Label>
              <Select value={form.category} onValueChange={v => update('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ลำดับ</Label>
              <Input type="number" min={0} value={form.sort_order ?? ''} onChange={e => update('sort_order', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานะ</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">คำอธิบาย</Label>
            <Input value={form.description || ''} onChange={e => update('description', e.target.value)} placeholder="คำอธิบายสั้นๆ (ไม่บังคับ)" />
          </div>

          {/* Open in new tab */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-xs font-medium">เปิดในแท็บใหม่</p>
              <p className="text-[10px] text-muted-foreground">เปิดลิงก์ในหน้าต่างใหม่</p>
            </div>
            <Switch checked={form.open_in_new_tab !== false} onCheckedChange={v => update('open_in_new_tab', v)} />
          </div>

          {/* Target Roles */}
          <div className="space-y-1.5">
            <Label className="text-xs">แสดงเฉพาะ Role (ว่าง = ทุก role)</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <div key={r.value} className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleArr('target_roles', r.value)}>
                  <Checkbox checked={(form.target_roles || []).includes(r.value)} />
                  <span className="text-xs">{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Target Departments */}
          <div className="space-y-1.5">
            <Label className="text-xs">แสดงเฉพาะแผนก (ว่าง = ทุกแผนก)</Label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map(d => (
                <div key={d.value} className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleArr('target_departments', d.value)}>
                  <Checkbox checked={(form.target_departments || []).includes(d.value)} />
                  <span className="text-xs">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={isSaving || !form.name || !form.url} className="w-full">
            {isSaving ? 'กำลังบันทึก...' : (app ? 'อัปเดต' : 'เพิ่ม Mini App')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}