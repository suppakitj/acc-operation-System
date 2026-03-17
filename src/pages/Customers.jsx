import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Building2, Users, UserCheck, Filter } from 'lucide-react';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerImportExport from '../components/customers/CustomerImportExport';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';

const DEPT_LABELS = { management: 'Management', accounting: 'บัญชี', consulting: 'ที่ปรึกษา', audit: 'Audit', billing: 'Billing', it: 'IT' };
const GROUP_LABELS = { individual: 'บุคคลธรรมดา', sme: 'SME', corporate: 'นิติบุคคล', government: 'ราชการ', other: 'อื่นๆ' };

function generateCustomerCode(customers) {
  const prefix = 'CUS';
  const existing = customers
    .filter(c => c.customer_code?.startsWith(prefix + '-'))
    .map(c => parseInt(c.customer_code.split('-')[1]) || 0);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `${prefix}-${String(max + 1).padStart(5, '0')}`;
}

export default function Customers() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [deptFilter, setDeptFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 500) });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const code = generateCustomerCode(customers);
      return base44.entities.Customer.create({ ...data, customer_code: code });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); setEditingCustomer(null); },
  });

  const handleSubmit = (data) => {
    if (editingCustomer) updateMutation.mutate({ id: editingCustomer.id, data });
    else createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (search) {
        const s = search.toLowerCase();
        if (!c.company_name?.toLowerCase().includes(s) && !c.customer_code?.toLowerCase().includes(s) && !c.tax_id?.includes(s) && !c.contact_person?.toLowerCase().includes(s)) return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (deptFilter !== 'all' && !(c.departments || []).includes(deptFilter)) return false;
      if (groupFilter !== 'all' && c.customer_group !== groupFilter) return false;
      return true;
    });
  }, [customers, search, statusFilter, deptFilter, groupFilter]);

  const activeCount = customers.filter(c => c.status === 'active').length;
  const inactiveCount = customers.filter(c => c.status === 'inactive').length;

  const canEdit = ac.canManageCustomers;
  const isStaffOnly = ac.role === 'staff';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">Customer Master</h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{customers.length} ราย</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">เก็บข้อมูลลูกค้าเพื่อใช้กับ Task, Billing, Schedule</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0 self-start sm:self-auto flex-wrap">
            <CustomerImportExport customers={customers} generateCustomerCode={generateCustomerCode} />
            <Button size="sm" className="gap-1.5 text-xs"
              onClick={() => { setEditingCustomer(null); setShowForm(true); }}>
              <Plus className="w-3.5 h-3.5" /> เพิ่มลูกค้า
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
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
          <Input placeholder="ค้นหาชื่อ, รหัส, TAX ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="แผนก" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแผนก</SelectItem>
            {Object.entries(DEPT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="กลุ่ม" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกกลุ่ม</SelectItem>
            {Object.entries(GROUP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto">{filtered.length} of {customers.length}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t('no_data')}</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">รหัส</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">ชื่อลูกค้า</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">กลุ่ม</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">แผนก</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">หัวหน้าดูแล</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden xl:table-cell">เจ้าหน้าที่หลัก</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">บริการ</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}
                  className={`border-b last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}
                  onClick={() => { setEditingCustomer(c); setShowForm(true); }}>
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{c.customer_code || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate max-w-[180px]">{c.company_name}</p>
                        {c.tax_id && <p className="text-[10px] text-muted-foreground">{c.tax_id}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{GROUP_LABELS[c.customer_group] || '-'}</span>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(c.departments || []).slice(0, 2).map(d => (
                        <Badge key={d} variant="secondary" className="text-[9px] px-1 py-0">{DEPT_LABELS[d] || d}</Badge>
                      ))}
                      {(c.departments || []).length > 2 && <span className="text-[9px] text-muted-foreground">+{c.departments.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[120px]">{c.supervisor_name || '-'}</td>
                  <td className="px-3 py-2 hidden xl:table-cell text-xs text-muted-foreground truncate max-w-[120px]">{c.primary_officer_name || '-'}</td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(c.services || []).slice(0, 2).map(s => (
                        <Badge key={s} variant="secondary" className="text-[9px] px-1 py-0">{s === 'accounting' ? 'บัญชี' : s === 'payroll' ? 'เงินเดือน' : s === 'tax_consulting' ? 'ภาษี' : s === 'audit' ? 'ตรวจสอบ' : 'Peak'}</Badge>
                      ))}
                      {(c.services || []).length > 2 && <span className="text-[9px] text-muted-foreground">+{c.services.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className={c.status === 'active' ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? (canEdit ? 'แก้ไขข้อมูลลูกค้า' : 'ดูข้อมูลลูกค้า') : 'เพิ่มลูกค้าใหม่'}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            readOnly={isStaffOnly}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}