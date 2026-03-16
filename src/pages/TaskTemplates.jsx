import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, ClipboardList, Pencil } from 'lucide-react';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';
import TemplateFormDialog from '../components/templates/TemplateFormDialog';

const SERVICE_LABELS = { accounting: 'ทำบัญชี', payroll: 'เงินเดือน', tax_consulting: 'ที่ปรึกษาภาษี', audit: 'ตรวจสอบ', peak_licensing: 'Peak Account' };
const RECURRING_LABELS = { monthly: 'รายเดือน', quarterly: 'รายไตรมาส', yearly: 'รายปี' };
const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function generateTemplateCode(templates) {
  const prefix = 'TPL';
  const existing = templates.filter(t => t.template_code?.startsWith(prefix + '-')).map(t => parseInt(t.template_code.split('-')[1]) || 0);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export default function TaskTemplates() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const canEdit = ac.canManageTemplates || ac.canManageTemplatesDept;
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [recurringFilter, setRecurringFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: allTemplates = [], isLoading } = useQuery({ queryKey: ['taskTemplates'], queryFn: () => base44.entities.TaskTemplate.list('-created_date', 500) });
  const templates = ac.canManageTemplates ? allTemplates : ac.filterByDepartment(allTemplates);

  const createMutation = useMutation({
    mutationFn: (data) => {
      const code = generateTemplateCode(allTemplates);
      return base44.entities.TaskTemplate.create({ ...data, template_code: code });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taskTemplates'] }); setShowForm(false); setEditingTemplate(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TaskTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taskTemplates'] }); setShowForm(false); setEditingTemplate(null); },
  });

  const handleSubmit = (data) => {
    if (editingTemplate) updateMutation.mutate({ id: editingTemplate.id, data });
    else createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.template_code?.toLowerCase().includes(search.toLowerCase())) return false;
      if (serviceFilter !== 'all' && t.service_type !== serviceFilter) return false;
      if (recurringFilter !== 'all' && t.recurring_type !== recurringFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });
  }, [templates, search, serviceFilter, recurringFilter, statusFilter]);

  const activeCount = templates.filter(t => t.status !== 'inactive').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">Task Templates</h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{templates.length} templates</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">สร้าง task รายเดือนอัตโนมัติตามประเภทบริการของลูกค้า</p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5 text-xs shrink-0 self-start sm:self-auto"
            onClick={() => { setEditingTemplate(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> สร้าง Template
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">Active: {activeCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-xs font-medium text-gray-600">Inactive: {templates.length - activeCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อ, รหัส..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs"><SelectValue placeholder="บริการ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกบริการ</SelectItem>
            {Object.entries(SERVICE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={recurringFilter} onValueChange={setRecurringFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="ความถี่" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกความถี่</SelectItem>
            {Object.entries(RECURRING_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto">{filtered.length} of {templates.length}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">ยังไม่มี Template</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">รหัส</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">ชื่อ Task</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">บริการ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">ความถี่</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">เดือนที่ใช้</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Due Date</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden xl:table-cell">ผู้รับผิดชอบ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
                {canEdit && <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tmpl, i) => (
                <tr key={tmpl.id} className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{tmpl.template_code || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate max-w-[200px]">{tmpl.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <Badge variant="secondary" className="text-[9px] px-1.5">{SERVICE_LABELS[tmpl.service_type] || tmpl.service_type}</Badge>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <Badge variant="outline" className="text-[9px] px-1.5">{RECURRING_LABELS[tmpl.recurring_type] || tmpl.recurring_type}</Badge>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    <span className="text-[10px] text-muted-foreground">
                      {tmpl.applicable_months?.length > 0
                        ? tmpl.applicable_months.map(m => MONTH_LABELS[m - 1]).join(', ')
                        : 'ทุกเดือน'}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground">วันที่ {tmpl.due_date_rule || 15}</td>
                  <td className="px-3 py-2 hidden xl:table-cell text-xs text-muted-foreground truncate max-w-[120px]">
                    {tmpl.default_owner_type === 'from_customer' ? 'จาก Customer' : (tmpl.default_owner_name || tmpl.default_owner || '-')}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className={tmpl.status === 'active' || !tmpl.status ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'}>
                      {tmpl.status === 'inactive' ? 'Inactive' : 'Active'}
                    </Badge>
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => { setEditingTemplate(tmpl); setShowForm(true); }}>
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TemplateFormDialog
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingTemplate(null); }}
        template={editingTemplate}
        onSubmit={handleSubmit}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}