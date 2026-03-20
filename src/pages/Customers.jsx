import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerImportExport from '../components/customers/CustomerImportExport';
import CustomerSummaryCards from '../components/customers/CustomerSummaryCards';
import CustomerTable from '../components/customers/CustomerTable';
import TablePagination, { paginateData } from '../components/shared/TablePagination';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';

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
  const [deptFilter2, setDeptFilter2] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 500), staleTime: 60_000 });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 1000) });

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

  // Stats
  const stats = useMemo(() => {
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = customers.filter(c => c.status === 'inactive').length;
    const noOwner = customers.filter(c => !c.primary_officer_name).length;
    const monthlyRev = customers.reduce((s, c) => s + (c.monthly_fee || 0), 0);
    return { total: customers.length, active, inactive, noOwner, monthlyRev };
  }, [customers]);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (search) {
        const s = search.toLowerCase();
        if (!c.company_name?.toLowerCase().includes(s) && !c.customer_code?.toLowerCase().includes(s) && !c.tax_id?.includes(s)) return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (deptFilter2 !== 'all' && !(c.departments || []).includes(deptFilter2)) return false;
      return true;
    });
  }, [customers, search, statusFilter, deptFilter2]);

  useEffect(() => { setPage(1); }, [search, statusFilter, deptFilter2]);

  // Sort filtered data by customer_code before pagination
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => (a.customer_code || '').localeCompare(b.customer_code || ''));
  }, [filtered]);

  const paged = paginateData(sorted, page, pageSize);

  const canEdit = ac.canEditCustomer;
  const canAdd = ac.canAddCustomer;

  const onRowClick = (c) => { setEditingCustomer(c); setShowForm(true); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Customer Master</h1>
          <p className="text-xs text-muted-foreground">เก็บข้อมูลลูกค้าเพื่อใช้กับ Task, Billing, Schedule</p>
        </div>
        {(canEdit || canAdd) && (
          <div className="flex gap-2 shrink-0 self-start sm:self-auto flex-wrap">
            {canAdd && <CustomerImportExport customers={customers} generateCustomerCode={generateCustomerCode} />}
            {canAdd && (
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditingCustomer(null); setShowForm(true); }}>
                <Plus className="w-3.5 h-3.5" /> เพิ่มลูกค้า
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <CustomerSummaryCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, code, tax ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter2} onValueChange={setDeptFilter2}>
          <SelectTrigger className="w-[130px] h-9 text-xs rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแผนก</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="accounting">บัญชี</SelectItem>
            <SelectItem value="consulting">ที่ปรึกษา</SelectItem>
            <SelectItem value="audit">Audit</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="it">IT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t('no_data')}</div>
      ) : (
        <>
          <CustomerTable customers={paged} tasks={tasks} onRowClick={onRowClick} />
          <TablePagination totalItems={sorted.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? (canEdit ? 'แก้ไขข้อมูลลูกค้า' : 'ดูข้อมูลลูกค้า') : (canAdd ? 'เพิ่มลูกค้าใหม่' : 'ดูข้อมูลลูกค้า')}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            readOnly={!canEdit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}